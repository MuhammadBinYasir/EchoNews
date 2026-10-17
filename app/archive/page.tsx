

import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { listEditions } from '@/lib/edition';

export default async function ArchivePage() {
  const cookieStore = await cookies();
  const userId =
    cookieStore.get('echo_user_id')?.value ||
    cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/onboarding');
  }

  const editions = await listEditions(userId);

  return (
    <main className="min-h-screen bg-[#f5f0e6] text-[#1a1917] font-sans pb-16">
      <header className="w-full border-b border-[#ded7cb] bg-[#f5f0e6]/90 backdrop-blur-xs sticky top-0 z-30 print:hidden">
        <div className="max-w-[1340px] mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-[0.22em] text-[#716c64] uppercase">
            YOUR ARCHIVE
          </span>
        </div>
      </header>
      <section className="max-w-[1340px] mx-auto px-6 md:px-12 pt-8">
        <h1 className="text-3xl font-serif text-[#1a1917] mb-8">Past Editions</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {editions.map((ed) => (
            <Link
              key={ed.date}
              href={`/edition/${ed.date}`}
              className="block border border-[#ded7cb] rounded-[2px] bg-white p-5 hover:shadow-md transition-shadow"
            >
              <div className="text-sm text-[#716c64] mb-1">
                {new Date(ed.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="font-medium text-[#c0152f] uppercase mb-2">
                Edition No. {String(ed.number).padStart(3, '0')}
              </div>
              <div className="font-serif text-[#1a1917] line-clamp-2">{ed.leadTitle}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
