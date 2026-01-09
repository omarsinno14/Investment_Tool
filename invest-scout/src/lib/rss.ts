import Parser from "rss-parser";

export type RssItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
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
