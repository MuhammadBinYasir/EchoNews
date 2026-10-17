import { NextRequest, NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await ingestAll();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error("Scheduled ingestion failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
