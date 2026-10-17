import { NextRequest, NextResponse } from "next/server";
import { getNextOnboardingArticle } from "@/lib/curate-onboarding";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTopics: string[] = Array.isArray(body.topics) ? body.topics : [];
    const seenIds: string[] = Array.isArray(body.seenIds) ? body.seenIds : [];
    const likedIds: string[] = Array.isArray(body.likedIds) ? body.likedIds : [];
    const dislikedIds: string[] = Array.isArray(body.dislikedIds) ? body.dislikedIds : [];

    const article = await getNextOnboardingArticle({
      topics: rawTopics,
      seenIds,
      likedIds,
      dislikedIds,
    });

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (error: unknown) {
    console.error("Failed to curate next onboarding article:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
