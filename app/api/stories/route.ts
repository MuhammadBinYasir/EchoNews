import { connection, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { Article, TOPICS, User } from "@/model";
import { extractInterestsMap } from "@/lib/format";
import { rankArticlesByPreference } from "@/lib/recommendation";

const STORY_WINDOW_DAYS = 7;
const STORY_LIMIT = 10;

export async function GET() {
  await connection();
  try {
    const cookieStore = await cookies();
    const userId =
      cookieStore.get("echo_user_id")?.value || cookieStore.get("userId")?.value;

    if (!userId || !mongoose.isValidObjectId(userId)) {
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
    const articleGroups = await Promise.all(preferredTopics.map((topic) =>
      Article.find({ topic, publishedAt: { $gte: cutoff } })
        .sort({ publishedAt: -1 })
        .limit(15)
        .select("title source topic summary snippet image url publishedAt")
        .lean()
    ));
    const storiesByTopic = new Map(preferredTopics.map((topic, index) => [
      topic,
      rankArticlesByPreference(articleGroups[index], interests),
    ]));
    const stories: (typeof articleGroups)[number][number][] = [];
    const sourceCounts = new Map<string, number>();

    // Round-robin in preference order: the highest-interest category appears
    // first, while every preferred category gets a chance before repeats.
    while (stories.length < STORY_LIMIT) {
      let addedStory = false;
      for (const topic of preferredTopics) {
        if (stories.length >= STORY_LIMIT) break;
        const topicStories = storiesByTopic.get(topic);
        if (!topicStories?.length) continue;
        const publisherIndex = topicStories.findIndex((article) =>
          (sourceCounts.get(article.source.toLowerCase()) || 0) < 2
        );
        const [article] = topicStories.splice(publisherIndex < 0 ? 0 : publisherIndex, 1);
        stories.push(article);
        const source = article.source.toLowerCase();
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        addedStory = true;
      }
      if (!addedStory) break;
    }

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
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load personalized stories:", error);
    return NextResponse.json({ error: "Could not load recent stories." }, { status: 500 });
  }
}
