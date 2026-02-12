type InterestInput = { type?: string | null; value?: string | null };

type MatchContext = {
  interestTerms: string[];
  countryTerms: string[];
  cityTerms: string[];
  userCountry: string | null;
  userRegion: string | null;
  investAmount: number | null;
};

function normalize(value: string) {
  return value.toLowerCase();
}

function safeText(value?: string | null) {
  return value ? normalize(value) : "";
}

function includesAny(haystack: string, terms: string[]) {
  if (!haystack || terms.length === 0) return false;
  return terms.some((term) => term && haystack.includes(term));
}

export function buildMatchContext({
  interests,
  userCountry,
  userRegion,
  investAmount,
}: {
  interests: InterestInput[];
  userCountry?: string | null;
  userRegion?: string | null;
  investAmount?: number | null;
}): MatchContext {
  const interestTerms: string[] = [];
  const countryTerms: string[] = [];
  const cityTerms: string[] = [];

  for (const interest of interests) {
    const raw = String(interest?.value ?? "").trim();
    if (!raw) continue;
    const value = normalize(raw);
    const type = String(interest?.type ?? "").toUpperCase();
    if (type === "COUNTRY") countryTerms.push(value);
    else if (type === "CITY") cityTerms.push(value);
    else interestTerms.push(value);
  }

  return {
    interestTerms,
    countryTerms,
    cityTerms,
    userCountry: userCountry ? normalize(userCountry) : null,
    userRegion: userRegion ? normalize(userRegion) : null,
    investAmount: typeof investAmount === "number" ? investAmount : null,
  };
}

export function matchesOpportunityInterest(
  opportunity: {
    title?: string | null;
    summary?: string | null;
    details?: string | null;
    tags?: string[] | null;
    keywords?: string[] | null;
  },
  context: MatchContext
) {
  const haystack = normalize(
    `${opportunity.title ?? ""} ${opportunity.summary ?? ""} ${opportunity.details ?? ""} ${(
      opportunity.tags ?? []
    ).join(" ")} ${(opportunity.keywords ?? []).join(" ")}`
  );
  return includesAny(haystack, context.interestTerms);
}

export function matchesOpportunityLocation(
  opportunity: { locationName?: string | null; countryTags?: string[] | null; cityTags?: string[] | null },
  context: MatchContext
) {
  const countryTags = (opportunity.countryTags ?? []).map((tag) => normalize(tag));
  const cityTags = (opportunity.cityTags ?? []).map((tag) => normalize(tag));
  const loc = safeText(opportunity.locationName ?? "");
  if (!loc && countryTags.length === 0) return false;
  const countryMatch =
    (context.userCountry && loc.includes(context.userCountry)) ||
    context.countryTerms.some((term) => loc.includes(term)) ||
    countryTags.some((tag) =>
      (context.userCountry && tag.includes(context.userCountry)) ||
      context.countryTerms.some((term) => tag.includes(term))
    );
  const cityMatch = context.cityTerms.some((term) => loc.includes(term) || cityTags.some((tag) => tag.includes(term)));
  const regionMatch = context.userRegion ? loc.includes(context.userRegion) : false;
  return Boolean(countryMatch || cityMatch || regionMatch);
}

export function getMatchScore(
  opportunity: {
    title?: string | null;
    summary?: string | null;
    details?: string | null;
    tags?: string[] | null;
    keywords?: string[] | null;
    locationName?: string | null;
    countryTags?: string[] | null;
    cityTags?: string[] | null;
    assetTags?: string[] | null;
    strategyTags?: string[] | null;
    keywordTags?: string[] | null;
    askAmount?: number | null;
  },
  context: MatchContext
) {
  let score = 0;
  const loc = safeText(opportunity.locationName ?? "");
  const countryTags = (opportunity.countryTags ?? []).map((tag) => normalize(tag));
  const cityTags = (opportunity.cityTags ?? []).map((tag) => normalize(tag));
  const countryMatch =
    (context.userCountry && loc.includes(context.userCountry)) ||
    context.countryTerms.some((term) => loc.includes(term)) ||
    countryTags.some((tag) =>
      (context.userCountry && tag.includes(context.userCountry)) ||
      context.countryTerms.some((term) => tag.includes(term))
    );
  const cityMatch = context.cityTerms.some((term) => loc.includes(term) || cityTags.some((tag) => tag.includes(term)));
  const regionMatch = context.userRegion ? loc.includes(context.userRegion) : false;

  if ((countryMatch || cityMatch) && regionMatch) score += 30;
  else if (countryMatch || cityMatch) score += 20;
  else if (regionMatch) score += 10;

  if (matchesOpportunityInterest(opportunity, context)) {
    score += 30;
  }

  const haystack = normalize(
    `${(opportunity.tags ?? []).join(" ")} ${(opportunity.keywords ?? []).join(" ")} ${(opportunity.assetTags ?? []).join(" ")} ${(opportunity.strategyTags ?? []).join(" ")} ${(opportunity.keywordTags ?? []).join(" ")}`
  );
  if (includesAny(haystack, context.interestTerms)) {
    score += 20;
  }

  if (context.investAmount != null && typeof opportunity.askAmount === "number") {
    const ratio = context.investAmount / opportunity.askAmount;
    if (ratio >= 1) score += 20;
    else if (ratio >= 0.5) score += 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function shouldIncludeOpportunity(
  opportunity: { locationName?: string | null; countryTags?: string[] | null; cityTags?: string[] | null; title?: string | null; summary?: string | null; details?: string | null; tags?: string[] | null; keywords?: string[] | null; assetTags?: string[] | null; strategyTags?: string[] | null; keywordTags?: string[] | null },
  context: MatchContext
) {
  const hasInterestTerms = context.interestTerms.length > 0;
  const hasLocationTerms = Boolean(context.userCountry || context.userRegion || context.countryTerms.length > 0 || context.cityTerms.length > 0);

  const interestMatch = matchesOpportunityInterest(opportunity, context);
  const locationMatch = matchesOpportunityLocation(opportunity, context);

  if (hasInterestTerms && hasLocationTerms) return interestMatch && locationMatch;
  if (hasInterestTerms) return interestMatch;
  if (hasLocationTerms) return locationMatch;
  return true;
}
