import { connection, NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { Article, Event, TOPICS, User } from "@/model";
import { extractInterestsMap } from "@/lib/format";
import { rankArticlesByPreference } from "@/lib/recommendation";
import { getReaderIdCandidates } from "@/lib/reader-cookies";

const STORY_WINDOW_DAYS = 7;

export async function GET(request: NextRequest) {
  await connection();
  try {
    const cookieStore = await cookies();
    const userIds = getReaderIdCandidates(
      cookieStore.get("echo_user_id")?.value,
      cookieStore.get("userId")?.value,
    );
    const requestedReaderId = request.nextUrl.searchParams.get("readerId");
    const userId = requestedReaderId || userIds[0];

    if (!userId || !mongoose.isValidObjectId(userId) || !userIds.includes(userId)) {
      return NextResponse.json({ error: "Reader profile not found." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId).select("interests").lean();
    if (!user) return NextResponse.json({ error: "Reader profile not found." }, { status: 401 });

    const interests = extractInterestsMap(user.interests);
    const preferredTopics = TOPICS
      .map((topic) => ({ topic, weight: interests[topic] ?? 0.2 }))
      .filter(({ weight }) => weight > 0.25)
      .sort((a, b) => b.weight - a.weight)
      .map(({ topic }) => topic);

    if (!preferredTopics.length) {
      return NextResponse.json({ stories: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const cutoff = new Date(Date.now() - STORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recentArticles = await Article.find({
      topic: { $in: preferredTopics },
      publishedAt: { $gte: cutoff },
    })
      .sort({ publishedAt: -1 })
      .select("title source topic summary snippet image url publishedAt")
      .lean();
    const articleGroups = new Map<string, typeof recentArticles>();
    for (const article of recentArticles) {
      const group = articleGroups.get(article.topic);
      if (group) {
        if (group.length < 15) group.push(article);
      } else {
        articleGroups.set(article.topic, [article]);
      }
    }
    const storiesByTopic = new Map(preferredTopics.map((topic) => [
      topic,
      rankArticlesByPreference(articleGroups.get(topic) || [], interests),
    ]));
    // Show only the top ranked article from each preferred topic. Since
    // preferredTopics is sorted by interest, categories also appear in order
    // from the reader's strongest preference to the weakest.
    const stories = preferredTopics.flatMap((topic) => {
      const topStory = storiesByTopic.get(topic)?.[0];
      return topStory ? [topStory] : [];
    });

    const storyIds = stories.map((article) => article._id);
    const savedFeedback = await Event.find({
      userId,
      articleId: { $in: storyIds },
      editionId: { $exists: false },
      origin: { $ne: "onboarding" },
      type: { $in: ["like", "skip"] },
    })
      .select("articleId type")
      .lean();
    const feedbackByArticle = new Map(savedFeedback.map((event) => [String(event.articleId), event.type]));

    return NextResponse.json({
      stories: stories.map((article) => ({
        id: article._id.toString(),
        title: article.title,
        source: article.source,
        topic: article.topic,
        summary: article.summary || article.snippet || "",
        image: article.image || "",
        url: article.url,
        publishedAt: article.publishedAt,
        feedback: feedbackByArticle.get(article._id.toString()) || null,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load personalized stories:", error);
    return NextResponse.json({ error: "Could not load recent stories." }, { status: 500 });
  }
}
