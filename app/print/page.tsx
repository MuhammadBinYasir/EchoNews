import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getEditionByDate, getOrCreateTodayEdition, listEditions } from "@/lib/edition";
import { toEditionPageData } from "@/lib/edition-page-data";
import { getReaderIdCandidates } from "@/lib/reader-cookies";
import PrintEditionView from "../PrintEditionView";

export const instant = false;
export const maxDuration = 60;

export default async function PrintPage() {
  await connection();
  const cookieStore = await cookies();
  const userIds = getReaderIdCandidates(
    cookieStore.get("echo_user_id")?.value,
    cookieStore.get("userId")?.value,
  );

  for (const userId of userIds) {
    const result = await getOrCreateTodayEdition(userId);
    if (result?.user && result.edition) {
      const pageData = toEditionPageData(result.user, result.edition);
      return <PrintEditionView user={pageData.user} edition={pageData.edition} />;
    }

    const archivedEditions = await listEditions(userId);
    if (archivedEditions.length) {
      const latest = await getEditionByDate(userId, archivedEditions[0].date);
      if (latest?.user && latest.edition) {
        const pageData = toEditionPageData(latest.user, latest.edition);
        return <PrintEditionView user={pageData.user} edition={pageData.edition} />;
      }
    }
  }

  redirect("/onboarding");
}
