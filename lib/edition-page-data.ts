import { formatTopicName, extractInterestsMap } from "@/lib/format";

type DataRecord = Record<string, unknown>;
type ArticleItem = {
  _id: string;
  title: string;
  source: string;
  topic: string;
  summary?: string;
  snippet: string;
  image: string;
  url: string;
  publishedAt: string;
};

export function formatEditionDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function toEditionPageData(
  user: DataRecord,
  edition: DataRecord,
  feedback: { likedArticles: Record<string, boolean>; skippedArticles: Record<string, boolean> } = {
    likedArticles: {},
    skippedArticles: {},
  },
) {
  const userId = user._id;
  const userName = typeof user.name === "string" ? user.name : "Reader";
  const editionId = edition._id;
  const editionDate = typeof edition.date === "string" ? edition.date : "";
  const layout = (edition.layout && typeof edition.layout === "object" ? edition.layout : {}) as DataRecord;
  const interests = Object.entries(extractInterestsMap(user.interests))
    .map(([topic, weight]) => ({
      topic,
      displayName: formatTopicName(topic),
      weight: typeof weight === "number" ? Math.round(weight * 100) : 20,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const formatArticle = (value: unknown): ArticleItem | null => {
    if (!value || typeof value !== "object") return null;
    const doc = value as DataRecord;
    return {
      _id: doc._id ? String(doc._id) : "",
      title: typeof doc.title === "string" ? doc.title : "",
      source: typeof doc.source === "string" ? doc.source : "",
      topic: typeof doc.topic === "string" ? doc.topic : "tech",
      summary: typeof doc.summary === "string" ? doc.summary : "",
      snippet: typeof doc.snippet === "string" ? doc.snippet : "",
      image: typeof doc.image === "string" ? doc.image : "",
      url: typeof doc.url === "string" ? doc.url : "#",
      publishedAt: doc.publishedAt ? new Date(String(doc.publishedAt)).toISOString() : "",
    };
  };
  const formatArticles = (value: unknown): ArticleItem[] =>
    Array.isArray(value)
      ? value.map(formatArticle).filter((article): article is ArticleItem => article !== null)
      : [];

  return {
    user: { id: String(userId), name: userName, interests },
    edition: {
      id: String(editionId),
      date: formatEditionDate(editionDate),
      number: typeof edition.number === "number" ? edition.number : 1,
      threeThings: Array.isArray(edition.threeThings) ? edition.threeThings.filter((item): item is string => typeof item === "string") : [],
      personalization: (() => {
        const raw = edition.personalization as DataRecord | undefined;
        if (!raw) return null;
        const rawChanges = Array.isArray(raw.changes) ? raw.changes : [];
        const changes = rawChanges.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const change = item as DataRecord;
          if (typeof change.topic !== "string" || typeof change.delta !== "number") return [];
          return [{
            topic: change.topic,
            displayName: formatTopicName(change.topic),
            delta: change.delta,
            likes: typeof change.likes === "number" ? change.likes : 0,
            skips: typeof change.skips === "number" ? change.skips : 0,
          }];
        });
        const rawReasons = raw.storyReasons;
        const storyReasons = rawReasons instanceof Map
          ? Object.fromEntries(rawReasons)
          : rawReasons && typeof rawReasons === "object" ? rawReasons as Record<string, string> : {};
        return {
          changes,
          explanation: typeof raw.explanation === "string" ? raw.explanation : "",
          storyReasons,
        };
      })(),
      feedback,
      layout: {
        lead: formatArticle(layout.lead),
        secondary: formatArticles(layout.secondary),
        briefs: formatArticles(layout.briefs),
        echo: formatArticles(layout.echo),
      },
    },
  };
}
