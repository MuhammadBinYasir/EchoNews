import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { Event, User, Article, TOPICS, Topic } from "@/model";

const WEIGHT_DELTAS = {
  click: 0.1,
  like: 0.2,
  skip: -0.1,
  read: 0.05,
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, articleId, editionId, type } = body;

    if (!userId || !articleId || !type) {
      return NextResponse.json({ error: "Missing required event fields" }, { status: 400 });
    }

    await connectDB();

    const article = await Article.findById(articleId).select("topic").lean();
    if (!article || !article.topic) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const topic = article.topic as Topic;

    // 1. Record event in MongoDB
    await Event.create({
      userId,
      articleId,
      editionId,
      topic,
      type,
      ts: new Date(),
    });

    // 2. Update user interests weight with clamping between 0.0 and 1.0
    const delta = WEIGHT_DELTAS[type as keyof typeof WEIGHT_DELTAS] || 0;
    const user = await User.findById(userId);
    if (user && user.interests) {
      const current = user.interests.get(topic) ?? 0.2;
      const updated = Math.max(0.0, Math.min(1.0, parseFloat((current + delta).toFixed(2))));
      user.interests.set(topic, updated);
      await user.save();
    }

    return NextResponse.json({ success: true, topic, delta });
  } catch (err: unknown) {
    console.error("Failed to log event:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error logging event" },
      { status: 500 }
    );
  }
}
