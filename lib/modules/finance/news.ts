const RSS2JSON_BASE = "https://api.rss2json.com/v1/api.json";

const NEWS_FEEDS: Record<string, { url: string; label: string }> = {
  top: {
    url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
    label: "Top Stories",
  },
  world: {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    label: "World",
  },
  business: {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    label: "Business",
  },
  tech: {
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    label: "Technology",
  },
  science: {
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    label: "Science",
  },
};

export const NEWS_CATEGORIES = Object.entries(NEWS_FEEDS).map(
  ([value, { label }]) => ({ value, label })
);

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  thumbnail?: string;
}

interface Rss2JsonItem {
  title?: string;
  link?: string;
  pubDate?: string;
  author?: string;
  thumbnail?: string;
  enclosure?: { link?: string };
}

interface NewsCache {
  data: NewsArticle[];
  timestamp: number;
}

const cache = new Map<string, NewsCache>();
const CACHE_TTL_MS = 5 * 60_000;

function extractSource(title: string): { headline: string; source: string } {
  const sep = title.lastIndexOf(" - ");
  if (sep > 0) {
    return {
      headline: title.slice(0, sep).trim(),
      source: title.slice(sep + 3).trim(),
    };
  }
  return { headline: title, source: "" };
}

export async function fetchNews(
  category = "top"
): Promise<NewsArticle[]> {
  const cached = cache.get(category);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const feed = NEWS_FEEDS[category] ?? NEWS_FEEDS.top;
  const url = `${RSS2JSON_BASE}?rss_url=${encodeURIComponent(feed.url)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    if (cached) return cached.data;
    throw new Error(`RSS fetch failed: ${res.status}`);
  }

  const json = await res.json();
  if (json.status !== "ok" || !Array.isArray(json.items)) {
    if (cached) return cached.data;
    throw new Error("Invalid RSS response");
  }

  const articles: NewsArticle[] = (json.items as Rss2JsonItem[]).map(
    (item) => {
      const { headline, source } = extractSource(item.title ?? "");
      return {
        title: headline,
        link: item.link ?? "",
        pubDate: item.pubDate ?? "",
        source: source || item.author || feed.label,
        thumbnail: item.thumbnail || item.enclosure?.link || undefined,
      };
    }
  );

  cache.set(category, { data: articles, timestamp: Date.now() });
  return articles;
}
