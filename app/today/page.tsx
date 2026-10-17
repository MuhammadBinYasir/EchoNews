import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEditionFeedback, getOrCreateTodayEdition, listEditions } from "@/lib/edition";
import EditionClientView from "../EditionClientView";
import { toEditionPageData } from "@/lib/edition-page-data";
import { getReaderIdCandidates } from "@/lib/reader-cookies";

export const instant = false;
export const maxDuration = 60;

export default async function Home() {
  await connection();

  const cookieStore = await cookies();
  const userIds = getReaderIdCandidates(
    cookieStore.get("echo_user_id")?.value,
    cookieStore.get("userId")?.value,
  );

  for (const userId of userIds) {
    const result = await getOrCreateTodayEdition(userId);
    if (result?.user && result.edition) {
      const feedback = await getEditionFeedback(userId, String(result.edition._id));
      const pageData = toEditionPageData(result.user, result.edition, feedback);
      return <EditionClientView {...pageData} />;
    }

    const archivedEditions = await listEditions(userId);
    if (archivedEditions.length) redirect(`/edition/${archivedEditions[0].date}`);
  }

  redirect("/onboarding");
}
