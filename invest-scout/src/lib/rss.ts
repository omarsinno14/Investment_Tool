import Parser from "rss-parser";

export type RssItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  isoDate?: string;
  pubDate?: string;
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
