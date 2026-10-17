import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getOrCreateTodayEdition } from "@/lib/edition";
import EditionClientView from "./EditionClientView";
import { toEditionPageData } from "@/lib/edition-page-data";

export const instant = false;

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

  const pageData = toEditionPageData(user, edition);
  return <EditionClientView {...pageData} />;
}
