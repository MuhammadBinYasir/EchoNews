"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTimeAgo, formatTopicName } from "@/lib/format";
import NewsStoryRail from "./NewsStoryRail";

interface ArticleItem {
  _id: string;
  title: string;
  source: string;
  topic: string;
  summary?: string;
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
  isArchived?: boolean;
  threeThings: string[];
  personalization: {
    changes: Array<{ topic: string; displayName: string; delta: number; likes: number; skips: number }>;
    explanation: string;
    storyReasons: Record<string, string>;
  } | null;
  feedback?: { likedArticles: Record<string, boolean>; skippedArticles: Record<string, boolean> };
  layout: {
    lead: ArticleItem | null;
    secondary: ArticleItem[];
    briefs: ArticleItem[];
    echo: ArticleItem[];
  };
}

function ArticleSummary({ article, className = "" }: { article: ArticleItem; className?: string }) {
  const text = article.summary?.trim() || article.snippet?.trim();
  if (!text) return null;

  return (
    <div className={`mb-5 ${className}`}>
      <p className="mb-1 text-[9px] font-bold tracking-[0.16em] text-[#c0152f]">
        {article.summary ? "ECHO SUMMARY" : "PUBLISHER EXCERPT"}
      </p>
      <p className="text-[14px] leading-[1.65] text-[#555049]">{text}</p>
    </div>
  );
}

