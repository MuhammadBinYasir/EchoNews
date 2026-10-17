import Parser from "rss-parser";
import { connectDB } from "@/lib/mongo";
import { Article } from "@/models";
import { FEEDS, type FeedSource } from "@/lib/feeds";

/* ------------------------------------------------------------------ */
/* Parser setup (also grabs image-related custom fields)               */
/* ------------------------------------------------------------------ */

type CustomItem = {
    mediaContent?: { $?: { url?: string } } | { $?: { url?: string } }[];
    mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
    contentEncoded?: string;
};

const parser = new Parser<Record<string, never>, CustomItem>({
    timeout: 10_000,
    headers: { "User-Agent": "EchoNewsBot/1.0 (+hackathon project)" },
    customFields: {
        item: [
            ["media:content", "mediaContent"],
            ["media:thumbnail", "mediaThumbnail"],
            ["content:encoded", "contentEncoded"],
        ],
    },
});

const MAX_ITEMS_PER_FEED = 25;
const SNIPPET_LENGTH = 220;
const SOURCE_TEXT_LENGTH = 6_000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function decodeEntities(s: string): string {
    return s
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cleanText(html: string | undefined): string {
    if (!html) return "";
    const noTags = html.replace(/<[^>]*>/g, " ");
    return decodeEntities(noTags).replace(/\s+/g, " ").trim();
}

function trimTo(s: string, max: number): string {
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(" ") > 100 ? cut.lastIndexOf(" ") : max).trim() + "…";
}

function cleanImageUrl(raw: string | undefined): string | null {
    if (!raw) return null;
    let url = raw
        .replace(/&#0*38;/gi, "&")
        .replace(/&amp;/gi, "&")
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .trim();

    if (!/^https?:\/\//i.test(url)) return null;

    // Remove WordPress/CDN aggressive downscaling params if present
    url = url.replace(/(\?|&)(w|resize|fit)=\d+(%2C\d+)?/gi, "");
    return url;
}

function extractImage(item: Parser.Item & CustomItem): string | null {
    // 1. Enclosure (often full-res original)
    if (item.enclosure?.type?.startsWith("image") && item.enclosure.url) {
        const cleaned = cleanImageUrl(item.enclosure.url);
        if (cleaned) return cleaned;
    }

    // 2. Media Content (inspect array for largest or primary item)
    if (item.mediaContent) {
        const list = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
        for (const m of list) {
            const u = cleanImageUrl(m?.$?.url);
            if (u) return u;
        }
    }

    // 3. HTML body image
    const bodyImg = (item.contentEncoded || item.content || "").match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    if (bodyImg) {
        const cleaned = cleanImageUrl(bodyImg);
        if (cleaned) return cleaned;
    }

    // 4. Media Thumbnail as fallback
    if (item.mediaThumbnail) {
        const list = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [item.mediaThumbnail];
        for (const m of list) {
            const u = cleanImageUrl(m?.$?.url);
            if (u) return u;
        }
    }

    return null;
}

/* ------------------------------------------------------------------ */
/* Fetch one feed                                                      */
/* ------------------------------------------------------------------ */

async function fetchFeed(feed: FeedSource) {
    const parsed = await parser.parseURL(feed.url);

    return parsed.items
        .slice(0, MAX_ITEMS_PER_FEED)
        .filter((it) => it.link && it.title)
        .map((it) => {
            const published = it.isoDate ? new Date(it.isoDate) : new Date();
            const sourceText = trimTo(
                cleanText(it.contentEncoded || it.content || it.summary || it.contentSnippet || ""),
                SOURCE_TEXT_LENGTH
            );
            return {
                url: it.link!.trim(),
                title: cleanText(it.title),
                source: feed.source,
                topic: feed.topic,
                snippet: trimTo(sourceText, SNIPPET_LENGTH),
                sourceText,
                image: extractImage(it as Parser.Item & CustomItem),
                publishedAt: isNaN(published.getTime()) ? new Date() : published,
            };
        });
}

/* ------------------------------------------------------------------ */
/* Main: ingest all feeds                                              */
/* ------------------------------------------------------------------ */

export interface IngestReport {
    feedsOk: number;
    feedsFailed: number;
    fetched: number;
    inserted: number;
    failures: { source: string; url: string; error: string }[];
    totalInDb: number;
}

export async function ingestAll(): Promise<IngestReport> {
    await connectDB();

    // allSettled: one broken feed must never kill the whole run
    const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));

    const articles: Awaited<ReturnType<typeof fetchFeed>> = [];
    const failures: IngestReport["failures"] = [];

    results.forEach((r, i) => {
        if (r.status === "fulfilled") {
            articles.push(...r.value);
        } else {
            failures.push({
                source: FEEDS[i].source,
                url: FEEDS[i].url,
                error: r.reason instanceof Error ? r.reason.message : String(r.reason),
            });
        }
    });

    let inserted = 0;
    if (articles.length > 0) {
        // Refresh the publisher excerpt while preserving cached AI summaries.
        const ops = articles.map((a) => {
            const { sourceText, snippet, ...newArticle } = a;
            return {
                updateOne: {
                    filter: { url: a.url },
                    update: {
                        $set: { sourceText, snippet },
                        $setOnInsert: { ...newArticle, summary: "", fetchedAt: new Date() },
                    },
                    upsert: true,
                },
            };
        });
        const res = await Article.bulkWrite(ops, { ordered: false });
        inserted = res.upsertedCount;
    }

    return {
        feedsOk: FEEDS.length - failures.length,
        feedsFailed: failures.length,
        fetched: articles.length,
        inserted,
        failures,
        totalInDb: await Article.countDocuments(),
    };
}
