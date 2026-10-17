"use client";

import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEditionByDate, formatTopicName, extractInterestsMap } from '@/lib/edition';
import EditionClientView from '@/app/EditionClientView';

export default async function EditionByDatePage({ params }: { params: { date: string } }) {
  const { date } = params;
  const cookieStore = await cookies();
  const userId =
    cookieStore.get('echo_user_id')?.value ||
    cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/onboarding');
  }

  const result = await getEditionByDate(userId, date);

  if (!result || !result.edition) {
    // No edition for this date
    return (
      <main className="min-h-screen bg-[#f5f0e6] text-[#1a1917] font-sans flex items-center justify-center pb-16">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#1a1917] mb-4">No edition for this day</h1>
          <Link href="/archive" className="inline-block mt-2 px-4 py-2 bg-[#c0152f] text-white rounded-[2px] hover:bg-[#a31126]">
            View Archive
          </Link>
        </div>
      </main>
    );
  }

  const { user, edition } = result;

  // Compute top 6 interests in descending order
  const interestsMap = extractInterestsMap(user.interests);
  const sortedInterests = Object.entries(interestsMap)
    .map(([topic, weight]) => ({
      topic,
      displayName: formatTopicName(topic),
      weight: typeof weight === 'number' ? Math.round(weight * 100) : 20,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  // Format date for display (same as home page)
  const editionDate = new Date(edition.date + 'T12:00:00Z');
  const formattedDate = editionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const layout = (edition.layout as any) || {};

  return (
    <EditionClientView
      user={{
        id: user._id.toString(),
        name: user.name,
        interests: sortedInterests,
      }}
      edition={{
        id: edition._id.toString(),
        date: formattedDate,
        number: edition.number || 1,
        threeThings: edition.threeThings || [],
        layout: {
          lead: layout.lead,
          secondary: layout.secondary || [],
          briefs: layout.briefs || [],
          echo: layout.echo || [],
        },
      }}
    />
  );
}
