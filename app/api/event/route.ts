import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongo";
import { Event, User, Article, Edition, EVENT_TYPES, type EventType, type Topic } from "@/model";
import { calculateLearnedInterests } from "@/lib/recommendation";
import { extractInterestsMap } from "@/lib/format";
import mongoose from "mongoose";

const FEEDBACK_WINDOW_DAYS = 180;

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

    // A repeated click/read should not inflate preference. A like/skip toggle
    // replaces the opposite opinion for this story in this edition.
    if (type === "like" || type === "skip") {
      await Event.deleteMany({
        userId,
        articleId,
        editionId,
        type: type === "like" ? "skip" : "like",
        origin: { $ne: "onboarding" },
      });
    }
    const alreadyRecorded = await Event.exists({ userId, articleId, editionId, type });
    if (!alreadyRecorded) {
      await Event.create({
        userId,
        articleId,
        editionId,
        topic,
        type: type as EventType,
        origin: "feedback",
        ts: new Date(),
      });
    }

    // Rebuild preferences from the onboarding baseline plus recent, decayed
    // signals. A light article click matters less than a like or a qualified read.
    const savedBaseline = extractInterestsMap(user.initialInterests);
    const baseline = Object.keys(savedBaseline).length
      ? savedBaseline
      : extractInterestsMap(user.interests);
    if (!Object.keys(savedBaseline).length) user.set("initialInterests", baseline);

    const cutoff = new Date(Date.now() - FEEDBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const feedback = await Event.find({
      userId,
      origin: { $ne: "onboarding" },
      ts: { $gte: cutoff },
    })
      .select("articleId editionId topic type ts")
      .sort({ ts: -1 })
      .limit(2000)
      .lean();
    const learned = calculateLearnedInterests(baseline, feedback);
    for (const [learnedTopic, learnedWeight] of Object.entries(learned)) {
      user.interests?.set(learnedTopic, learnedWeight);
    }
    await user.save();

    const deltaByType: Record<EventType, number> = { click: 0.015, read: 0.07, like: 0.18, skip: -0.14 };
    return NextResponse.json({
      success: true,
      topic,
      delta: deltaByType[type as EventType],
      weight: Math.round((user.interests?.get(topic) ?? 0.2) * 100),
    });
  } catch (err: unknown) {
    console.error("Failed to log event:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error logging event" },
      { status: 500 }
    );
  }
}
