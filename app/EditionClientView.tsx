"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatTimeAgo, formatTopicName } from "@/lib/format";

interface ArticleItem {
  _id: string;
  title: string;
  source: string;
  topic: string;
  snippet?: string;
  image?: string;
  url: string;
  publishedAt?: string;
}

interface UserData {
  id: string;
  name: string;
  interests: Array<{
    topic: string;
    displayName: string;
    weight: number;
  }>;
}

interface EditionData {
  id: string;
  date: string;
  number: number;
  threeThings: string[];
  layout: {
    lead: ArticleItem | null;
    secondary: ArticleItem[];
    briefs: ArticleItem[];
    echo: ArticleItem[];
  };
}

export default function EditionClientView({
  user,
  edition,
}: {
  user: UserData;
  edition: EditionData;
}) {
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});
  const [skippedArticles, setSkippedArticles] = useState<Record<string, boolean>>({});
  const [interests, setInterests] = useState(user.interests);
  const [regenerating, setRegenerating] = useState(false);

  // Send interaction event to /api/event and update interest weights in real time
  const handleEvent = async (articleId: string, type: "like" | "skip" | "click") => {
    if (type === "like") {
      setLikedArticles((prev) => ({ ...prev, [articleId]: true }));
      setSkippedArticles((prev) => ({ ...prev, [articleId]: false }));
    } else if (type === "skip") {
      setSkippedArticles((prev) => ({ ...prev, [articleId]: true }));
      setLikedArticles((prev) => ({ ...prev, [articleId]: false }));
    }

    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          articleId,
          editionId: edition.id,
          type,
        }),
      });

      const data = await res.json();
      if (data.success && data.topic) {
        // Adjust client interest weight smoothly
        setInterests((prev) =>
          prev
            .map((item) => {
              if (item.topic === data.topic) {
                const newWeight = Math.max(0, Math.min(100, item.weight + (type === "like" ? 15 : -10)));
                return { ...item, weight: newWeight };
              }
              return item;
            })
            .sort((a, b) => b.weight - a.weight)
        );
      }
    } catch (err) {
      console.warn("Event logging failed:", err);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/edition/regenerate", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    } finally {
      setRegenerating(false);
    }
  };

  const lead = edition.layout.lead;
  const secondary = edition.layout.secondary;
  const briefs = edition.layout.briefs;
  const echo = edition.layout.echo;
  const totalArticles = (lead ? 1 : 0) + secondary.length + briefs.length + echo.length;

  return (
    <div className="min-h-screen bg-[#f5f0e6] text-[#1a1917] font-sans selection:bg-[#c0152f] selection:text-white pb-16">
      {/* Top Utility Bar */}
      <header className="w-full border-b border-[#ded7cb] bg-[#f5f0e6]/90 backdrop-blur-xs sticky top-0 z-30 print:hidden">
        <div className="max-w-[1340px] mx-auto px-6 md:px-12 py-3 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-[0.22em] text-[#716c64] uppercase">
            YOUR DAILY, REIMAGINED
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#ded7cb] hover:border-[#1a1917] bg-[#fcfaf7] text-[12px] font-medium text-[#1a1917] rounded-[2px] transition-colors cursor-pointer"
            >
              <span>⟳</span>
              <span>{regenerating ? "Regenerating..." : "Regenerate"}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c0152f] hover:bg-[#a31126] text-white text-[12px] font-medium rounded-[2px] transition-colors cursor-pointer shadow-xs"
            >
              <span>⬇</span>
              <span>Download PDF</span>
            </button>
            <Link href="/archive" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c0152f]/70 hover:bg-[#a31126] text-white text-[12px] font-medium rounded-[2px] transition-colors cursor-pointer shadow-xs">
              <span>Archive</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Newspaper Container */}
      <main className="max-w-[1340px] mx-auto px-6 md:px-12 pt-8">
        {/* Main Masthead Header */}
        <section className="border-b border-[#ded7cb] pb-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-6">
            {/* Left Masthead Info */}
            <div className="flex flex-col">
              <span className="text-[11px] font-bold tracking-[0.16em] text-[#c0152f] uppercase block mb-1">
                THE DAILY EDITION
              </span>
              <span className="font-serif text-[18px] text-[#1a1917]">
                {edition.date}
              </span>
            </div>

            {/* Center Logo */}
            <div className="text-center">
              <Link href="/">
                <span className="font-serif text-[56px] sm:text-[68px] font-bold tracking-tight text-[#1a1917] leading-none">
                  Echo<span className="text-[#c0152f]">.</span>
                </span>
              </Link>
            </div>

            {/* Right Reader Personalization */}
            <div className="text-right flex flex-col md:items-end">
              <span className="font-serif text-[20px] text-[#1a1917]">
                Prepared for {user.name}
              </span>
              <span className="text-[12px] text-[#716c64] mt-0.5">
                {totalArticles} stories. Your interests. A wider world.
              </span>
            </div>
          </div>
        </section>

        {/* Edition Subheader Rule */}
        <div className="flex items-center justify-between text-[11px] font-medium tracking-[0.16em] text-[#716c64] border-b border-[#ded7cb] pb-2 mb-8">
          <span className="uppercase text-[#1a1917] font-semibold">YOUR EDITION</span>
          <span className="uppercase">
            EDITION NO. {String(edition.number).padStart(3, "0")}
          </span>
        </div>

        {/* "Today in 3 Things" Key Takeaways Section */}
        {edition.threeThings && edition.threeThings.length >= 3 && (
          <section className="bg-[#eee8dc] border border-[#ded7cb] rounded-[2px] p-6 mb-10">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#ded7cb]">
              <h2 className="font-serif text-[22px] text-[#1a1917] font-normal">
                Today in 3 Things
              </h2>
              <span className="text-[10px] font-bold tracking-[0.16em] text-[#c0152f] uppercase">
                THE SHORT VERSION, BEFORE THE LONG READ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {edition.threeThings.map((thing, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="font-serif text-[26px] font-bold text-[#c0152f] leading-none shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[13px] text-[#1a1917] leading-relaxed">
                    {thing}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Main Grid: Left/Center Articles (8 cols) + Right Sidebar (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          
          {/* Left Column (Lead + Secondary Grid) */}
          <section className="lg:col-span-8 flex flex-col">
            
            {/* The Big Read / Lead Article */}
            {lead && (
              <article className="border-b border-[#ded7cb] pb-10 mb-10">
                <div className="flex items-center justify-between text-[11px] mb-3">
                  <span className="font-bold tracking-[0.16em] text-[#c0152f] uppercase">
                    THE BIG READ / {formatTopicName(lead.topic).toUpperCase()}
                  </span>
                  <span className="font-serif italic text-[#716c64]">
                    Selected for your curious mind
                  </span>
                </div>

                <h1 className="font-serif text-[36px] sm:text-[46px] leading-[1.12] text-[#1a1917] font-normal tracking-tight mb-4">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleEvent(lead._id, "click")}
                    className="hover:underline decoration-[#ded7cb] underline-offset-4"
                  >
                    {lead.title}
                  </a>
                </h1>

                {/* Lead Image */}
                {lead.image && (
                  <div className="relative w-full aspect-16/9 bg-[#e8e2d5] overflow-hidden rounded-[2px] mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lead.image}
                      alt={lead.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                    />
                  </div>
                )}

                {/* Snippet (hidden if empty) */}
                {lead.snippet && lead.snippet.trim().length > 0 && (
                  <p className="text-[16px] text-[#555049] leading-[1.65] mb-6">
                    {lead.snippet}
                  </p>
                )}

                {/* Lead Footer Meta & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#ded7cb]/60 text-[12px]">
                  <div className="flex items-center gap-3 text-[#716c64]">
                    <span className="font-semibold text-[#1a1917]">{lead.source}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(lead.publishedAt)}</span>
                    <span>·</span>
                    <span className="text-[#c0152f] font-medium">
                      Because you like {formatTopicName(lead.topic)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleEvent(lead._id, "click")}
                      className="px-3 py-1 bg-[#fcfaf7] border border-[#ded7cb] hover:border-[#1a1917] text-[#1a1917] rounded-[2px] transition-colors"
                    >
                      Read original
                    </a>
                    <button
                      onClick={() => handleEvent(lead._id, "like")}
                      className={`px-3 py-1 border rounded-[2px] transition-colors cursor-pointer ${
                        likedArticles[lead._id]
                          ? "bg-[#c0152f] text-white border-[#c0152f]"
                          : "bg-[#fcfaf7] border-[#ded7cb] hover:border-[#1a1917] text-[#1a1917]"
                      }`}
                    >
                      Like
                    </button>
                    <button
                      onClick={() => handleEvent(lead._id, "skip")}
                      className={`px-3 py-1 border rounded-[2px] transition-colors cursor-pointer ${
                        skippedArticles[lead._id]
                          ? "bg-stone-300 text-stone-700 border-stone-400"
                          : "bg-[#fcfaf7] border-[#ded7cb] hover:border-[#1a1917] text-[#1a1917]"
                      }`}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </article>
            )}

            {/* "More for you" (Secondary 4-card Grid) */}
            {secondary.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between border-b border-[#ded7cb] pb-2 mb-6">
                  <h2 className="font-serif text-[26px] text-[#1a1917] font-normal">
                    More for you
                  </h2>
                  <span className="text-[10px] font-bold tracking-[0.16em] text-[#716c64] uppercase">
                    FOLLOW YOUR CURIOSITY
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {secondary.map((art) => (
                    <article
                      key={art._id}
                      className={`flex flex-col justify-between border border-[#ded7cb] bg-white p-5 rounded-[2px] transition-opacity ${
                        skippedArticles[art._id] ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <div>
                        {art.image && (
                          <div className="relative w-full aspect-16/10 bg-[#e8e2d5] overflow-hidden rounded-[2px] mb-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={art.image}
                              alt={art.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <span className="text-[10px] font-bold tracking-[0.16em] text-[#c0152f] uppercase block mb-1.5">
                          {formatTopicName(art.topic).toUpperCase()}
                        </span>

                        <h3 className="font-serif text-[20px] leading-[1.25] text-[#1a1917] font-normal mb-2.5">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleEvent(art._id, "click")}
                            className="hover:underline decoration-[#ded7cb] underline-offset-2"
                          >
                            {art.title}
                          </a>
                        </h3>

                        {art.snippet && art.snippet.trim().length > 0 && (
                          <p className="text-[13px] text-[#6b655b] leading-relaxed line-clamp-3 mb-4">
                            {art.snippet}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#ded7cb]/60 mt-auto">
                        <div className="text-[11px] text-[#716c64] mb-2 flex items-center justify-between">
                          <span>
                            {art.source} · {formatTimeAgo(art.publishedAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#c0152f] font-medium mb-3">
                          Because you like {formatTopicName(art.topic)}
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleEvent(art._id, "click")}
                            className="px-2.5 py-1 bg-[#fcfaf7] border border-[#ded7cb] hover:border-[#1a1917] rounded-[2px]"
                          >
                            Read original
                          </a>
                          <button
                            onClick={() => handleEvent(art._id, "like")}
                            className={`px-2.5 py-1 border rounded-[2px] cursor-pointer ${
                              likedArticles[art._id]
                                ? "bg-[#c0152f] text-white border-[#c0152f]"
                                : "bg-[#fcfaf7] border-[#ded7cb] hover:border-[#1a1917]"
                            }`}
                          >
                            Like
                          </button>
                          <button
                            onClick={() => handleEvent(art._id, "skip")}
                            className={`px-2.5 py-1 border rounded-[2px] cursor-pointer ${
                              skippedArticles[art._id]
                                ? "bg-stone-300 text-stone-700"
                                : "bg-[#fcfaf7] border-[#ded7cb] hover:border-[#1a1917]"
                            }`}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

          </section>

          {/* Right Column (Your Interests + In Brief) */}
          <aside className="lg:col-span-4 flex flex-col space-y-10 lg:pl-4">
            
            {/* "Your interests" Taste Panel */}
            <div className="bg-[#fcfaf7] border border-[#ded7cb] p-6 rounded-[2px]">
              <div className="border-b border-[#ded7cb] pb-3 mb-3">
                <h3 className="font-serif text-[22px] text-[#1a1917]">
                  Your interests
                </h3>
                <p className="text-[12px] text-[#716c64] mt-1 leading-snug">
                  A reflection of your curiosity, not a limit on what you&apos;ll see.
                </p>
              </div>

              {/* Top 6 Interest Progress Bars in Descending Order */}
              <div className="space-y-4 pt-2">
                {interests.map((item) => (
                  <div key={item.topic} className="flex flex-col">
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className="font-medium text-[#1a1917]">
                        {item.displayName}
                      </span>
                      <span className="font-mono text-[#716c64] text-[11px]">
                        {item.weight}%
                      </span>
                    </div>
                    <div className="w-full h-[3px] bg-[#ded7cb] rounded-none overflow-hidden">
                      <div
                        className="h-full bg-[#c0152f] transition-all duration-500"
                        style={{ width: `${item.weight}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* "In brief" (6 Quick Reads) */}
            {briefs.length > 0 && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between border-b border-[#ded7cb] pb-2 mb-2">
                  <h3 className="font-serif text-[24px] text-[#1a1917]">
                    In brief
                  </h3>
                  <span className="text-[10px] font-bold tracking-[0.16em] text-[#c0152f] uppercase">
                    {briefs.length} QUICK READS
                  </span>
                </div>
                <p className="text-[12px] text-[#716c64] mb-6">
                  Small stories. Plenty to think about.
                </p>

                <div className="space-y-6">
                  {briefs.map((b) => (
                    <article
                      key={b._id}
                      className={`pb-5 border-b border-[#ded7cb]/70 last:border-b-0 transition-opacity ${
                        skippedArticles[b._id] ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <h4 className="font-serif text-[18px] leading-snug text-[#1a1917] mb-1.5">
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleEvent(b._id, "click")}
                          className="hover:underline decoration-[#ded7cb]"
                        >
                          {b.title}
                        </a>
                      </h4>
                      <div className="text-[11px] text-[#716c64] mb-1">
                        {b.source} · {formatTimeAgo(b.publishedAt)}
                      </div>
                      <div className="text-[11px] text-[#c0152f] font-medium mb-2.5">
                        Because you like {formatTopicName(b.topic)}
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleEvent(b._id, "click")}
                          className="px-2 py-0.5 bg-[#fcfaf7] border border-[#ded7cb] hover:border-[#1a1917] rounded-[2px]"
                        >
                          Read original
                        </a>
                        <button
                          onClick={() => handleEvent(b._id, "like")}
                          className={`px-2 py-0.5 border rounded-[2px] cursor-pointer ${
                            likedArticles[b._id]
                              ? "bg-[#c0152f] text-white border-[#c0152f]"
                              : "bg-[#fcfaf7] border-[#ded7cb]"
                          }`}
                        >
                          Like
                        </button>
                        <button
                          onClick={() => handleEvent(b._id, "skip")}
                          className={`px-2 py-0.5 border rounded-[2px] cursor-pointer ${
                            skippedArticles[b._id]
                              ? "bg-stone-300 text-stone-700"
                              : "bg-[#fcfaf7] border-[#ded7cb]"
                          }`}
                        >
                          Skip
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Sidebar Editorial Note */}
            <div className="pt-6 border-t border-[#ded7cb]">
              <p className="font-serif italic text-[16px] text-[#1a1917] mb-1.5">
                An edition that grows with you.
              </p>
              <p className="text-[12px] text-[#716c64] leading-relaxed">
                Like what speaks to you. Skip what doesn&apos;t. Each small signal helps shape your next edition.
              </p>
            </div>

          </aside>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: BREAK THE ECHO (SERENDIPITY / DISCOVERY)                  */}
        {/* ========================================================================= */}
        {echo.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[#ded7cb]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-[10px] font-bold tracking-[0.16em] text-[#c0152f] uppercase block mb-1">
                  A STARTING POINT. NOT A FILTER BUBBLE.
                </span>
                <h2 className="font-serif text-[36px] text-[#1a1917]">
                  Break the Echo
                </h2>
              </div>
              <p className="font-serif italic text-[15px] text-[#716c64] max-w-md">
                Good stories don&apos;t always follow your interests. Two unexpected roads, chosen to open another window.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {echo.map((eArt) => (
                <article
                  key={eArt._id}
                  className={`border border-[#ded7cb] bg-white p-6 rounded-[2px] flex flex-col justify-between ${
                    skippedArticles[eArt._id] ? "opacity-40" : "opacity-100"
                  }`}
                >
                  <div>
                    {eArt.image && (
                      <div className="relative w-full aspect-16/9 bg-[#e8e2d5] overflow-hidden rounded-[2px] mb-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={eArt.image}
                          alt={eArt.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <span className="text-[10px] font-bold tracking-[0.16em] text-[#c0152f] uppercase block mb-2">
                      {formatTopicName(eArt.topic).toUpperCase()}
                    </span>

                    <h3 className="font-serif text-[24px] leading-snug text-[#1a1917] font-normal mb-3">
                      <a
                        href={eArt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleEvent(eArt._id, "click")}
                        className="hover:underline decoration-[#ded7cb]"
                      >
                        {eArt.title}
                      </a>
                    </h3>

                    {eArt.snippet && eArt.snippet.trim().length > 0 && (
                      <p className="text-[14px] text-[#6b655b] leading-relaxed mb-4">
                        {eArt.snippet}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#ded7cb]/60 mt-auto">
                    <div className="text-[12px] text-[#716c64] mb-1">
                      {eArt.source} · {formatTimeAgo(eArt.publishedAt)}
                    </div>
                    <div className="text-[12px] text-[#c0152f] font-medium mb-3">
                      Outside your interests · A different point of view
                    </div>

                    <div className="flex items-center gap-2 text-[12px]">
                      <a
                        href={eArt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleEvent(eArt._id, "click")}
                        className="px-3 py-1 bg-[#fcfaf7] border border-[#ded7cb] hover:border-[#1a1917] rounded-[2px]"
                      >
                        Read original
                      </a>
                      <button
                        onClick={() => handleEvent(eArt._id, "like")}
                        className={`px-3 py-1 border rounded-[2px] cursor-pointer ${
                          likedArticles[eArt._id]
                            ? "bg-[#c0152f] text-white border-[#c0152f]"
                            : "bg-[#fcfaf7] border-[#ded7cb]"
                        }`}
                      >
                        Like
                      </button>
                      <button
                        onClick={() => handleEvent(eArt._id, "skip")}
                        className={`px-3 py-1 border rounded-[2px] cursor-pointer ${
                          skippedArticles[eArt._id]
                            ? "bg-stone-300 text-stone-700"
                            : "bg-[#fcfaf7] border-[#ded7cb]"
                        }`}
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Newspaper Footer */}
      <footer className="max-w-[1340px] mx-auto px-6 md:px-12 mt-16 pt-8 border-t border-[#ded7cb] text-[#716c64]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] mb-6">
          <p className="font-serif italic text-[16px] text-[#2a2723]">
            The news that speaks to you.
          </p>
          <p className="tracking-wide uppercase text-[11px]">
            EDITION NO. {String(edition.number).padStart(3, "0")} · {edition.date}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] border-t border-[#ded7cb]/60 pt-4">
          <span className="font-serif font-bold text-[#1a1917] text-[14px]">
            Echo<span className="text-[#c0152f]">.</span>
          </span>
          <span>An independent voice. An informed tomorrow.</span>
        </div>
      </footer>
    </div>
  );
}
