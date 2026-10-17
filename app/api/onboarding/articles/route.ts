import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getNextOnboardingArticle } from "@/lib/curate-onboarding";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTopics: string[] = Array.isArray(body.topics) ? body.topics : [];
    const seenIds: string[] = Array.isArray(body.seenIds) ? body.seenIds : [];
    const likedIds: string[] = Array.isArray(body.likedIds) ? body.likedIds : [];
    const dislikedIds: string[] = Array.isArray(body.dislikedIds) ? body.dislikedIds : [];
    const rotationSeed = typeof body.rotationSeed === "string" && body.rotationSeed
      ? body.rotationSeed.slice(0, 100)
      : randomUUID();

    const article = await getNextOnboardingArticle({
      topics: rawTopics,
      seenIds,
      likedIds,
      dislikedIds,
      rotationSeed,
    });

    return NextResponse.json({
      success: true,
      article,
      rotationSeed,
    });
  } catch (error: unknown) {
    console.error("Failed to curate next onboarding article:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
