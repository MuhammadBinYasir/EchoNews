import { connectDB } from "@/lib/mongo";
import { User, Article, Edition, Topic, TOPICS } from "@/model";
import { generateWithGroq } from "@/lib/groq";
import { formatTimeAgo, formatTopicName, extractInterestsMap } from "@/lib/format";

export { formatTimeAgo, formatTopicName, extractInterestsMap };

export async function getOrCreateTodayEdition(userId: string, forceRegenerate = false) {
  await connectDB();

  const user = await User.findById(userId).lean();
  if (!user) return null;

  const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  // Check if today's edition exists
  if (!forceRegenerate) {
    const existing = await Edition.findOne({ userId: user._id, date: todayStr })
      .populate("layout.lead")
      .populate("layout.secondary")
      .populate("layout.briefs")
      .populate("layout.echo")
      .lean();

    if (existing) {
      return { user, edition: existing };
    }
  }

  // Calculate sorted topics by weight descending
  const interestsMap = extractInterestsMap(user.interests);
  const topicWeights: Array<{ topic: Topic; weight: number }> = TOPICS.map((t) => ({
    topic: t,
    weight: typeof interestsMap[t] === "number" ? interestsMap[t] : 0.2,
  })).sort((a, b) => b.weight - a.weight);

  const topTopics = topicWeights.slice(0, 5).map((tw) => tw.topic);
  const bottomTopics = topicWeights.slice(-3).map((tw) => tw.topic);

  // Fetch candidate articles with images and snippets
  const mainCandidates = await Article.find({
    topic: { $in: topTopics },
    image: { $exists: true, $ne: null, $nin: ["", null] },
    snippet: { $exists: true, $ne: "" },
  })
    .sort({ publishedAt: -1 })
    .limit(40)
    .lean();

  const echoCandidates = await Article.find({
    topic: { $in: bottomTopics },
    image: { $exists: true, $ne: null, $nin: ["", null] },
    snippet: { $exists: true, $ne: "" },
  })
    .sort({ publishedAt: -1 })
    .limit(15)
    .lean();

  if (mainCandidates.length === 0) return null;

  // 1. Pick Lead article (highest quality top-topic candidate)
  const leadArticle = mainCandidates[0];
  const usedIds = new Set<string>([leadArticle._id.toString()]);

  // 2. Pick 4 Secondary articles ("More for you") with diverse topics
  const secondary: typeof mainCandidates = [];
  for (const a of mainCandidates) {
    if (secondary.length >= 4) break;
    const id = a._id.toString();
    if (!usedIds.has(id)) {
      secondary.push(a);
      usedIds.add(id);
    }
  }

  // 3. Pick 6 Briefs articles ("In brief")
  const briefs: typeof mainCandidates = [];
  for (const a of mainCandidates) {
    if (briefs.length >= 6) break;
    const id = a._id.toString();
    if (!usedIds.has(id)) {
      briefs.push(a);
      usedIds.add(id);
    }
  }

  // 4. Pick 2 Echo articles ("Break the Echo" from bottom topics)
  const echo: typeof echoCandidates = [];
  for (const a of echoCandidates) {
    if (echo.length >= 2) break;
    const id = a._id.toString();
    if (!usedIds.has(id)) {
      echo.push(a);
      usedIds.add(id);
    }
  }

  // 5. Generate "Today in 3 Things" using Groq or fallback to top article insights
  let threeThings = [
    `${leadArticle.title.slice(0, 45)}: ${leadArticle.snippet ? leadArticle.snippet.slice(0, 75) + '…' : 'Key insights from today\'s headlines.'}`,
    secondary[0] ? `${secondary[0].title.slice(0, 45)}: ${secondary[0].snippet ? secondary[0].snippet.slice(0, 75) + '…' : 'Developments across science and technology.'}` : "A little movement adds up. Daily trends shaping the landscape.",
    echo[0] ? `${echo[0].title.slice(0, 45)}: Outside your usual focus, an unexpected perspective.` : "Look beyond your usual. Fresh stories from wider horizons.",
  ];

  try {
    const prompt = `Based on these 3 headlines from today's paper:
1. ${leadArticle.title}
2. ${secondary[0]?.title || 'World affairs'}
3. ${echo[0]?.title || 'Science discovery'}

Write 3 extremely concise, sophisticated 1-sentence takeaways (max 18 words each) for the masthead section "Today in 3 Things".
Return JSON array of 3 strings: ["Takeaway 1", "Takeaway 2", "Takeaway 3"]`;

    const groqResp = await generateWithGroq(prompt, { timeoutMs: 2500 });
    if (groqResp) {
      const match = groqResp.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          threeThings = parsed.slice(0, 3).map((s: string) => s.trim());
        }
      }
    }
  } catch {
    // Graceful fallback
  }

  // Count past editions to get real edition number
  const editionCount = await Edition.countDocuments({ userId: user._id });
  const editionNumber = editionCount + 1;

  // Upsert edition in MongoDB
  const newEdition = await Edition.findOneAndUpdate(
    { userId: user._id, date: todayStr },
    {
      userId: user._id,
      date: todayStr,
      number: editionNumber,
      layout: {
        lead: leadArticle._id,
        secondary: secondary.map((s) => s._id),
        briefs: briefs.map((b) => b._id),
        echo: echo.map((e) => e._id),
      },
      threeThings,
      createdAt: new Date(),
    },
    { upsert: true, new: true }
  )
    .populate("layout.lead")
    .populate("layout.secondary")
    .populate("layout.briefs")
    .populate("layout.echo")
    .lean();

  return { user, edition: newEdition };
}

export async function getEditionByDate(userId: string, date: string) {
  await connectDB();
  const edition = await Edition.findOne({ userId, date })
    .populate('layout.lead')
    .populate('layout.secondary')
    .populate('layout.briefs')
    .populate('layout.echo')
    .lean();
  if (!edition) return null;
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return { user, edition };
}

export async function listEditions(userId: string) {
  await connectDB();
  const editions = await Edition.find({ userId })
    .sort({ date: -1 })
    .populate('layout.lead')
    .lean();
  return editions.map((ed) => {
    const lead = ed.layout?.lead as unknown as { title?: string; image?: string } | null;
    return {
      date: ed.date,
      number: ed.number,
      leadTitle: lead?.title || "",
      leadImage: lead?.image || "",
    };
  });
}
