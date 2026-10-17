"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface TopicOption {
  id: "tech" | "ai" | "world" | "business" | "sports" | "science" | "health" | "culture";
  title: string;
  subtitle: string;
  icon: (color: string) => React.ReactNode;
}

interface ArticleCandidate {
  id: string;
  title: string;
  source: string;
  topic: string;
  snippet: string;
  image?: string | null;
  publishedAt?: string;
  isFromInterests: boolean;
}

const TOPICS_DATA: TopicOption[] = [
  {
    id: "tech",
    title: "Tech",
    subtitle: "What comes next",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
      </svg>
    ),
  },
  {
    id: "ai",
    title: "AI",
    subtitle: "Intelligence, explored",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l2.4 5 5.6 1.4-4 4.2 1 5.4-5-2.7-5 2.7 1-5.4-4-4.2 5.6-1.4z" />
        <path d="M19 15l1.2 2.5 2.8.7-2 2.1.5 2.7-2.5-1.3-2.5 1.3.5-2.7-2-2.1 2.8-.7z" />
      </svg>
    ),
  },
  {
    id: "world",
    title: "World",
    subtitle: "A wider perspective",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    id: "business",
    title: "Business",
    subtitle: "Ideas at work",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
        <path d="M14 9h5v5" />
      </svg>
    ),
  },
  {
    id: "sports",
    title: "Sports",
    subtitle: "Beyond the score",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
        <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" />
      </svg>
    ),
  },
  {
    id: "science",
    title: "Science",
    subtitle: "Stay curious",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" />
      </svg>
    ),
  },
  {
    id: "health",
    title: "Health",
    subtitle: "Living well",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    id: "culture",
    title: "Culture",
    subtitle: "The way we live",
    icon: (color) => (
      <svg
        className="w-5 h-5 transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 10s3-3 5-3 5 3 5 3 3-3 5-3 5 3 5 3" />
        <path d="M4 10v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
];

const OnboardingPage = () => {
  const router = useRouter();

  // Multi-step state: 1 (Masthead & Topics) or 2 (Tapping Headlines)
  const [step, setStep] = useState<1 | 2>(1);

  // User input state (kept in client memory across steps)
  const [name, setName] = useState("Alex");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "tech",
    "ai",
    "science",
  ]);

  // Step 2 Dynamic Single Article review state
  const [currentArticle, setCurrentArticle] = useState<ArticleCandidate | null>(null);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [seenArticleIds, setSeenArticleIds] = useState<string[]>([]);
  const [likedArticleIds, setLikedArticleIds] = useState<string[]>([]);
  const [dislikedArticleIds, setDislikedArticleIds] = useState<string[]>([]);
  const [rotationSeed, setRotationSeed] = useState("");
  const [articlesLoading, setArticlesLoading] = useState(false);

  // Submission & UI status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectedCount = selectedTopics.length;
  const isStep1Eligible = name.trim().length > 0 && selectedCount >= 3;

  const getSelectedTopicNames = () => {
    const names = selectedTopics.map((id) => {
      const found = TOPICS_DATA.find((t) => t.id === id);
      return found ? found.title : id;
    });
    if (names.length === 0) return "";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  };

  // Helper to fetch the next article based on dynamic likes/dislikes
  const fetchNextArticle = async (
    currentSeen: string[],
    currentLikes: string[],
    currentDislikes: string[],
    currentSeed = rotationSeed
  ) => {
    setArticlesLoading(true);
    try {
      const res = await fetch("/api/onboarding/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: selectedTopics,
          seenIds: currentSeen,
          likedIds: currentLikes,
          dislikedIds: currentDislikes,
          rotationSeed: currentSeed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load next headline.");
      }

      if (data.article) {
        if (data.rotationSeed) setRotationSeed(data.rotationSeed);
        setCurrentArticle(data.article);
      } else {
        // No more candidates, finish onboarding
        finalizeOnboarding(currentLikes, currentDislikes);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Error loading headline."
      );
    } finally {
      setArticlesLoading(false);
    }
  };

  // Transition from Step 1 to Step 2: fetch the first single article
  const handleProceedToStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep1Eligible) {
      if (!name.trim()) {
        setError("Please enter your name for the masthead.");
      } else {
        setError("Please select at least 3 topics of interest.");
      }
      return;
    }

    setError(null);
    setHeadlineIndex(0);
    setSeenArticleIds([]);
    setLikedArticleIds([]);
    setDislikedArticleIds([]);
    setRotationSeed("");
    setStep(2);

    await fetchNextArticle([], [], [], "");
  };

  // Submit all state in one final single request (weights: 0.7 selected, 0.2 others, +0.15 per liked article)
  const finalizeOnboarding = async (
    finalLikes: string[] = likedArticleIds,
    finalDislikes: string[] = dislikedArticleIds
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          topics: selectedTopics,
          likedArticleIds: finalLikes,
          dislikedArticleIds: finalDislikes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create your profile.");
      }

      setSuccess(true);
      setTimeout(() => {
      router.push("/today");
      }, 1400);
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Something went wrong saving your profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Like: boosts matching articles for next selection
  const handleLike = () => {
    if (!currentArticle) return;
    const currentId = currentArticle.id;
    const updatedSeen = [...seenArticleIds, currentId];
    const updatedLikes = [...likedArticleIds, currentId];

    setSeenArticleIds(updatedSeen);
    setLikedArticleIds(updatedLikes);

    if (headlineIndex + 1 < 8) {
      setHeadlineIndex((prev) => prev + 1);
      fetchNextArticle(updatedSeen, updatedLikes, dislikedArticleIds);
    } else {
      finalizeOnboarding(updatedLikes, dislikedArticleIds);
    }
  };

  // Handle Dislike: ignores/demotes that type for next selection
  const handleDislike = () => {
    if (!currentArticle) return;
    const currentId = currentArticle.id;
    const updatedSeen = [...seenArticleIds, currentId];
    const updatedDislikes = [...dislikedArticleIds, currentId];

    setSeenArticleIds(updatedSeen);
    setDislikedArticleIds(updatedDislikes);

    if (headlineIndex + 1 < 8) {
      setHeadlineIndex((prev) => prev + 1);
      fetchNextArticle(updatedSeen, likedArticleIds, updatedDislikes);
    } else {
      finalizeOnboarding(likedArticleIds, updatedDislikes);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e6] text-[#1a1917] flex flex-col font-sans selection:bg-[#c0152f] selection:text-white">
      {/* Top Masthead Navigation Bar */}
      <header className="w-full border-b border-[#ded7cb] bg-[#f5f0e6]/90 backdrop-blur-xs sticky top-0 z-20">
        <div className="max-w-[1340px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-serif text-[28px] font-bold tracking-tight text-[#1a1917]">
              Echo<span className="text-[#c0152f]">.</span>
            </span>
          </div>
          <span className="text-[11px] font-medium tracking-[0.22em] text-[#716c64] uppercase">
            YOUR DAILY, REIMAGINED
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1340px] w-full mx-auto px-6 md:px-12 py-10 md:py-14">
        {step === 1 ? (
          /* ========================================================================= */
          /* STEP 1 OF 2: MASTHEAD & TOPIC SELECTION                                   */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Hero Manifesto + Newspaper Miniature Preview */}
            <section className="lg:col-span-5 flex flex-col">
              <div className="mb-4">
                <span className="text-[11px] font-bold tracking-[0.16em] text-[#c0152f] uppercase block mb-3">
                  A NEW MORNING RITUAL
                </span>
                <h1 className="font-serif text-[42px] sm:text-[50px] lg:text-[54px] leading-[1.08] font-normal text-[#1a1917] tracking-tight">
                  A world of <br />
                  news. Your <br />
                  point of view.
                </h1>
              </div>

              <p className="text-[15px] sm:text-[16px] text-[#6b655b] leading-[1.65] max-w-[420px] mb-10">
                Less noise. More meaning. A daily newspaper shaped around your curiosity, with room for a little surprise.
              </p>

              {/* Mini Newspaper Card Preview */}
              <div className="bg-[#ffffff] border border-[#ded7cb] p-5 sm:p-6 max-w-[400px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[2px] transition-all hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between pb-2.5">
                  <span className="font-serif text-[18px] font-bold text-[#1a1917] tracking-tight">
                    Echo<span className="text-[#c0152f]">.</span>
                  </span>
                  <span className="text-[9px] font-semibold tracking-[0.2em] text-[#716c64] uppercase">
                    MADE FOR YOU
                  </span>
                </div>

                <div className="w-full h-[1px] bg-[#ded7cb] mb-3.5" />

                <div className="relative w-full aspect-16/10 bg-[#e8e2d5] overflow-hidden mb-4">
                  <Image
                    src="/vintage_workshop_radio.jpg"
                    alt="A desk with tools and radio"
                    fill
                    sizes="(max-width: 640px) 100vw, 400px"
                    className="object-cover"
                    priority
                  />
                </div>

                <h2 className="font-serif text-[20px] sm:text-[22px] leading-[1.25] text-[#1a1917] font-normal tracking-tight">
                  The future might be something we can fix.
                </h2>
                <p className="text-[11px] text-[#716c64] mt-2">
                  A fresh edition. A familiar feeling. Every morning.
                </p>
              </div>
            </section>

            {/* Right Column: Step 1 Form */}
            <section className="lg:col-span-7 flex flex-col lg:pl-4">
              {/* Step Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-[11px] mb-2.5">
                  <span className="font-bold tracking-[0.16em] text-[#c0152f] uppercase">
                    YOUR FIRST EDITION
                  </span>
                  <span className="text-[#716c64] font-medium">Step 1 of 2</span>
                </div>

                {/* Progress Line */}
                <div className="w-full h-[2px] bg-[#ded7cb] relative overflow-hidden">
                  <div className="w-1/2 h-full bg-[#c0152f] transition-all duration-300" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-8">
                <h2 className="font-serif text-[36px] sm:text-[42px] leading-tight font-normal text-[#1a1917] tracking-tight">
                  First, make it yours.
                </h2>
                <p className="text-[14px] sm:text-[15px] text-[#6b655b] mt-1.5">
                  A name for the masthead. A few things you care about.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleProceedToStep2} className="flex flex-col space-y-7">
                {/* Name Input Field */}
                <div className="flex flex-col">
                  <label
                    htmlFor="user-name"
                    className="text-[13px] font-semibold text-[#1a1917] mb-2"
                  >
                    What should we call you?
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex"
                    className="w-full bg-[#fcfaf7] border border-[#1a1917] px-4 py-3 text-[16px] text-[#1a1917] placeholder:text-[#a09a8e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a1917] transition-colors rounded-[2px]"
                    required
                  />
                </div>

                {/* Topics Grid Field */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-semibold text-[#1a1917]">
                      What draws you in?
                    </span>
                    <span className="text-[11px] text-[#716c64]">
                      Choose 3 or more
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TOPICS_DATA.map((topic) => {
                      const isSelected = selectedTopics.includes(topic.id);
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => toggleTopic(topic.id)}
                          className={`group relative text-left p-3.5 h-[126px] flex flex-col justify-between border rounded-[2px] transition-all cursor-pointer ${isSelected
                            ? "bg-[#fae9e7] border-[#c0152f] shadow-xs"
                            : "bg-[#f5f0e6] hover:bg-[#efe9dd] border-[#ded7cb]"
                            }`}
                        >
                          <div className="flex items-start justify-between w-full">
                            {topic.icon(isSelected ? "#c0152f" : "#2a2723")}
                            <span
                              className={`text-[13px] font-medium leading-none ${isSelected ? "text-[#c0152f]" : "text-[#716c64]"
                                }`}
                            >
                              {isSelected ? "✓" : "+"}
                            </span>
                          </div>

                          <div className="mt-auto">
                            <h3 className="font-serif text-[17px] leading-tight font-normal text-[#1a1917]">
                              {topic.title}
                            </h3>
                            <p className="text-[11px] text-[#716c64] leading-tight mt-1 line-clamp-1">
                              {topic.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Count & Topic Summary */}
                <div className="min-h-[22px] flex items-center text-[12px]">
                  {selectedCount >= 3 ? (
                    <p className="text-[#2a2723] flex items-center gap-1.5 font-medium">
                      <span className="text-[#c0152f] font-bold">✓</span>
                      <span>
                        {selectedCount} selected · {getSelectedTopicNames()}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[#c0152f] text-[12px]">
                      Select {3 - selectedCount} more to reach the minimum of 3 topics.
                    </p>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-[#c0152f] text-[13px] rounded-[2px]">
                    {error}
                  </div>
                )}

                {/* Action Button */}
                <div className="flex flex-col space-y-3">
                  <button
                    type="submit"
                    disabled={!isStep1Eligible || articlesLoading}
                    className="w-full bg-[#c0152f] hover:bg-[#a31126] active:bg-[#8e0e20] text-white font-medium text-[15px] py-3.5 px-6 rounded-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    {articlesLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Curating headlines from your interests...
                      </span>
                    ) : (
                      <span>Find my headlines →</span>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-[#716c64]">
                    Your curiosity is yours. Change your interests anytime.
                  </p>
                </div>
              </form>
            </section>
          </div>
        ) : (
          /* ========================================================================= */
          /* STEP 2 OF 2: WHAT CATCHES YOUR EYE? (ARTICLE TASTE REFINEMENT)            */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Manifesto & Selected Topics Summary */}
            <section className="lg:col-span-5 flex flex-col">
              <div className="mb-4">
                <span className="text-[11px] font-bold tracking-[0.16em] text-[#c0152f] uppercase block mb-3">
                  A NEW MORNING RITUAL
                </span>
                <h1 className="font-serif text-[42px] sm:text-[50px] lg:text-[54px] leading-[1.08] font-normal text-[#1a1917] tracking-tight">
                  Good stories. <br />
                  Your kind of <br />
                  interesting.
                </h1>
              </div>

              <p className="text-[15px] sm:text-[16px] text-[#6b655b] leading-[1.65] max-w-[420px] mb-8">
                A few headlines, a few first impressions. Help us find the stories you&apos;ll want to make time for, {name}.
              </p>

              {/* Curiosity So Far Pills */}
              <div className="mb-8">
                <span className="text-[10px] font-bold tracking-[0.18em] text-[#716c64] uppercase block mb-3">
                  YOUR CURIOSITY, SO FAR
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedTopics.map((id) => {
                    const topic = TOPICS_DATA.find((t) => t.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fcfaf7] border border-[#ded7cb] text-[12px] text-[#1a1917] rounded-[2px]"
                      >
                        <span className="text-[#c0152f] text-[11px] font-bold">✓</span>
                        {topic ? topic.title : id}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-[1px] bg-[#ded7cb] mb-8" />

              {/* Filter Bubble Philosophy */}
              <div className="mb-8">
                <h3 className="font-serif italic text-[20px] sm:text-[22px] text-[#1a1917] font-normal leading-snug mb-2">
                  A starting point. Not a filter bubble.
                </h3>
                <p className="text-[13px] sm:text-[14px] text-[#6b655b] leading-[1.6] max-w-[400px]">
                  Your edition will follow your interests — and leave room for something unexpected. You can refine it anytime.
                </p>
              </div>

              {/* Back to Interests */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 text-[13px] text-[#716c64] hover:text-[#1a1917] transition-colors cursor-pointer self-start"
              >
                <span>←</span>
                <span>Back to your interests</span>
              </button>
            </section>

            {/* Right Column: Interactive Card Stack for Tapping Headlines */}
            <section className="lg:col-span-7 flex flex-col lg:pl-4">
              {/* Step Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-[11px] mb-2.5">
                  <span className="font-bold tracking-[0.16em] text-[#c0152f] uppercase">
                    YOUR FIRST EDITION
                  </span>
                  <span className="text-[#716c64] font-medium">Step 2 of 2</span>
                </div>

                {/* Fully filled progress line */}
                <div className="w-full h-[2px] bg-[#c0152f]" />
              </div>

              {/* Section Title */}
              <div className="mb-6">
                <h2 className="font-serif text-[36px] sm:text-[42px] leading-tight font-normal text-[#1a1917] tracking-tight">
                  What catches your eye, {name}?
                </h2>
                <p className="text-[14px] sm:text-[15px] text-[#6b655b] mt-1.5">
                  Like it or leave it. Quick reads to help us get to know your taste.
                </p>
              </div>

              {/* Content Loading State */}
              {articlesLoading ? (
                <div className="bg-white border border-[#ded7cb] p-12 text-center rounded-[2px] min-h-[420px] flex flex-col items-center justify-center">
                  <svg
                    className="animate-spin h-7 w-7 text-[#c0152f] mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <p className="font-serif text-[18px] text-[#1a1917]">
                    Curating your next headline...
                  </p>
                  <p className="text-[12px] text-[#716c64] mt-1">
                    Matching articles to your likes and refining your taste profile.
                  </p>
                </div>
              ) : currentArticle ? (
                <div className="flex flex-col">
                  {/* Card Stack Envelope */}
                  <div className="relative mb-6">
                    {/* Background Stack Paper Effect Layer 2 */}
                    <div className="absolute inset-0 bg-[#e6dfd2] border border-[#d2c9bc] rounded-[2px] translate-x-2 translate-y-3 rotate-1 opacity-70 pointer-events-none" />

                    {/* Background Stack Paper Effect Layer 1 */}
                    <div className="absolute inset-0 bg-[#eee8dc] border border-[#ded7cb] rounded-[2px] translate-x-1 translate-y-1.5 -rotate-0.5 opacity-90 pointer-events-none" />

                    {/* Main Interactive Headline Card */}
                    <div className="relative bg-[#ffffff] border border-[#ded7cb] rounded-[2px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden transition-all">
                      {/* Top Bar over Card */}
                      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between text-[11px]">
                        <span className="font-mono uppercase tracking-[0.14em] text-[#716c64]">
                          HEADLINE {String(headlineIndex + 1).padStart(2, "0")} / 08
                        </span>
                        <span className="font-serif italic text-[#716c64] text-[12px]">
                          {currentArticle.isFromInterests
                            ? "Picked from your interests"
                            : "Something unexpected"}
                        </span>
                      </div>

                      {/* Article Image */}
                      <div className="relative w-full aspect-16/9 bg-[#e8e2d5] overflow-hidden">
                        {currentArticle.image && (
                          <img
                            src={currentArticle.image}
                            alt={currentArticle.title}
                            referrerPolicy="no-referrer"
                            loading="eager"
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                            onError={(e) => {
                              // Clean fallback if third party blocks direct image loading
                              const img = e.currentTarget as HTMLImageElement;
                              if (!img.src.includes("/vintage_workshop_radio.jpg")) {
                                img.src = "/vintage_workshop_radio.jpg";
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* Card Content Body */}
                      <div className="p-6">
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.16em] uppercase mb-2.5">
                          <span className="text-[#c0152f]">
                            {currentArticle.topic.toUpperCase()} · {currentArticle.source.toUpperCase()}
                          </span>
                          <span className="text-[#716c64] font-medium tracking-[0.1em]">
                            5 MIN READ
                          </span>
                        </div>

                        <h3 className="font-serif text-[24px] sm:text-[28px] leading-[1.2] text-[#1a1917] font-normal tracking-tight mb-3">
                          {currentArticle.title}
                        </h3>

                        {currentArticle.snippet && (
                          <p className="text-[14px] text-[#6b655b] leading-[1.6] line-clamp-3 mb-6">
                            {currentArticle.snippet}
                          </p>
                        )}

                        <div className="pt-3 border-t border-[#ded7cb]/60 flex items-center justify-between text-[11px] text-[#716c64]">
                          <span>By {currentArticle.source}</span>
                          <span className="font-serif font-bold text-[#1a1917] text-[13px]">
                            Echo<span className="text-[#c0152f]">.</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Action Buttons (Dislike / Like) */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleDislike}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[#fcfaf7] hover:bg-[#efe9dd] active:bg-[#e4ddce] border border-[#ded7cb] text-[#1a1917] font-medium text-[14px] rounded-[2px] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <svg
                        className="w-4 h-4 text-[#716c64]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 14V2" />
                        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                      </svg>
                      <span>Dislike article</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLike}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[#c0152f] hover:bg-[#a31126] active:bg-[#8e0e20] text-white font-medium text-[14px] rounded-[2px] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 10v12" />
                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                      </svg>
                      <span>Like article</span>
                    </button>
                  </div>

                  <p className="text-center text-[11px] text-[#716c64] mt-3">
                    No right answers. Just your point of view.
                  </p>

                  {/* Skip for now button */}
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => finalizeOnboarding(likedArticleIds, dislikedArticleIds)}
                      disabled={submitting}
                      className="text-[12px] text-[#716c64] hover:text-[#1a1917] underline underline-offset-4 cursor-pointer transition-colors"
                    >
                      Skip for now — take me to my edition
                    </button>
                  </div>
                </div>
              ) : (
                /* Fallback if articles array finished */
                <div className="bg-white border border-[#ded7cb] p-10 text-center rounded-[2px]">
                  <p className="font-serif text-[22px] text-[#1a1917] mb-2">
                    You&apos;ve reviewed all headlines!
                  </p>
                  <p className="text-[13px] text-[#716c64] mb-6">
                    We&apos;ve mapped your taste profile across {likedArticleIds.length} liked articles.
                  </p>
                  <button
                    type="button"
                    onClick={() => finalizeOnboarding(likedArticleIds, dislikedArticleIds)}
                    disabled={submitting}
                    className="bg-[#c0152f] hover:bg-[#a31126] text-white px-6 py-3 rounded-[2px] font-medium text-[14px]"
                  >
                    {submitting ? "Creating your edition..." : "Generate my personalized edition →"}
                  </button>
                </div>
              )}

              {/* Submission status alert */}
              {submitting && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-[#c0152f] text-[13px] rounded-[2px] flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Setting up your edition with your taste profile...</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] rounded-[2px] flex items-center justify-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Welcome aboard, {name}! Your edition is ready. Redirecting...</span>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-[#c0152f] text-[13px] rounded-[2px]">
                  {error}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Bottom Newspaper Footer */}
      <footer className="w-full border-t border-[#ded7cb] bg-[#f5f0e6] mt-auto">
        <div className="max-w-[1340px] mx-auto px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#716c64]">
          <p className="font-serif italic text-[15px] text-[#2a2723]">
            The news that speaks to you.
          </p>
          <p className="text-[11px] tracking-wide">
            An independent voice. An informed tomorrow.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingPage;
