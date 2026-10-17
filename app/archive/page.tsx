import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listEditions } from "@/lib/edition";
import { formatEditionDate } from "@/lib/edition-page-data";
import { getReaderIdCandidates } from "@/lib/reader-cookies";

export const instant = false;

export default async function ArchivePage() {
  const cookieStore = await cookies();
  const userIds = getReaderIdCandidates(
    cookieStore.get("echo_user_id")?.value,
    cookieStore.get("userId")?.value,
  );
  if (!userIds.length) redirect("/onboarding");

  // Edition data and its date-sensitive database query must run per request.
  await connection();

  let editions = [] as Awaited<ReturnType<typeof listEditions>>;
  for (const userId of userIds) {
    editions = await listEditions(userId);
    if (editions.length) break;
  }

  return (
    <main className="min-h-screen bg-[#f5f0e6] text-[#1a1917] px-6 md:px-12 py-8">
      <div className="max-w-[1100px] mx-auto">
        <header className="flex items-center justify-between border-b border-[#ded7cb] pb-5 mb-8">
          <Link href="/" className="font-serif text-4xl font-bold">Echo<span className="text-[#c0152f]">.</span></Link>
          <Link href="/today" className="text-sm text-[#716c64] hover:text-[#c0152f]">← Today’s edition</Link>
        </header>

        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#c0152f] uppercase mb-2">YOUR PERSONAL NEWSPAPER</p>
          <h1 className="font-serif text-4xl md:text-5xl">The archive</h1>
          <p className="text-[#716c64] mt-3">Every paper you’ve saved, gathered in one place.</p>
        </div>

        {editions.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {editions.map((edition) => (
              <Link key={edition.date} href={`/edition/${edition.date}`} className="group flex min-h-48 bg-white border border-[#ded7cb] hover:border-[#c0152f] transition-colors rounded-[2px] overflow-hidden">
                {edition.leadImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={edition.leadImage} alt="" className="w-2/5 object-cover bg-[#eee8dc]" referrerPolicy="no-referrer" />
                ) : <div className="w-2/5 bg-[#eee8dc]" />}
                <div className="p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[#c0152f] uppercase mb-2">Edition {String(edition.number).padStart(3, "0")}</p>
                    <h2 className="font-serif text-xl leading-snug group-hover:underline decoration-[#ded7cb]">{edition.leadTitle || "A day in the news"}</h2>
                  </div>
                  <p className="text-xs text-[#716c64] mt-5">{formatEditionDate(edition.date)} <span aria-hidden="true">→</span></p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-[#fcfaf7] border border-[#ded7cb] p-8 text-center">
            <h2 className="font-serif text-2xl">Your first edition is on its way.</h2>
            <p className="text-sm text-[#716c64] mt-2">Once your daily paper is ready, it will be kept here.</p>
            <Link href="/today" className="inline-block mt-5 text-sm text-[#c0152f] underline underline-offset-4">Return to today’s edition</Link>
          </div>
        )}
      </div>
    </main>
  );
}
