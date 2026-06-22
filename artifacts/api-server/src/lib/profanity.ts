/**
 * profanity.ts — lightweight profanity detection and masking.
 * Used to block/clean user-generated content (messages, posts, comments).
 */

const BLOCKLIST: string[] = [
  "fuck",
  "fucker",
  "fucking",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "dickhead",
  "cunt",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "wanker",
  "twat",
  "pussy",
  "cock",
  "dick",
  "prick",
  "douche",
  "jackass",
];

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

function normalize(word: string): string {
  return word
    .toLowerCase()
    .split("")
    .map((c) => LEET_MAP[c] ?? c)
    .join("")
    .replace(/[^a-z]/g, "");
}

const NORMALIZED_BLOCKLIST = new Set(BLOCKLIST.map(normalize));

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Returns the list of profane words detected in the given text. */
export function detectProfanity(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const token of tokenize(text)) {
    const n = normalize(token);
    if (!n) continue;
    if (NORMALIZED_BLOCKLIST.has(n)) {
      found.push(token);
      continue;
    }
    // catch concatenations / embedded profanity
    for (const bad of NORMALIZED_BLOCKLIST) {
      if (bad.length >= 4 && n.includes(bad)) {
        found.push(token);
        break;
      }
    }
  }
  return found;
}

/** True when the text contains profanity. */
export function containsProfanity(text: string): boolean {
  return detectProfanity(text).length > 0;
}

/** Replaces profane words with asterisks, preserving first letter. */
export function maskProfanity(text: string): string {
  if (!text) return text;
  return tokenize(text)
    .map((token) => {
      const n = normalize(token);
      if (!n) return token;
      const isBad =
        NORMALIZED_BLOCKLIST.has(n) ||
        [...NORMALIZED_BLOCKLIST].some((bad) => bad.length >= 4 && n.includes(bad));
      if (!isBad) return token;
      return token[0] + "*".repeat(Math.max(1, token.length - 1));
    })
    .join(" ");
}
