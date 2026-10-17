import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getReaderIdCandidates } from "@/lib/reader-cookies";
import { Edition } from "@/model";
import OnboardingForm from "./OnboardingForm";

export const instant = false;

export default async function OnboardingPage() {
  await connection();
  const cookieStore = await cookies();
  const userIds = getReaderIdCandidates(
    cookieStore.get("echo_user_id")?.value,
    cookieStore.get("userId")?.value,
  );

  if (userIds.length) {
    await connectDB();
    for (const userId of userIds) {
      const hasSavedEdition = await Edition.exists({ userId });
      if (hasSavedEdition) redirect("/today");
    }
  }

  return <OnboardingForm />;
}
