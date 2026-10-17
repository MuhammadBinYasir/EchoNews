import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongo";
import { User, Article, Event, TOPICS, Topic } from "@/model";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, topics, likedArticleIds = [], dislikedArticleIds = [] } = body;

    // Validate name
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Please enter your name for the masthead." },
        { status: 400 }
      );
    }

    // Validate topics
    if (!Array.isArray(topics) || topics.length < 3) {
      return NextResponse.json(
        { error: "Please select at least 3 topics of interest." },
        { status: 400 }
      );
    }

    const validTopics = topics.filter((t: string): t is Topic =>
      TOPICS.includes(t as Topic)
    );

    if (validTopics.length < 3) {
      return NextResponse.json(
        { error: "Please choose valid topics from the list." },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Initial weights: 0.7 for selected topics, 0.2 for every other topic
    const weights = new Map<string, number>();
    for (const topic of TOPICS) {
      weights.set(topic, validTopics.includes(topic) ? 0.7 : 0.2);
    }

    // 2. Looks up each liked article, finds its topic, and adds 0.15 to that topic (maximum 1.0)
    let likedArticles: Array<{ _id: unknown; topic: string }> = [];
    if (Array.isArray(likedArticleIds) && likedArticleIds.length > 0) {
      likedArticles = await Article.find({
        _id: { $in: likedArticleIds },
      })
        .select("_id topic")
        .lean();

      for (const article of likedArticles) {
        if (article.topic && TOPICS.includes(article.topic as Topic)) {
          const currentWeight = weights.get(article.topic) ?? 0.2;
          const newWeight = Math.min(1.0, parseFloat((currentWeight + 0.15).toFixed(2)));
          weights.set(article.topic, newWeight);
        }
      }
    }

    // Re-onboarding in the same browser updates its existing reader profile.
    // This keeps editions and feedback attached to the same user instead of
    // creating an unreachable duplicate profile on every onboarding run.
    const cookieStore = await cookies();
    const existingUserId =
      cookieStore.get("echo_user_id")?.value || cookieStore.get("userId")?.value;
    const existingUser = existingUserId && mongoose.isValidObjectId(existingUserId)
      ? await User.findByIdAndUpdate(
          existingUserId,
          { $set: { name: name.trim(), interests: weights, initialInterests: weights } },
          { new: true, runValidators: true }
        )
      : null;
    const user = existingUser ?? await User.create({
      name: name.trim(),
      interests: weights,
      initialInterests: weights,
      createdAt: new Date(),
    });

    const userIdStr = user._id.toString();

    // 4. Log initial events for learning loop
    try {
      const eventOps = [];
      for (const a of likedArticles) {
        eventOps.push({
          userId: user._id,
          articleId: a._id,
          topic: a.topic,
          type: "like",
          origin: "onboarding",
          ts: new Date(),
        });
      }

      if (Array.isArray(dislikedArticleIds) && dislikedArticleIds.length > 0) {
        const dislikedArticles = await Article.find({
          _id: { $in: dislikedArticleIds },
        })
          .select("_id topic")
          .lean();

        for (const a of dislikedArticles) {
          eventOps.push({
            userId: user._id,
            articleId: a._id,
            topic: a.topic,
            type: "skip",
            origin: "onboarding",
            ts: new Date(),
          });
        }
      }

      if (eventOps.length > 0) {
        await Event.insertMany(eventOps);
      }
    } catch (eventErr) {
      console.warn("Event logging skipped during onboarding:", eventErr);
    }

    // 5. Set user cookies
    cookieStore.set("echo_user_id", userIdStr, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    cookieStore.set("userId", userIdStr, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      userId: userIdStr,
      name: user.name,
      interests: Object.fromEntries(weights),
    });
  } catch (error: unknown) {
    console.error("Failed to complete onboarding:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Could not save onboarding profile: " + errorMessage },
      { status: 500 }
    );
  }
}
