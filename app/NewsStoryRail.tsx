"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimeAgo, formatTopicName } from "@/lib/format";

interface NewsStory {
  id: string;
  title: string;
  source: string;
  topic: string;
  summary: string;
  image: string;
  url: string;
  publishedAt: string;
}

export default function NewsStoryRail() {
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, "like" | "skip">>({});
  const pendingReadRef = useRef<{ story: NewsStory; hiddenAt: number | null; timeoutId: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stories", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load stories.");
        if (!cancelled) setStories(data.stories || []);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load stories.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (activeIndex === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((index) => index === null ? null : Math.min(stories.length - 1, index + 1));
      if (event.key === "ArrowLeft") setActiveIndex((index) => index === null ? null : Math.max(0, index - 1));
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeIndex, stories.length]);

  const sendFeedback = useCallback(async (story: NewsStory, type: "like" | "skip" | "click" | "read") => {
    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: story.id, type }),
      });
      if (!res.ok) throw new Error("Feedback request failed");
      setFeedbackError("");
      if (type === "like" || type === "skip") {
        setFeedback((current) => ({ ...current, [story.id]: type }));
      }
    } catch {
      setFeedbackError("Could not save your feedback. Please try again.");
    }
  }, []);

  const handleStoryOpen = (story: NewsStory) => {
    void sendFeedback(story, "click");
    if (pendingReadRef.current?.timeoutId !== null && pendingReadRef.current?.timeoutId !== undefined) {
      window.clearTimeout(pendingReadRef.current.timeoutId);
    }
    const pendingRead = { story, hiddenAt: null as number | null, timeoutId: null as number | null };
    pendingReadRef.current = pendingRead;
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
        void sendFeedback(pendingRead.story, "read");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pendingReadRef.current?.timeoutId !== null && pendingReadRef.current?.timeoutId !== undefined) {
        window.clearTimeout(pendingReadRef.current.timeoutId);
      }
    };
  }, [sendFeedback]);

  const activeStory = activeIndex === null ? null : stories[activeIndex];

  return (
    <>
      <section className="print:hidden mx-auto max-w-[1340px] px-4 sm:px-6 md:px-12 pt-4 sm:pt-5" aria-label="Recent stories picked for you">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#c0152f] uppercase">THE LATEST, FOR YOU</p>
            <h2 className="font-serif text-[19px] text-[#1a1917]">Stories to catch up on</h2>
          </div>
          {stories.length > 0 && <span className="text-[10px] uppercase tracking-[0.12em] text-[#716c64]">Past 7 days</span>}
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden pb-2" aria-label="Loading recent stories">
            {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-[76px] w-[76px] shrink-0 animate-pulse rounded-full bg-[#e8e2d5]" />)}
          </div>
        ) : stories.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stories.map((story, index) => (
              <button
                key={story.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Open ${formatTopicName(story.topic)} story: ${story.title}`}
                className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center"
              >
                <span className="h-[76px] w-[76px] rounded-full bg-gradient-to-br from-[#c0152f] via-[#e67839] to-[#e8bd58] p-[2px] transition-transform group-hover:scale-[1.04]">
                  <span className="block h-full w-full rounded-full border-[3px] border-[#f5f0e6] bg-[#eee8dc] p-[2px]">
                    {story.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={story.image} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-full bg-[#ded7cb] font-serif text-xl text-[#c0152f]">{formatTopicName(story.topic).slice(0, 1)}</span>
                    )}
                  </span>
                </span>
                <span className="w-full truncate text-[10px] font-medium text-[#4e4942]">{formatTopicName(story.topic)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="border-b border-[#ded7cb] pb-4 text-[12px] text-[#716c64]">
            {error || "No recent stories in your interests yet. Like articles or choose topics to see them here."}
          </p>
        )}
      </section>

      {activeStory && activeIndex !== null && (
        <div
          className="print:hidden fixed inset-0 z-[70] flex items-center justify-center bg-[#171513]/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="News story viewer"
          onClick={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }}
        >
          <div className="relative flex aspect-[9/16] max-h-[88vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[4px] bg-[#2a2723] text-white shadow-2xl">
            {activeStory.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeStory.image} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover opacity-65" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/5 to-black/90" />
            <div className="relative z-10 flex items-center gap-1.5 px-4 pt-4" aria-label={`Story ${activeIndex + 1} of ${stories.length}`}>
              {stories.map((story, index) => (
                <span key={story.id} className={`h-[3px] flex-1 rounded-full ${index <= activeIndex ? "bg-white" : "bg-white/35"}`} />
              ))}
            </div>

            <div className="relative z-10 flex items-center justify-between px-4 pt-4">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-wide">{activeStory.source}</p>
                <p className="mt-0.5 text-[10px] text-white/75">{formatTopicName(activeStory.topic)} · {formatTimeAgo(activeStory.publishedAt)}</p>
              </div>
              <button onClick={() => setActiveIndex(null)} className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/30 text-2xl leading-none" aria-label="Close story viewer">×</button>
            </div>

            <div className="relative z-10 mt-auto px-5 pb-6 pt-16">
              <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-[#ffb4a9] uppercase">{formatTopicName(activeStory.topic)} · PICKED FOR YOU</p>
              <h3 className="font-serif text-[29px] leading-[1.08] sm:text-[34px]">{activeStory.title}</h3>
              {activeStory.summary && <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-white/85">{activeStory.summary}</p>}
              {feedbackError && <p role="status" className="mt-3 text-[11px] text-[#ffd5ce]">{feedbackError}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a
                  href={activeStory.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleStoryOpen(activeStory)}
                  className="inline-flex min-h-10 items-center rounded-[2px] bg-white px-4 text-[12px] font-semibold text-[#1a1917]"
                >Read the full story ↗</a>
                <button onClick={() => { void sendFeedback(activeStory, "like"); }} aria-pressed={feedback[activeStory.id] === "like"} className="min-h-10 rounded-[2px] border border-white/50 px-3 text-[12px] aria-pressed:bg-[#c0152f]">Like</button>
                <button onClick={() => { void sendFeedback(activeStory, "skip"); }} aria-pressed={feedback[activeStory.id] === "skip"} className="min-h-10 rounded-[2px] border border-white/50 px-3 text-[12px] aria-pressed:bg-white/20">Less like this</button>
              </div>
            </div>

            {activeIndex > 0 && <button onClick={() => setActiveIndex(activeIndex - 1)} className="absolute left-0 top-1/3 z-20 h-1/3 w-10 text-3xl text-white/80" aria-label="Previous story">‹</button>}
            {activeIndex < stories.length - 1 && <button onClick={() => setActiveIndex(activeIndex + 1)} className="absolute right-0 top-1/3 z-20 h-1/3 w-10 text-3xl text-white/80" aria-label="Next story">›</button>}
          </div>
        </div>
      )}
    </>
  );
}
