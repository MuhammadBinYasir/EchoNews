import { NextRequest, NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";

export const maxDuration = 60; // allow slow feeds on serverless hosts

function ingestAuthorized(request: NextRequest) {
    if (process.env.NODE_ENV !== "production") return true;
    const secret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    return Boolean(secret) && auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
    if (!ingestAuthorized(request)) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

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