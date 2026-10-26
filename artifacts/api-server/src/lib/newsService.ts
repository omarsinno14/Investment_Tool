import { createHash } from "node:crypto";

/**
 * newsService.ts
 * Fetches investment/business headlines from public RSS feeds.
 * Caches results in-memory for CACHE_TTL_MS to avoid hammering sources. Stale
 * results are served immediately while a single background refresh runs, so
 * readers never wait on the ~45 upstream feeds after the first warm-up.
 * Country-specific feeds are included and matched to user country interests.
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
let inflight: Promise<NewsItem[]> | null = null;

// ─── Curated RSS sources ──────────────────────────────────────────────────────
const GLOBAL_FEEDS: { url: string; source: string; tags: string[]; countries: string[] }[] = [
  // ── Global / Multi-region ────────────────────────────────────────────────
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    source: "BBC Business",
    tags: ["Business", "Markets", "Economy"],
    countries: [],
  },
  {
    url: "https://www.ft.com/rss/home",
    source: "Financial Times",
    tags: ["Finance", "Economy", "Business", "Private Equity"],
    countries: [],
  },
  {
    url: "https://techcrunch.com/feed/",
    source: "TechCrunch",
    tags: ["Startups", "Technology", "Venture Capital"],
    countries: [],
  },
  {
    url: "https://www.pehub.com/feed/",
    source: "PE Hub",
    tags: ["Private Equity", "Venture Capital", "M&A"],
    countries: [],
  },

  // ── United States ─────────────────────────────────────────────────────────
  {
    url: "https://www.cnbc.com/id/10000664/device/rss/rss.html",
    source: "CNBC",
    tags: ["Finance", "Markets", "Investing", "Stocks"],
    countries: ["United States"],
  },
  {
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    source: "MarketWatch",
    tags: ["Markets", "Stocks", "Finance", "ETFs"],
    countries: ["United States"],
  },
  {
    url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",
    source: "Wall Street Journal",
    tags: ["Business", "Finance", "Markets"],
    countries: ["United States"],
  },
  {
    url: "https://www.forbes.com/investing/feed2/",
    source: "Forbes Investing",
    tags: ["Investing", "Wealth", "Finance"],
    countries: ["United States"],
  },

  // ── United Kingdom ────────────────────────────────────────────────────────
  {
    url: "https://www.theguardian.com/business/rss",
    source: "The Guardian",
    tags: ["Business", "Economy"],
    countries: ["United Kingdom"],
  },
  {
    url: "https://feeds.skynews.com/feeds/rss/business.xml",
    source: "Sky News Business",
    tags: ["Business", "Economy", "Markets"],
    countries: ["United Kingdom"],
  },
  {
    url: "https://www.thisismoney.co.uk/money/investing/index.rss",
    source: "This Is Money",
    tags: ["Investing", "Finance", "Markets"],
    countries: ["United Kingdom"],
  },

  // ── Nigeria ───────────────────────────────────────────────────────────────
  {
    url: "https://businessday.ng/feed/",
    source: "BusinessDay Nigeria",
    tags: ["Business", "Finance", "Startups"],
    countries: ["Nigeria", "Africa", "West Africa"],
  },
  {
    url: "https://nairametrics.com/feed/",
    source: "Nairametrics",
    tags: ["Business", "Finance", "Markets"],
    countries: ["Nigeria", "Africa"],
  },
  {
    url: "https://guardian.ng/category/business/feed/",
    source: "Guardian Nigeria",
    tags: ["Business", "Economy"],
    countries: ["Nigeria", "Africa"],
  },
  {
    url: "https://punchng.com/business/feed/",
    source: "Punch Business",
    tags: ["Business", "Economy"],
    countries: ["Nigeria", "West Africa"],
  },

  // ── Kenya / East Africa ───────────────────────────────────────────────────
  {
    url: "https://www.businessdailyafrica.com/rss",
    source: "Business Daily Africa",
    tags: ["Business", "Finance", "Startups"],
    countries: ["Kenya", "Africa", "East Africa"],
  },
  {
    url: "https://techweez.com/feed/",
    source: "TechWeez",
    tags: ["Technology", "Startups"],
    countries: ["Kenya", "East Africa", "Africa"],
  },

  // ── South Africa ──────────────────────────────────────────────────────────
  {
    url: "https://www.businesslive.co.za/rss/companies/",
    source: "Business Live SA",
    tags: ["Business", "Finance", "Markets"],
    countries: ["South Africa", "Africa"],
  },
  {
    url: "https://www.dailymaverick.co.za/business/rss.xml",
    source: "Daily Maverick",
    tags: ["Business", "Economy"],
    countries: ["South Africa", "Africa"],
  },
  {
    url: "https://www.fin24.com/rss/all",
    source: "Fin24",
    tags: ["Finance", "Markets", "Stocks"],
    countries: ["South Africa", "Africa"],
  },

  // ── Ghana / West Africa ───────────────────────────────────────────────────
  {
    url: "https://graphic.com.gh/business/feed.rss",
    source: "Graphic Business Ghana",
    tags: ["Business", "Finance"],
    countries: ["Ghana", "Africa", "West Africa"],
  },
  {
    url: "https://www.myjoyonline.com/category/business/feed/",
    source: "Joy Business Ghana",
    tags: ["Business", "Economy"],
    countries: ["Ghana", "West Africa", "Africa"],
  },

  // ── Egypt / North Africa / Middle East ───────────────────────────────────
  {
    url: "https://english.ahram.org.eg/rss/Business/",
    source: "Al-Ahram Business",
    tags: ["Business", "Economy", "Finance"],
    countries: ["Egypt", "North Africa", "Middle East", "Africa"],
  },
  {
    url: "https://arab.news/feed/business",
    source: "Arab News Business",
    tags: ["Business", "Finance", "Economy"],
    countries: ["Saudi Arabia", "Middle East"],
  },

  // ── India ─────────────────────────────────────────────────────────────────
  {
    url: "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
    source: "Economic Times India",
    tags: ["Business", "Finance", "Markets", "Stocks"],
    countries: ["India"],
  },
  {
    url: "https://www.business-standard.com/rss/home_page_top_stories.rss",
    source: "Business Standard India",
    tags: ["Business", "Finance", "Markets"],
    countries: ["India"],
  },

  // ── Canada ────────────────────────────────────────────────────────────────
  {
    url: "https://financialpost.com/feed",
    source: "Financial Post Canada",
    tags: ["Finance", "Markets", "Business"],
    countries: ["Canada"],
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  {
    url: "https://www.smh.com.au/rss/business.xml",
    source: "SMH Business",
    tags: ["Business", "Finance", "Markets"],
    countries: ["Australia"],
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  {
    url: "https://feeds.reuters.com/reuters/businessNews",
    source: "Reuters Business",
    tags: ["Business", "Finance", "Markets", "Economy"],
    countries: [],
  },
  {
    url: "https://www.handelsblatt.com/contentexport/feed/english",
    source: "Handelsblatt Global",
    tags: ["Business", "Economy", "Finance"],
    countries: ["Germany", "Europe"],
  },
  {
    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada",
    source: "El País Economy",
    tags: ["Economy", "Finance", "Business"],
    countries: ["Spain", "Europe"],
  },

  // ── France ───────────────────────────────────────────────────────────────
  {
    url: "https://www.lesechos.fr/rss/rss_une.xml",
    source: "Les Echos",
    tags: ["Finance", "Economy", "Business"],
    countries: ["France", "Europe"],
  },

  // ── Brazil / LatAm ───────────────────────────────────────────────────────
  {
    url: "https://feeds.infomoney.com.br/geral",
    source: "InfoMoney Brazil",
    tags: ["Finance", "Markets", "Investing"],
    countries: ["Brazil", "Latin America"],
  },

  // ── Singapore / Southeast Asia ───────────────────────────────────────────
  {
    url: "https://www.channelnewsasia.com/rss/8395996",
    source: "CNA Business",
    tags: ["Business", "Finance", "Markets"],
    countries: ["Singapore", "Southeast Asia"],
  },

  // ── China ────────────────────────────────────────────────────────────────
  {
    url: "https://www.scmp.com/rss/5/feed",
    source: "SCMP Business",
    tags: ["Business", "Finance", "Markets"],
    countries: ["China", "Hong Kong", "Asia"],
  },

  // ── Crypto / Digital ─────────────────────────────────────────────────────
  {
    url: "https://cointelegraph.com/rss",
    source: "CoinTelegraph",
    tags: ["Bitcoin", "Ethereum", "Crypto", "Digital Assets", "Blockchain"],
    countries: [],
  },
  {
    url: "https://decrypt.co/feed",
    source: "Decrypt",
    tags: ["Bitcoin", "Crypto", "Web3", "Digital Assets"],
    countries: [],
  },

  // ── Real Estate / Commodities ─────────────────────────────────────────────
  {
    url: "https://www.globest.com/feed/",
    source: "GlobeSt Real Estate",
    tags: ["Real Estate", "Property", "REIT"],
    countries: ["United States"],
  },
  {
    url: "https://www.mining.com/feed/",
    source: "Mining.com",
    tags: ["Gold", "Silver", "Copper", "Mining", "Commodities"],
    countries: [],
  },
  {
    url: "https://oilprice.com/rss/main",
    source: "OilPrice.com",
    tags: ["Oil & Gas", "Energy", "Commodities"],
    countries: [],
  },

  // ── Private Markets / Alternatives ────────────────────────────────────────
  {
    url: "https://www.privateequitywire.co.uk/rss.xml",
    source: "PE Wire",
    tags: ["Private Equity", "Hedge Funds", "Alternative Investments"],
    countries: [],
  },
  {
    url: "https://pitchbook.com/rss.xml",
    source: "PitchBook",
    tags: ["Venture Capital", "Private Equity", "Startups"],
    countries: [],
  },
];

// ─── Simple RSS/Atom parser ───────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rsquo: "\u2019", lsquo: "\u2018", rdquo: "\u201d", ldquo: "\u201c",
  ndash: "\u2013", mdash: "\u2014", hellip: "\u2026",
};

/** Decode named and numeric HTML entities. Feeds often double-encode (&amp;#8217;), so run twice. */
function decodeEntities(text: string): string {
  const once = (t: string) =>
    t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] === "#") {
        const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    });
  return once(once(text));
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    "i"
  );
  const m = xml.match(re);
  if (m?.[1]) return decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g, "")).trim();
  if (tag === "link") {
    const m2 = xml.match(/<link>([^<]+)/i);
    if (m2?.[1]) return m2[1].trim();
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
  const itemRe = /<(?:item|entry)([\s\S]*?)<\/(?:item|entry)>/gi;
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

async function fetchFeed(feedConfig: (typeof GLOBAL_FEEDS)[0]): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedConfig.url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Vertica/1.0 Investment Scout" },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const parsed = parseItems(text);
    return parsed.map((item) => {
      const published = item.pubDate ? new Date(item.pubDate) : null;
      const date = published && !Number.isNaN(published.getTime()) ? published : new Date();
      return {
        // Stable, collision-free id derived from source + url.
        id: createHash("sha1").update(`${feedConfig.source}::${item.url}`).digest("hex").slice(0, 24),
        title: item.title,
        url: item.url,
        summary: item.description,
        source: feedConfig.source,
        fetchedAt: date.toISOString(),
        tags: feedConfig.tags,
        countryTags: feedConfig.countries,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const cached = cache.get("global");
  if (cached) {
    if (Date.now() - cached.fetchedAt >= CACHE_TTL_MS) void refreshNews();
    return cached.items;
  }
  return refreshNews();
}

/** Re-fetch every feed. Concurrent callers share one in-flight refresh. */
export function refreshNews(): Promise<NewsItem[]> {
  if (!inflight) {
    inflight = loadAllFeeds().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function loadAllFeeds(): Promise<NewsItem[]> {
  const cacheKey = "global";
  const results = await Promise.allSettled(GLOBAL_FEEDS.map(fetchFeed));
  const all: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  const seen = new Set<string>();
  const deduped = all.filter((i) => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  deduped.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());
  // Keep serving the previous snapshot if every feed failed (e.g. network blip).
  const previous = cache.get(cacheKey);
  if (deduped.length === 0 && previous) {
    previous.fetchedAt = Date.now();
    return previous.items;
  }
  cache.set(cacheKey, { items: deduped, fetchedAt: Date.now() });
  return deduped;
}
