import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getEditionByDate } from "@/lib/edition";
import { toEditionPageData } from "@/lib/edition-page-data";
import EditionClientView from "@/app/EditionClientView";
import { getReaderIdCandidates } from "@/lib/reader-cookies";

export const instant = false;
export const maxDuration = 60;

export default async function ArchivedEditionPage({ params }: PageProps<"/edition/[date]">) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const cookieStore = await cookies();
  const userIds = getReaderIdCandidates(
    cookieStore.get("echo_user_id")?.value,
    cookieStore.get("userId")?.value,
  );
  if (!userIds.length) redirect("/onboarding");

  for (const userId of userIds) {
    const result = await getEditionByDate(userId, date);
    if (result) {
      const { user, edition } = toEditionPageData(result.user, result.edition);
      return <EditionClientView user={user} edition={{ ...edition, isArchived: true }} />;
    }
  }

  notFound();
}
