import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getOrCreateTodayEdition } from "@/lib/edition";
import { Edition } from "@/model";
import { getReaderIdCandidates } from "@/lib/reader-cookies";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const editionId = typeof body.editionId === "string" ? body.editionId : "";
    const cookieStore = await cookies();
    const userIds = getReaderIdCandidates(
      cookieStore.get("echo_user_id")?.value,
      cookieStore.get("userId")?.value,
    );

    if (!userIds.length) {
      return NextResponse.json({ error: "No user found" }, { status: 401 });
    }

    let userId = userIds[0];
    if (editionId) {
      if (!mongoose.isValidObjectId(editionId)) {
        return NextResponse.json({ error: "Invalid edition" }, { status: 400 });
      }
      await connectDB();
      const edition = await Edition.findOne({
        _id: editionId,
        userId: { $in: userIds },
      }).select("userId date").lean();
      if (!edition || edition.date !== new Date().toISOString().slice(0, 10)) {
        return NextResponse.json({ error: "Today’s edition was not found" }, { status: 404 });
      }
      userId = String(edition.userId);
    }

    const data = await getOrCreateTodayEdition(userId, true);
    if (!data?.edition) {
      return NextResponse.json({ error: "Could not create today’s edition" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error regenerating edition" },
      { status: 500 }
    );
  }
}
