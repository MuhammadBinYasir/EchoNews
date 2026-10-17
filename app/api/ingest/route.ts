import { NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";

export const maxDuration = 60; // allow slow feeds on serverless hosts

export async function GET() {
    try {
        const report = await ingestAll();
        return NextResponse.json({ ok: true, ...report });
    } catch (err) {
        console.error("Ingest failed:", err);
        return NextResponse.json(
            { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}