export default function EditionClientView({
  user,
  edition,
  isArchived = false,
}: {
  user: UserData;
  edition: EditionData;
  isArchived?: boolean;
}) {
  const router = useRouter();
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>(() => edition.feedback?.likedArticles || {});
  const [skippedArticles, setSkippedArticles] = useState<Record<string, boolean>>(() => edition.feedback?.skippedArticles || {});
  const [interests, setInterests] = useState(user.interests);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [deletingData, setDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const pendingFeedbackRef = useRef<Promise<void> | null>(null);
  const pendingReadRef = useRef<{
    articleId: string;
    hiddenAt: number | null;
    timeoutId: number | null;
  } | null>(null);

  // Send interaction event to /api/event and update interest weights in real time
  const handleEvent = useCallback(async (articleId: string, type: "like" | "skip" | "click" | "read") => {
    setFeedbackError("");

    const previousRequest = pendingFeedbackRef.current;
    const request = (async () => {
      if (previousRequest) await previousRequest.catch(() => undefined);
      try {
        const res = await fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, editionId: edition.id, readerId: user.id, type }),
          keepalive: type === "click" || type === "read",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Could not save your feedback. Please try again.");
        }
        if (type === "like") {
          setLikedArticles((prev) => ({ ...prev, [articleId]: true }));
          setSkippedArticles((prev) => ({ ...prev, [articleId]: false }));
        } else if (type === "skip") {
          setSkippedArticles((prev) => ({ ...prev, [articleId]: true }));
          setLikedArticles((prev) => ({ ...prev, [articleId]: false }));
        }
        if (data.topic && typeof data.weight === "number") {
          setInterests((prev) =>
            [
              ...prev.filter((item) => item.topic !== data.topic),
              { topic: data.topic, displayName: formatTopicName(data.topic), weight: data.weight },
            ]
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 6)
          );
        }
      } catch (err) {
        console.warn("Event logging failed:", err);
        setFeedbackError(err instanceof Error ? err.message : "Could not save your feedback. Please try again.");
      }
    })();
    pendingFeedbackRef.current = request;
    try {
      await request;
    } finally {
      if (pendingFeedbackRef.current === request) pendingFeedbackRef.current = null;
    }
  }, [edition.id, user.id]);

  const handleArticleOpen = (articleId: string) => {
    void handleEvent(articleId, "click");
    if (pendingReadRef.current?.timeoutId !== null && pendingReadRef.current?.timeoutId !== undefined) {
      window.clearTimeout(pendingReadRef.current.timeoutId);
    }

    const pendingRead = { articleId, hiddenAt: null as number | null, timeoutId: null as number | null };
    pendingReadRef.current = pendingRead;
    // Only measure a read when opening the link actually switches away from Echo.
    pendingRead.timeoutId = window.setTimeout(() => {
      if (pendingReadRef.current === pendingRead) pendingReadRef.current = null;
    }, 15_000);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      const pendingRead = pendingReadRef.current;
      if (!pendingRead) return;

      if (document.visibilityState === "hidden") {
        if (pendingRead.timeoutId !== null) window.clearTimeout(pendingRead.timeoutId);
        pendingRead.timeoutId = null;
        pendingRead.hiddenAt = Date.now();
        return;
      }

      if (pendingRead.hiddenAt === null) return;
      const awayForMs = Date.now() - pendingRead.hiddenAt;
      pendingReadRef.current = null;
      if (awayForMs >= 30_000 && awayForMs <= 30 * 60_000) {
        void handleEvent(pendingRead.articleId, "read");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pendingReadRef.current?.timeoutId !== null && pendingReadRef.current?.timeoutId !== undefined) {
        window.clearTimeout(pendingReadRef.current.timeoutId);
      }
    };
  }, [handleEvent]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateError("");
    try {
      await pendingFeedbackRef.current?.catch(() => undefined);
      const res = await fetch("/api/edition/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editionId: edition.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not refresh your articles. Please try again.");
      }
      window.location.reload();
    } catch (error) {
      setRegenerateError(error instanceof Error ? error.message : "Could not refresh your articles.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteData = async () => {
    const confirmed = window.confirm(
      "Permanently delete your reader profile, editions, and reading history? This cannot be undone."
    );
    if (!confirmed) return;

    setDeletingData(true);
    setDeleteError("");
    try {
      await pendingFeedbackRef.current?.catch(() => undefined);
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete your data.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete your data.");
      setDeletingData(false);
    }
  };

  const lead = edition.layout.lead;
  const secondary = edition.layout.secondary;
  const briefs = edition.layout.briefs;
  const echo = edition.layout.echo;
  const totalArticles = (lead ? 1 : 0) + secondary.length + briefs.length + echo.length;
  const articleReason = (article: ArticleItem) =>
    edition.personalization?.storyReasons[article._id] || `A fresh ${formatTopicName(article.topic)} story selected for you`;

  return (
    <div className="echo-document min-h-screen bg-[#f5f0e6] text-[#1a1917] font-sans selection:bg-[#c0152f] selection:text-white pb-16">
      {/* Top Utility Bar */}
      <header className="w-full border-b border-[#ded7cb] bg-[#f5f0e6]/90 backdrop-blur-xs sticky top-0 z-30 print:hidden">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 md:px-12 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.16em] sm:tracking-[0.22em] text-[#716c64] uppercase">
            YOUR DAILY, REIMAGINED
          </span>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2">
            {isArchived ? (
              <button
                onClick={() => window.print()}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#c0152f] hover:bg-[#a31126] text-white text-[11px] sm:text-[12px] font-medium rounded-[2px] transition-colors cursor-pointer shadow-xs"
              >
                <span>⬇</span>
                <span>Download PDF</span>
              </button>
            ) : (
              <Link
                href="/print"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#c0152f] hover:bg-[#a31126] text-white text-[11px] sm:text-[12px] font-medium rounded-[2px] transition-colors cursor-pointer shadow-xs"
              >
                <span>⬇</span>
                <span>Download PDF</span>
              </Link>
            )}
            <details className="relative col-span-2 sm:col-span-1 sm:ml-auto">
              <summary className="flex min-h-10 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-[2px] border border-[#ded7cb] bg-[#fcfaf7] px-3.5 py-1.5 text-[11px] font-medium text-[#1a1917] transition-colors hover:border-[#1a1917] sm:w-auto sm:text-[12px]">
                More
                <span aria-hidden="true" className="text-[10px] text-[#716c64]">▾</span>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-[2px] border border-[#ded7cb] bg-[#fcfaf7] p-1 shadow-lg sm:w-52">
                {!isArchived && (
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex min-h-10 w-full items-center rounded-[2px] px-3 text-left text-[12px] text-[#1a1917] transition-colors hover:bg-[#eee8dc] disabled:opacity-60"
                  >
                    {regenerating ? "Refreshing edition…" : "Regenerate edition"}
                  </button>
                )}
                <Link
                  href="/archive"
                  className="flex min-h-10 items-center rounded-[2px] px-3 text-[12px] text-[#1a1917] transition-colors hover:bg-[#eee8dc]"
                >
                  Your archive
                </Link>
                <button
                  onClick={handleDeleteData}
                  disabled={deletingData}
                  className="flex min-h-10 w-full items-center rounded-[2px] px-3 text-left text-[12px] text-[#a31126] transition-colors hover:bg-[#fae9e7] disabled:opacity-60"
                >
                  {deletingData ? "Deleting your data…" : "Delete my data"}
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      {!isArchived && <NewsStoryRail readerId={user.id} />}

      {regenerateError && (
        <p role="alert" className="mx-auto max-w-[1340px] px-6 pt-3 text-sm text-[#a31126] print:hidden">
          {regenerateError}
        </p>
      )}
      {feedbackError && (
        <p role="alert" className="mx-auto max-w-[1340px] px-4 sm:px-6 md:px-12 pt-3 text-sm text-[#a31126] print:hidden">
          {feedbackError}
        </p>
      )}
      {deleteError && (
        <p role="alert" className="mx-auto max-w-[1340px] px-4 sm:px-6 md:px-12 pt-3 text-sm text-[#a31126] print:hidden">
          {deleteError}
        </p>
      )}

      {/* Newspaper Container */}
      <main className="echo-paper max-w-[1340px] mx-auto px-4 sm:px-6 md:px-12 pt-5 sm:pt-8">
        {/* Main Masthead Header */}
        <section className="border-b border-[#ded7cb] pb-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center md:items-end gap-4 sm:gap-6">
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
            <div className="text-center order-first md:order-none">
              <Link href="/today">
                <span className="font-serif text-[52px] sm:text-[68px] font-bold tracking-tight text-[#1a1917] leading-none">
                  Echo<span className="text-[#c0152f]">.</span>
                </span>
              </Link>
            </div>

            {/* Right Reader Personalization */}
            <div className="text-center md:text-right flex flex-col md:items-end">
              <span className="font-serif text-[18px] sm:text-[20px] text-[#1a1917] break-words">
                Prepared for {user.name}
              </span>
              <span className="text-[12px] text-[#716c64] mt-0.5">
                {totalArticles} stories. Your interests. A wider world.
              </span>
            </div>
          </div>
        </section>

        {/* Edition Subheader Rule */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-[11px] font-medium tracking-[0.12em] sm:tracking-[0.16em] text-[#716c64] border-b border-[#ded7cb] pb-2 mb-6 sm:mb-8">
          <span className="uppercase text-[#1a1917] font-semibold">YOUR EDITION</span>
          <span className="uppercase">
            EDITION NO. {String(edition.number).padStart(3, "0")}
          </span>
        </div>

        {!isArchived && edition.personalization ? (
          <section aria-labelledby="personalization-heading" className="mb-7 border border-[#ded7cb] bg-[#fcfaf7] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] font-bold tracking-[0.16em] text-[#c0152f] uppercase">Your feedback, reflected</p>
                <h2 id="personalization-heading" className="mt-1 font-serif text-[22px] text-[#1a1917]">What Echo learned from you</h2>
              </div>
              {edition.personalization.changes.length ? (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium text-[#716c64]">
                  {edition.personalization.changes.map((change) => (
                    <span key={change.topic} className={change.delta > 0 ? "text-[#34704d]" : "text-[#a31126]"}>
                      {change.displayName} {change.delta > 0 ? "↑" : "↓"} {Math.abs(change.delta)}%
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[12px] text-[#716c64]">No measurable shifts yet</span>
              )}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[#555049]">
              {edition.personalization.changes.length ? `“${edition.personalization.explanation}”` : edition.personalization.explanation}
            </p>
          </section>
        ) : null}

        {/* "Today in 3 Things" Key Takeaways Section */}
        {edition.threeThings && edition.threeThings.length >= 3 && (
          <section className="bg-[#eee8dc] border border-[#ded7cb] rounded-[2px] p-4 sm:p-6 mb-8 sm:mb-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-[#ded7cb]">
              <h2 className="font-serif text-[21px] sm:text-[22px] text-[#1a1917] font-normal">
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
        <div className="echo-print-grid grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14">
          
          {/* Left Column (Lead + Secondary Grid) */}
          <section className="lg:col-span-8 flex flex-col">
            
            {/* The Big Read / Lead Article */}
            {lead && (
            <article className="min-w-0 border-b border-[#ded7cb] pb-8 sm:pb-10 mb-8 sm:mb-10">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] mb-3">
                  <span className="font-bold tracking-[0.16em] text-[#c0152f] uppercase">
                    THE BIG READ / {formatTopicName(lead.topic).toUpperCase()}
                  </span>
                  <span className="font-serif italic text-[#716c64]">
                    {articleReason(lead)}
                  </span>
                </div>

                <h1 className="font-serif text-[30px] sm:text-[38px] lg:text-[46px] leading-[1.12] text-[#1a1917] font-normal tracking-tight mb-4 break-words">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleArticleOpen(lead._id)}
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

                <ArticleSummary article={lead} className="max-w-[760px]" />

                {/* Lead Footer Meta & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#ded7cb]/60 text-[12px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#716c64] min-w-0">
                    <span className="font-semibold text-[#1a1917]">{lead.source}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(lead.publishedAt)}</span>
                    <span>·</span>
                    <span className="text-[#c0152f] font-medium">
                      {articleReason(lead)}
                    </span>
                  </div>

                  <div className="echo-actions flex flex-wrap items-center gap-2">
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleArticleOpen(lead._id)}
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
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#ded7cb] pb-2 mb-6">
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

                        <h3 className="font-serif text-[20px] leading-[1.25] text-[#1a1917] font-normal mb-2.5 break-words">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleArticleOpen(art._id)}
                            className="hover:underline decoration-[#ded7cb] underline-offset-2"
                          >
                            {art.title}
                          </a>
                        </h3>

                        <ArticleSummary article={art} />
                      </div>

                      <div className="pt-3 border-t border-[#ded7cb]/60 mt-auto">
                        <div className="text-[11px] text-[#716c64] mb-2 flex items-center justify-between">
                          <span>
                            {art.source} · {formatTimeAgo(art.publishedAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#c0152f] font-medium mb-3">
                          {articleReason(art)}
                        </div>

                        <div className="echo-actions flex flex-wrap items-center gap-2 text-[11px]">
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleArticleOpen(art._id)}
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
            <div className="bg-[#fcfaf7] border border-[#ded7cb] p-4 sm:p-6 rounded-[2px]">
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
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#ded7cb] pb-2 mb-2">
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
                          onClick={() => handleArticleOpen(b._id)}
                          className="hover:underline decoration-[#ded7cb]"
                        >
                          {b.title}
                        </a>
                      </h4>
                      <div className="text-[11px] text-[#716c64] mb-1">
                        {b.source} · {formatTimeAgo(b.publishedAt)}
                      </div>
                      <div className="text-[11px] text-[#c0152f] font-medium mb-2.5">
                        {articleReason(b)}
                      </div>
                      <ArticleSummary article={b} className="mb-4" />

                      <div className="echo-actions flex flex-wrap items-center gap-2 text-[11px]">
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleArticleOpen(b._id)}
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
                <h2 className="font-serif text-[32px] sm:text-[36px] text-[#1a1917]">
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
                  className={`border border-[#ded7cb] bg-white p-4 sm:p-6 rounded-[2px] flex flex-col justify-between ${
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

                    <h3 className="font-serif text-[22px] sm:text-[24px] leading-snug text-[#1a1917] font-normal mb-3 break-words">
                      <a
                        href={eArt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleArticleOpen(eArt._id)}
                        className="hover:underline decoration-[#ded7cb]"
                      >
                        {eArt.title}
                      </a>
                    </h3>

                    <ArticleSummary article={eArt} />
                  </div>

                  <div className="pt-3 border-t border-[#ded7cb]/60 mt-auto">
                    <div className="text-[12px] text-[#716c64] mb-1">
                      {eArt.source} · {formatTimeAgo(eArt.publishedAt)}
                    </div>
                    <div className="text-[12px] text-[#c0152f] font-medium mb-3">
                      {articleReason(eArt)} · A different point of view
                    </div>

                    <div className="echo-actions flex flex-wrap items-center gap-2 text-[12px]">
                      <a
                        href={eArt.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleArticleOpen(eArt._id)}
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
      <footer className="max-w-[1340px] mx-auto px-4 sm:px-6 md:px-12 mt-16 pt-8 border-t border-[#ded7cb] text-[#716c64]">
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
