import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEditionFeedback, getOrCreateTodayEdition, listEditions } from "@/lib/edition";
import EditionClientView from "../EditionClientView";
import EmptyLibraryNotice from "../EmptyLibraryNotice";
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
    if (result?.user) {
      const name = typeof result.user.name === "string" ? result.user.name : "Reader";
      return <EmptyLibraryNotice readerName={name} canManuallyRefresh={process.env.NODE_ENV !== "production"} />;
    }
  }

  redirect("/onboarding");
}
