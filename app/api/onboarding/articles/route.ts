import { NextRequest, NextResponse } from "next/server";
import { curateOnboardingArticles } from "@/lib/curate-onboarding";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTopics: string[] = Array.isArray(body.topics) ? body.topics : [];

    const articles = await curateOnboardingArticles(rawTopics);

    return NextResponse.json({
      success: true,
      total: articles.length,
      articles,
    });
  } catch (error: unknown) {
    console.error("Failed to curate onboarding articles:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
