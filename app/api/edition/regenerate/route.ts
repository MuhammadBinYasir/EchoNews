import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrCreateTodayEdition } from "@/lib/edition";

export const maxDuration = 60;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("echo_user_id")?.value || cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "No user found" }, { status: 401 });
    }

    const data = await getOrCreateTodayEdition(userId, true);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error regenerating edition" },
      { status: 500 }
    );
  }
}
