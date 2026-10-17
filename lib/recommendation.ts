export interface RecommendationCandidate {
  topic: string;
  title?: string;
  publishedAt: Date | string | number;
  image?: string | null;
  snippet?: string | null;
}

const HEADLINE_STOP_WORDS = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "with"]);

export function removeNearDuplicateHeadlines<T extends { title?: string }>(articles: readonly T[]): T[] {
  const kept: Array<{ article: T; tokens: Set<string> }> = [];
  for (const article of articles) {
    const tokens = new Set((article.title || "").toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !HEADLINE_STOP_WORDS.has(token)));
    if (!tokens.size) {
      kept.push({ article, tokens });
      continue;
    }
    const duplicate = kept.some(({ tokens: previous }) => {
      if (!previous.size) return false;
      const overlap = [...tokens].filter((token) => previous.has(token)).length;
      return overlap / (tokens.size + previous.size - overlap) >= 0.82;
    });
    if (!duplicate) kept.push({ article, tokens });
  }
  return kept.map(({ article }) => article);
}

export function getTopicPriorities<Topic extends string>(
  topics: readonly Topic[],
  interests: Partial<Record<Topic, number>>
) {
  const weights = topics.map((topic) => ({ topic, weight: interests[topic] ?? 0.2 }))
    .sort((a, b) => b.weight - a.weight);
  const preferred = weights.filter(({ weight }) => weight > 0.2).map(({ topic }) => topic);
  const primary = preferred.length ? preferred : weights.slice(0, 3).map(({ topic }) => topic);
  const unpreferred = weights.filter(({ topic }) => !primary.includes(topic))
    .sort((a, b) => a.weight - b.weight);
  const discovery = unpreferred.length
    ? unpreferred.slice(0, 3).map(({ topic }) => topic)
    : weights.slice(-3).map(({ topic }) => topic);
  return { primary, discovery };
}

export function rankArticlesByPreference<T extends RecommendationCandidate>(
  articles: readonly T[],
  interests: Readonly<Record<string, number>>,
  now = Date.now()
): T[] {
  const ranked = articles
    .map((article, index) => {
      const weight = interests[article.topic] ?? 0.2;
      const ageHours = Math.max(0, (now - new Date(article.publishedAt).getTime()) / 3_600_000);
      const freshness = Number.isFinite(ageHours) ? Math.max(0, 1 - ageHours / (24 * 10)) : 0;
      const presentation = (article.image ? 0.025 : 0) + (article.snippet ? 0.015 : 0);
      return { article, index, score: weight + freshness * 0.12 + presentation };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ article }) => article);
  return removeNearDuplicateHeadlines(ranked);
}
