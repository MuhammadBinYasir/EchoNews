import type { Topic } from "@/models";

export interface FeedSource {
    topic: Topic;
    source: string;
    url: string;
}

// NOTE: feed URLs change over time. Open each in a browser to verify.
// A broken feed will NOT crash ingestion (it is reported in the /api/ingest response).
export const FEEDS: FeedSource[] = [
    // ---- TECH ----
    { topic: "tech", source: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { topic: "tech", source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { topic: "tech", source: "Hacker News", url: "https://hnrss.org/frontpage" },
    { topic: "tech", source: "TechCrunch", url: "https://techcrunch.com/feed/" },

    // ---- AI ----
    { topic: "ai", source: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
    { topic: "ai", source: "VentureBeat", url: "https://venturebeat.com/category/ai/feed/" },
    { topic: "ai", source: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },

    // ---- WORLD ----
    { topic: "world", source: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { topic: "world", source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
    { topic: "world", source: "NPR", url: "https://feeds.npr.org/1004/rss.xml" },

    // ---- BUSINESS ----
    { topic: "business", source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
    { topic: "business", source: "CNBC", url: "https://www.cnbc.com/id/10001147/device/rss/rss.html" },
    { topic: "business", source: "NPR Business", url: "https://feeds.npr.org/1006/rss.xml" },

    // ---- SPORTS ----
    { topic: "sports", source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" },
    { topic: "sports", source: "ESPN", url: "https://www.espn.com/espn/rss/news" },
    { topic: "sports", source: "The Guardian Sport", url: "https://www.theguardian.com/sport/rss" },

    // ---- SCIENCE ----
    { topic: "science", source: "Nature", url: "https://www.nature.com/nature.rss" },
    { topic: "science", source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml" },
    { topic: "science", source: "BBC Science", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },

    // ---- HEALTH ----
    { topic: "health", source: "BBC Health", url: "https://feeds.bbci.co.uk/news/health/rss.xml" },
    { topic: "health", source: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml" },
    { topic: "health", source: "ScienceDaily Health", url: "https://www.sciencedaily.com/rss/health_medicine.xml" },

    // ---- CULTURE ----
    { topic: "culture", source: "The Guardian Culture", url: "https://www.theguardian.com/culture/rss" },
    { topic: "culture", source: "BBC Arts", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml" },
    { topic: "culture", source: "NPR Arts", url: "https://feeds.npr.org/1008/rss.xml" },
];