import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongo";
import { User, TOPICS, Topic } from "@/model";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, topics } = body;

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

    // Connect to MongoDB
    await connectDB();

    // Map initial interests: selected topics get 1.0, unselected get 0.1
    const interestsMap = new Map<string, number>();
    for (const topic of TOPICS) {
      interestsMap.set(topic, validTopics.includes(topic) ? 1.0 : 0.1);
    }

    // Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      interests: interestsMap,
      createdAt: new Date(),
    });

    const userIdStr = user._id.toString();

    // Set cookie according to SKILLS.md: "The user _id is stored in a cookie."
    const cookieStore = await cookies();
    cookieStore.set("echo_user_id", userIdStr, {
      path: "/",
      httpOnly: false, // Accessible to client if needed
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    cookieStore.set("userId", userIdStr, {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      userId: userIdStr,
      name: user.name,
      interests: Object.fromEntries(interestsMap),
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
