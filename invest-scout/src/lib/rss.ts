import Parser from "rss-parser";

export type RssItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
  enclosure?: {
    url?: string;
  };
};

export type RssSource = {
  name: string;
  url: string;
};

export type RssSource = {
  name: string;
  url: string;
};

const parser = new Parser();

export async function fetchRss(url: string) {
  const feed = await parser.parseURL(url);
  const items = (feed.items ?? []) as RssItem[];
  return items;
}

export function extractImageUrl(item: RssItem) {
  if (item.enclosure?.url) return item.enclosure.url;
  const anyItem = item as any;
  const mediaContent = anyItem?.["media:content"]?.url || anyItem?.["media:content"]?.[0]?.url;
  if (mediaContent) return mediaContent;
  const mediaThumb = anyItem?.["media:thumbnail"]?.url || anyItem?.["media:thumbnail"]?.[0]?.url;
  if (mediaThumb) return mediaThumb;
  return null;
}

export async function fetchOgImage(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

// Google News RSS query builder (simple + effective)
export function googleNewsRss(query: string) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

export function bingNewsRss(query: string) {
  const q = encodeURIComponent(query);
  return `https://www.bing.com/news/search?q=${q}&format=rss`;
}

export function yahooNewsRss(query: string) {
  const q = encodeURIComponent(query);
  return `https://news.search.yahoo.com/rss?p=${q}`;
}

export function buildNewsSources(query: string): RssSource[] {
  return [
    { name: "Google News RSS", url: googleNewsRss(query) },
    { name: "Bing News RSS", url: bingNewsRss(query) },
    { name: "Yahoo News RSS", url: yahooNewsRss(query) },
  ];
}
