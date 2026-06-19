import assert from "node:assert/strict";
import { getCutoffDate, isFresh, matchArticleToInterests, normalizeText } from "../../src/lib/news-matcher";

const keywordMap = {
  fintech: ["fintech", "payments"],
  energy: ["renewable", "solar"],
};

const now = new Date("2025-01-15T12:00:00Z");

const freshDate = new Date("2024-12-20T00:00:00Z");
const staleDate = new Date("2024-01-10T00:00:00Z");

assert.ok(isFresh(freshDate, now), "Expected fresh date within 6 months");
assert.ok(!isFresh(staleDate, now), "Expected stale date beyond 6 months");
assert.ok(getCutoffDate(now) < now, "Cutoff should be before now");

const matches = matchArticleToInterests(
  { title: "Fintech payments startup raises", summary: "New solar fund", content: "" },
  ["fintech", "energy"],
  keywordMap
);

assert.deepEqual(matches.sort(), ["energy", "fintech"], "Should match configured keywords");
assert.equal(normalizeText("FinTech!!"), "fintech", "Normalization should lower-case and strip punctuation");

console.log("news-matcher tests passed");
