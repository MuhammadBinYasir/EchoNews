import { connectDB } from "@/lib/mongo";
import { Article, TOPICS, Topic } from "@/model";
import { cleanHighQualityImageUrl, upgradeDatabaseImages } from "@/lib/clean-images";
import { generateWithOllama, checkOllamaAvailable } from "@/lib/ollama";

// Topic relevance keywords for scoring
const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  ai: [
    "ai", "artificial intelligence", "chatgpt", "openai", "deepmind", "llm", "neural",
    "anthropic", "machine learning", "agent", "robot", "copilot", "generative", "model",
    "meta", "gemini", "claude", "algorithm", "automation", "intelligence",
  ],
  tech: [
    "apple", "google", "meta", "nvidia", "chip", "device", "smartphone", "iphone",
    "hardware", "software", "app", "console", "laptop", "processor", "cyber", "screen",
    "microsoft", "gadget", "battery", "display", "cloud", "tech", "security",
  ],
  science: [
    "space", "astronomy", "nasa", "planet", "wildfire", "earth", "climate", "species",
    "biology", "physics", "telescope", "nature", "fossil", "discovery", "energy",
    "ocean", "laboratory", "cosmic", "satellite", "quantum", "moon", "star",
  ],
  world: [
    "president", "summit", "election", "war", "peace", "government", "diplomat", "treaty",
    "nation", "global", "crisis", "minister", "border", "un", "ukraine", "middle east",
    "europe", "asia", "foreign", "parliament", "international",
  ],
  business: [
    "market", "economy", "stock", "tax", "trade", "inflation", "banking", "investor",
    "startup", "ceo", "company", "industry", "revenue", "dollar", "wall street", "fund",
    "interest rate", "commercial", "enterprise",
  ],
  sports: [
    "championship", "cup", "game", "team", "player", "match", "league", "coach",
    "tournament", "score", "win", "title", "football", "rugby", "cricket", "boxing",
    "tennis", "olympics", "race",
  ],
  health: [
    "health", "medicine", "doctor", "hospital", "disease", "treatment", "virus", "study",
    "mental", "wellness", "drug", "care", "cancer", "vaccine", "diet", "nutrition",
    "brain", "therapy", "clinical",
  ],
  culture: [
    "film", "art", "music", "author", "book", "museum", "series", "actor", "theater",
    "novel", "director", "song", "festival", "dance", "artist", "exhibition", "celebrity",
    "heritage", "tv",
  ],
};

