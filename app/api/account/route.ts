import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { Edition, Event, User } from "@/model";

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const userId =
      cookieStore.get("echo_user_id")?.value || cookieStore.get("userId")?.value;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      cookieStore.delete("echo_user_id");
      cookieStore.delete("userId");
      return NextResponse.json({ error: "Reader profile not found." }, { status: 401 });
    }

    await connectDB();

    // These collections are private to the reader. Article and summary records
    // are shared across readers, so they must remain untouched.
    await Promise.all([
      Edition.deleteMany({ userId }),
      Event.deleteMany({ userId }),
    ]);
    await User.findByIdAndDelete(userId);

    cookieStore.delete("echo_user_id");
    cookieStore.delete("userId");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete reader data:", error);
    return NextResponse.json(
      { error: "Could not delete your data. Please try again." },
      { status: 500 }
    );
  }
}
