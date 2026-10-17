import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongo";
import { Event, User, Article, Edition, EVENT_TYPES, type EventType, type Topic } from "@/model";
import mongoose from "mongoose";

const WEIGHT_DELTAS = {
  click: 0.1,
  like: 0.2,
  skip: -0.1,
  read: 0.05,
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articleId, editionId, type } = body;

    if (!articleId || !editionId || !EVENT_TYPES.includes(type as EventType)) {
      return NextResponse.json({ error: "Missing required event fields" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userId = cookieStore.get("echo_user_id")?.value || cookieStore.get("userId")?.value;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ error: "Sign in to record reading feedback" }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(articleId) || !mongoose.isValidObjectId(editionId)) {
      return NextResponse.json({ error: "Invalid article or edition" }, { status: 400 });
    }

    await connectDB();

    const belongsToEdition = await Edition.exists({
      _id: editionId,
      userId,
      $or: [
        { "layout.lead": articleId },
        { "layout.secondary": articleId },
        { "layout.briefs": articleId },
        { "layout.echo": articleId },
      ],
    });
    if (!belongsToEdition) {
      return NextResponse.json({ error: "Article is not part of this edition" }, { status: 403 });
    }

    const article = await Article.findById(articleId).select("topic").lean();
    if (!article || !article.topic) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "Reader profile not found" }, { status: 404 });

    const topic = article.topic as Topic;

    // 1. Record event in MongoDB
    await Event.create({
      userId,
      articleId,
      editionId,
      topic,
      type: type as EventType,
      ts: new Date(),
    });

    // 2. Update user interests weight with clamping between 0.0 and 1.0
    const delta = WEIGHT_DELTAS[type as keyof typeof WEIGHT_DELTAS] || 0;
    let weight = 0.2;
    if (user.interests) {
      const current = user.interests.get(topic) ?? 0.2;
      const updated = Math.max(0.0, Math.min(1.0, parseFloat((current + delta).toFixed(2))));
      user.interests.set(topic, updated);
      weight = updated;
      await user.save();
    }

    return NextResponse.json({ success: true, topic, delta, weight: Math.round(weight * 100) });
  } catch (err: unknown) {
    console.error("Failed to log event:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error logging event" },
      { status: 500 }
    );
  }
}