function scoreArticle(title: string, snippet: string, topic: Topic): number {
  const text = `${title} ${snippet}`.toLowerCase();
  const keywords = TOPIC_KEYWORDS[topic] || [];
  let score = 0;

  for (const kw of keywords) {
    if (title.toLowerCase().includes(kw)) {
      score += 3; // Title match has high weight
    } else if (text.includes(kw)) {
      score += 1; // Snippet match
    }
  }

  // Bonus for rich snippet length (avoiding empty or 1-sentence articles)
  if (snippet.length > 80) score += 2;
  if (snippet.length > 150) score += 1;

  return score;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface CuratedArticle {
  id: string;
  title: string;
  source: string;
  topic: Topic;
  snippet: string;
  image: string;
  publishedAt: Date;
  isFromInterests: boolean;
}

export async function curateOnboardingArticles(
  rawTopics: string[]
): Promise<CuratedArticle[]> {
  const selectedTopics = rawTopics.filter((t): t is Topic =>
    TOPICS.includes(t as Topic)
  );

  const activeSelected: Topic[] =
    selectedTopics.length > 0 ? selectedTopics : ["tech", "ai", "science"];

  const otherTopics: Topic[] = TOPICS.filter(
    (t) => !activeSelected.includes(t)
  );

  await connectDB();

  // Run database image upgrade in the background to improve resolution across articles
  upgradeDatabaseImages().catch(() => {});

  // 1. Fetch high-quality candidates WITH valid image and snippet for EACH selected topic
  const selectedPoolByTopic: Record<Topic, Array<{
    id: string;
    title: string;
    source: string;
    topic: Topic;
    snippet: string;
    image: string;
    publishedAt: Date;
    score: number;
  }>> = {} as Record<Topic, []>;

  for (const t of activeSelected) {
    const docs = await Article.find({
      topic: t,
      image: { $exists: true, $ne: null, $nin: ["", null] },
      snippet: { $exists: true, $ne: "" },
    })
      .sort({ publishedAt: -1 })
      .limit(15)
      .lean();

    selectedPoolByTopic[t] = docs
      .map((d) => {
        const cleanedImg = cleanHighQualityImageUrl(d.image);
        return {
          id: d._id.toString(),
          title: d.title,
          source: d.source,
          topic: d.topic as Topic,
          snippet: d.snippet,
          image: cleanedImg || d.image || "",
          publishedAt: d.publishedAt,
          score: scoreArticle(d.title, d.snippet, t),
        };
      })
      .filter((a): a is typeof a & { image: string } => Boolean(a.image))
      .sort((a, b) => b.score - a.score);
  }

  // 2. Fetch candidates for discovery / other topics
  const otherDocs = await Article.find({
    topic: { $in: otherTopics },
    image: { $exists: true, $ne: null, $nin: ["", null] },
    snippet: { $exists: true, $ne: "" },
  })
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();

  const otherPool = otherDocs
    .map((d) => {
      const cleanedImg = cleanHighQualityImageUrl(d.image);
      return {
        id: d._id.toString(),
        title: d.title,
        source: d.source,
        topic: d.topic as Topic,
        snippet: d.snippet,
        image: cleanedImg || d.image || "",
        publishedAt: d.publishedAt,
        score: scoreArticle(d.title, d.snippet, d.topic as Topic),
      };
    })
    .filter((a): a is typeof a & { image: string } => Boolean(a.image))
    .sort((a, b) => b.score - a.score);

  // 3. Select exactly 6 articles from selected topics with balanced topic coverage
  const chosenSelected: typeof otherPool = [];
  const perTopicQuota = Math.max(1, Math.floor(6 / activeSelected.length));

  for (const t of activeSelected) {
    const topicArticles = selectedPoolByTopic[t] || [];
    const takeCount = Math.min(perTopicQuota, topicArticles.length);
    chosenSelected.push(...topicArticles.slice(0, takeCount));
  }

  // If quota left room under 6, pick highest scoring remaining from selected topics
  if (chosenSelected.length < 6) {
    const remainingSelected = activeSelected
      .flatMap((t) => selectedPoolByTopic[t] || [])
      .filter((a) => !chosenSelected.some((c) => c.id === a.id))
      .sort((a, b) => b.score - a.score);

    for (const a of remainingSelected) {
      if (chosenSelected.length >= 6) break;
      chosenSelected.push(a);
    }
  }

  // 4. Select exactly 2 articles from 2 distinct non-selected topics ("Break the Echo")
  const chosenOther: typeof otherPool = [];
  const seenOtherTopics = new Set<string>();

  for (const a of otherPool) {
    if (chosenOther.length >= 2) break;
    if (!seenOtherTopics.has(a.topic)) {
      chosenOther.push(a);
      seenOtherTopics.add(a.topic);
    }
  }

  if (chosenOther.length < 2) {
    for (const a of otherPool) {
      if (chosenOther.length >= 2) break;
      if (!chosenOther.some((c) => c.id === a.id)) {
        chosenOther.push(a);
      }
    }
  }

  // 5. Try local Ollama optimization if available and model is loaded
  const canUseOllama = await checkOllamaAvailable().catch(() => false);
  if (canUseOllama && chosenSelected.length >= 6) {
    try {
      const candidateSummary = chosenSelected
        .map((c, i) => `${i + 1}. [${c.topic.toUpperCase()}] ${c.title}`)
        .join("\n");
      const prompt = `Reader interests: ${activeSelected.join(", ")}.
Rank the top 6 most relevant headlines by returning their numbers in order of editorial importance, e.g. [1, 2, 3, 4, 5, 6]:
${candidateSummary}`;

      const llmResp = await generateWithOllama(prompt, { timeoutMs: 2500 });
      if (llmResp) {
        const match = llmResp.match(/\[[\d,\s]+\]/);
        if (match) {
          const indices: number[] = JSON.parse(match[0]);
          const reordered = indices
            .map((idx) => chosenSelected[idx - 1])
            .filter(Boolean);
          if (reordered.length === chosenSelected.length) {
            chosenSelected.splice(0, chosenSelected.length, ...reordered);
          }
        }
      }
    } catch {
      // High-precision algorithmic ranking is already applied
    }
  }

  // 6. Format and randomize final 8 articles
  const formatted: CuratedArticle[] = [
    ...chosenSelected.slice(0, 6).map((a) => ({
      id: a.id,
      title: a.title,
      source: a.source,
      topic: a.topic,
      snippet: a.snippet,
      image: a.image,
      publishedAt: a.publishedAt,
      isFromInterests: true,
    })),
    ...chosenOther.slice(0, 2).map((a) => ({
      id: a.id,
      title: a.title,
      source: a.source,
      topic: a.topic,
      snippet: a.snippet,
      image: a.image,
      publishedAt: a.publishedAt,
      isFromInterests: false,
    })),
  ];

  return shuffle(formatted);
}
