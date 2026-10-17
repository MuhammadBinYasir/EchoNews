import { connectDB } from "@/lib/mongo";
import { Article, TOPICS, Topic } from "@/model";
import { cleanHighQualityImageUrl } from "@/lib/clean-images";
import { generateWithGroq } from "@/lib/groq";

export interface OnboardingFeedbackState {
  topics: string[];
  seenIds: string[];
  likedIds: string[];
  dislikedIds: string[];
}

export interface SingleCuratedArticle {
  id: string;
  title: string;
  source: string;
  topic: Topic;
  snippet: string;
  image: string;
  publishedAt: Date;
  isFromInterests: boolean;
}

const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  ai: [
    "ai", "artificial intelligence", "chatgpt", "openai", "deepmind", "llm", "neural",
    "anthropic", "machine learning", "agent", "robot", "copilot", "generative", "model",
    "gemini", "claude", "algorithm",
  ],
  tech: [
    "apple", "google", "meta", "nvidia", "chip", "device", "smartphone", "iphone",
    "hardware", "software", "app", "console", "laptop", "processor", "cyber", "screen",
    "microsoft", "gadget", "cloud",
  ],
  science: [
    "space", "astronomy", "nasa", "planet", "wildfire", "earth", "climate", "species",
    "biology", "physics", "telescope", "nature", "discovery", "satellite", "quantum",
  ],
  world: [
    "president", "summit", "election", "war", "peace", "government", "diplomat", "treaty",
    "nation", "global", "crisis", "minister", "border", "un", "international",
  ],
  business: [
    "market", "economy", "stock", "tax", "trade", "inflation", "banking", "investor",
    "startup", "ceo", "company", "industry", "revenue", "dollar", "wall street",
  ],
  sports: [
    "championship", "cup", "game", "team", "player", "match", "league", "coach",
    "tournament", "score", "win", "title", "football", "rugby", "cricket", "boxing",
  ],
  health: [
    "health", "medicine", "doctor", "hospital", "disease", "treatment", "virus", "study",
    "mental", "wellness", "drug", "cancer", "vaccine", "nutrition", "brain",
  ],
  culture: [
    "film", "art", "music", "author", "book", "museum", "series", "actor", "theater",
    "novel", "director", "song", "festival", "dance", "artist", "exhibition",
  ],
};

export async function getNextOnboardingArticle(
  state: OnboardingFeedbackState
): Promise<SingleCuratedArticle | null> {
  await connectDB();

  const validSelected = state.topics.filter((t): t is Topic =>
    TOPICS.includes(t as Topic)
  );
  const activeSelected: Topic[] =
    validSelected.length > 0 ? validSelected : ["tech", "ai", "science"];

  const otherTopics: Topic[] = TOPICS.filter((t) => !activeSelected.includes(t));

  // Find info about what user liked and disliked so far
  let likedTopics: Topic[] = [];
  let likedKeywords: string[] = [];
  if (state.likedIds.length > 0) {
    const likedDocs = await Article.find({ _id: { $in: state.likedIds } })
      .select("topic title")
      .lean();
    likedTopics = likedDocs.map((d) => d.topic as Topic);
    likedKeywords = likedDocs
      .flatMap((d) => d.title.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 4);
  }

  let dislikedTopics: Topic[] = [];
  if (state.dislikedIds.length > 0) {
    const dislikedDocs = await Article.find({ _id: { $in: state.dislikedIds } })
      .select("topic")
      .lean();
    dislikedTopics = dislikedDocs.map((d) => d.topic as Topic);
  }

  // Determine whether this step should be an exploratory discovery article (e.g. index 6 or 7)
  const isExplorationStep = state.seenIds.length >= 6;
  const targetTopics = isExplorationStep ? otherTopics : activeSelected;

  // Query candidate pool excluding seen articles
  const candidates = await Article.find({
    _id: { $nin: state.seenIds },
    topic: { $in: targetTopics },
  })
    .sort({ publishedAt: -1 })
    .limit(40)
    .lean();

  if (candidates.length === 0) {
    // If the preferred pool is empty, use another available story without
    // requiring an image or excerpt; both are optional in the reader.
    const fallback = await Article.findOne({
      _id: { $nin: state.seenIds },
    }).sort({ publishedAt: -1 }).lean();

    if (!fallback) return null;

    const cleanedImg = cleanHighQualityImageUrl(fallback.image) || fallback.image || "";
    return {
      id: fallback._id.toString(),
      title: fallback.title,
      source: fallback.source,
      topic: fallback.topic as Topic,
      snippet: fallback.snippet,
      image: cleanedImg,
      publishedAt: fallback.publishedAt,
      isFromInterests: activeSelected.includes(fallback.topic as Topic),
    };
  }

  // Score candidates based on liked vs disliked history
  const scored = candidates.map((cand) => {
    let score = 10;
    const candTopic = cand.topic as Topic;
    const text = `${cand.title} ${cand.snippet}`.toLowerCase();

    // 1. If user liked articles of this topic: BOOST it!
    const likeCount = likedTopics.filter((t) => t === candTopic).length;
    score += likeCount * 5;

    // 2. If user liked keywords (e.g. "openai", "apple"): BOOST matching articles!
    for (const kw of likedKeywords) {
      if (text.includes(kw)) score += 4;
    }

    // 3. Topic keyword match bonus
    const topicKw = TOPIC_KEYWORDS[candTopic] || [];
    for (const kw of topicKw) {
      if (cand.title.toLowerCase().includes(kw)) score += 3;
    }

    // 4. If user DISLIKED this topic: DEMOTE or IGNORE it!
    const dislikeCount = dislikedTopics.filter((t) => t === candTopic).length;
    score -= dislikeCount * 8;

    return { cand, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topCandidates = scored.slice(0, 6).map((s) => s.cand);

  // Use Groq to select the single best matching article
  let selected = topCandidates[0];
  try {
    const summary = topCandidates
      .map((c, i) => `${i + 1}. [${c.topic.toUpperCase()}] ${c.title}`)
      .join("\n");

    const prompt = `Reader interests: ${activeSelected.join(", ")}.
Recent likes: ${likedTopics.join(", ") || "none yet"}.
Recent dislikes: ${dislikedTopics.join(", ") || "none"}.

Candidate headlines:
${summary}

Pick the single best candidate number (e.g. 1, 2, 3...) that matches the user's liked tastes and avoids what they dislike. Respond ONLY with the single number.`;

    const groqResponse = await generateWithGroq(prompt, { timeoutMs: 1500 });
    if (groqResponse) {
      const match = groqResponse.match(/\b([1-6])\b/);
      if (match) {
        const pickedIdx = parseInt(match[1], 10) - 1;
        if (topCandidates[pickedIdx]) {
          selected = topCandidates[pickedIdx];
        }
      }
    }
  } catch {
    // Algorithmic scored choice is used
  }

  const cleanedImg = cleanHighQualityImageUrl(selected.image) || selected.image || "";

  return {
    id: selected._id.toString(),
    title: selected.title,
    source: selected.source,
    topic: selected.topic as Topic,
    snippet: selected.snippet,
    image: cleanedImg,
    publishedAt: selected.publishedAt,
    isFromInterests: activeSelected.includes(selected.topic as Topic),
  };
}
