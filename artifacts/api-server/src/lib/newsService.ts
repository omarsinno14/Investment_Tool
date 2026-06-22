/**
 * newsService.ts
 * Fetches investment/business headlines from public RSS feeds.
 * Caches results in-memory for CACHE_TTL_MS to avoid hammering sources.
 */

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  fetchedAt: string;
  tags: string[];
  countryTags: string[];
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  items: NewsItem[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

// ─── Curated RSS sources ──────────────────────────────────────────────────────
const GLOBAL_FEEDS: { url: string; source: string; tags: string[]; countries: string[] }[] = [
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    source: "BBC Business",
    tags: ["Business", "Markets", "Economy"],
    countries: [],
  },
  {
    url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    source: "CNBC",
    tags: ["Finance", "Markets", "Investing"],
    countries: ["United States"],
  },
  {
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    source: "MarketWatch",
    tags: ["Markets", "Stocks", "Finance"],
    countries: ["United States"],
  },
  {
    url: "https://www.ft.com/rss/home",
    source: "Financial Times",
    tags: ["Finance", "Economy", "Business"],
    countries: [],
  },
  {
    url: "https://www.theguardian.com/business/rss",
    source: "The Guardian",
    tags: ["Business", "Economy"],
    countries: ["United Kingdom"],
  },
  {
    url: "https://businessday.ng/feed/",
    source: "BusinessDay Nigeria",
    tags: ["Business", "Startups", "Finance"],
    countries: ["Nigeria", "Africa"],
  },
  {
    url: "https://www.businessdailyafrica.com/rss",
    source: "Business Daily Africa",
    tags: ["Business", "Finance", "Startups"],
    countries: ["Kenya", "Africa", "East Africa"],
  },
  {
    url: "https://www.businesslive.co.za/rss/companies/",
    source: "Business Live SA",
    tags: ["Business", "Finance"],
    countries: ["South Africa", "Africa"],
  },
  {
    url: "https://techcrunch.com/feed/",
    source: "TechCrunch",
    tags: ["Startups", "Technology", "VC", "Venture Capital"],
    countries: [],
  },
  {
    url: "https://www.pehub.com/feed/",
    source: "PE Hub",
    tags: ["Private Equity", "VC", "Venture Capital", "M&A"],
    countries: [],
  },
];

// ─── Simple RSS/Atom parser ───────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  // Handle CDATA, self-closing, and regular tags
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i"
  );
  const m = xml.match(re);
  if (m?.[1]) return m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  // Try link without closing tag (common in RSS)
  if (tag === "link") {
    const m2 = xml.match(/<link>([^<]+)/i);
    if (m2?.[1]) return m2[1].trim();
    // Atom style
    const m3 = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
    if (m3?.[1]) return m3[1].trim();
  }
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 400);
}

function parseItems(xml: string): { title: string; url: string; description: string; pubDate: string }[] {
  const items: { title: string; url: string; description: string; pubDate: string }[] = [];

  // RSS <item> or Atom <entry>
  const itemRe = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const chunk = m[1];
    const title = stripHtml(extractTag(chunk, "title"));
    const url = extractTag(chunk, "link") || extractTag(chunk, "guid") || "";
    const description = stripHtml(extractTag(chunk, "description") || extractTag(chunk, "content:encoded") || extractTag(chunk, "summary") || extractTag(chunk, "content"));
    const pubDate = extractTag(chunk, "pubDate") || extractTag(chunk, "published") || extractTag(chunk, "updated") || "";
    if (title && url) items.push({ title, url, description, pubDate });
  }
  return items;
}

// ─── Fetch a single feed ──────────────────────────────────────────────────────

async function fetchFeed(
  feedConfig: (typeof GLOBAL_FEEDS)[0]
): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedConfig.url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Vertica/1.0 Investment Scout" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const parsed = parseItems(text);
    return parsed.map((item) => ({
      id: Buffer.from(item.url).toString("base64").slice(0, 24),
      title: item.title,
      url: item.url,
      summary: item.description,
      source: feedConfig.source,
      fetchedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      tags: feedConfig.tags,
      countryTags: feedConfig.countries,
    }));
  } catch {
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch all news items, using cache where possible.
 */
export async function fetchAllNews(): Promise<NewsItem[]> {
  const cacheKey = "global";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.items;
  }

  const results = await Promise.allSettled(GLOBAL_FEEDS.map(fetchFeed));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduped = all.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  // Sort newest first
  deduped.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());

  cache.set(cacheKey, { items: deduped, fetchedAt: Date.now() });
  return deduped;
}

/**
 * Filter news by user interests (tags + countries).
 */
export function filterByInterests(
  items: NewsItem[],
  interests: { type: string; value: string }[]
): NewsItem[] {
  if (interests.length === 0) return items;

  const countryInterests = interests
    .filter((i) => i.type === "COUNTRY")
    .map((i) => i.value.toLowerCase());

  const topicInterests = interests
    .filter((i) => i.type !== "COUNTRY")
    .map((i) => i.value.toLowerCase());

  return items.filter((item) => {
    const allTags = [...item.tags, ...item.countryTags].map((t) => t.toLowerCase());
    const titleLower = item.title.toLowerCase();
    const summaryLower = item.summary.toLowerCase();

    // Match by country interests
    if (countryInterests.length > 0) {
      const countryMatch = countryInterests.some(
        (c) =>
          allTags.some((t) => t.includes(c) || c.includes(t)) ||
          titleLower.includes(c) ||
          summaryLower.includes(c)
      );
      if (countryMatch) return true;
    }

    // Match by topic/asset interests
    if (topicInterests.length > 0) {
      const topicMatch = topicInterests.some(
        (t) =>
          allTags.some((tag) => tag.includes(t) || t.includes(tag)) ||
          titleLower.includes(t) ||
          summaryLower.includes(t)
      );
      if (topicMatch) return true;
    }

    // If user has interests but nothing matched, still return items with no country specificity
    if (item.countryTags.length === 0 && topicInterests.length === 0 && countryInterests.length > 0) {
      return true;
    }

    return false;
  });
}
