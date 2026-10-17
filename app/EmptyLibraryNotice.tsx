"use client";

import { useState } from "react";
import Link from "next/link";

export default function EmptyLibraryNotice({
  readerName,
  canManuallyRefresh,
}: {
  readerName: string;
  canManuallyRefresh: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refreshLibrary = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ingest");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Could not refresh the story library.");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh the story library.");
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f0e6] text-[#1a1917]">
      <div className="mx-auto max-w-[720px] px-6 py-16">
        <Link href="/" className="font-serif text-4xl font-bold">
          Echo<span className="text-[#c0152f]">.</span>
        </Link>
        <p className="mt-10 text-[11px] font-bold tracking-[0.18em] text-[#c0152f] uppercase">
          Prepared for {readerName}
        </p>
        <h1 className="mt-3 font-serif text-4xl">Today’s paper is waiting on stories.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#555049]">
          Echo has your profile, but the shared article library is empty. Once the story
          library is populated, this page will build your edition.
        </p>
        {!canManuallyRefresh && (
          <p className="mt-3 text-sm text-[#716c64]">
            The protected news refresh runs on the server. Please try again after the next refresh,
            or ask the site administrator to run it now.
          </p>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-[#a31126]">{error}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          {canManuallyRefresh && (
            <button
              type="button"
              onClick={() => void refreshLibrary()}
              disabled={busy}
              className="min-h-11 rounded-[2px] bg-[#c0152f] px-5 text-[13px] font-semibold text-white hover:bg-[#a31126] disabled:opacity-60"
            >
              {busy ? "Fetching headlines…" : "Fetch today’s stories"}
            </button>
          )}
          <Link href="/onboarding" className="inline-flex min-h-11 items-center text-[13px] text-[#716c64] hover:text-[#c0152f]">
            Update my interests
          </Link>
        </div>
      </div>
    </main>
  );
}
