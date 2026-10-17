import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOrCreateTodayEdition, formatTopicName, extractInterestsMap } from "@/lib/edition";
import EditionClientView from "./EditionClientView";

export const instant = false;

function formatArticleForClient(doc: any) {
  if (!doc) return null;
  return {
    _id: doc._id?.toString() || "",
    title: doc.title || "",
    source: doc.source || "",
    topic: doc.topic || "tech",
    snippet: doc.snippet || "",
    image: doc.image || "",
    url: doc.url || "#",
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : "",
  };
}

export default async function Home() {
  await connection();

  const cookieStore = await cookies();
  const userId =
    cookieStore.get("echo_user_id")?.value ||
    cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/onboarding");
  }

  const result = await getOrCreateTodayEdition(userId);
  if (!result || !result.user || !result.edition) {
    redirect("/onboarding");
  }

  const { user, edition } = result;

  // Compute top 6 interests in descending order
  const interestsMap = extractInterestsMap(user.interests);

  const sortedInterests = Object.entries(interestsMap)
    .map(([topic, weight]) => ({
      topic,
      displayName: formatTopicName(topic),
      weight: typeof weight === "number" ? Math.round(weight * 100) : 20,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  // Format date
  const editionDate = new Date(edition.date + "T12:00:00Z");
  const formattedDate = editionDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const layout = (edition.layout as any) || {};

  return (
    <EditionClientView
      user={{
        id: user._id.toString(),
        name: user.name,
        interests: sortedInterests,
      }}
      edition={{
        id: edition._id.toString(),
        date: formattedDate,
        number: edition.number || 1,
        threeThings: edition.threeThings || [],
        layout: {
          lead: formatArticleForClient(layout.lead),
          secondary: (layout.secondary || []).map(formatArticleForClient).filter(Boolean),
          briefs: (layout.briefs || []).map(formatArticleForClient).filter(Boolean),
          echo: (layout.echo || []).map(formatArticleForClient).filter(Boolean),
        },
      }}
    />
  );
}
