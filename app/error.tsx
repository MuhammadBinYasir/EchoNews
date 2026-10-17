"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f5f0e6] text-[#1a1917]">
      <div className="mx-auto max-w-[640px] px-6 py-16">
        <Link href="/" className="font-serif text-4xl font-bold">
          Echo<span className="text-[#c0152f]">.</span>
        </Link>
        <h1 className="mt-10 font-serif text-4xl">This page could not be opened.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#555049]">
          The newspaper ran into a server problem. Try again in a moment. If this continues,
          check that the database is running and reload.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-[2px] bg-[#c0152f] px-5 text-[13px] font-semibold text-white hover:bg-[#a31126]"
          >
            Try again
          </button>
          <Link href="/" className="inline-flex min-h-11 items-center text-[13px] text-[#716c64] hover:text-[#c0152f]">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
