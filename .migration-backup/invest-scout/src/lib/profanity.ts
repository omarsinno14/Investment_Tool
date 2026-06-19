const BAD_WORDS = [
  "abuse",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "crap",
  "cunt",
  "damn",
  "dick",
  "fool",
  "fuck",
  "idiot",
  "moron",
  "piss",
  "prick",
  "shit",
  "slut",
  "stupid",
  "whore",
];

const BAD_WORD_PATTERN = new RegExp(`\\b(${BAD_WORDS.join("|")})\\b`, "gi");

export function sanitizeProfanity(input: string) {
  if (!input) return input;
  return input.replace(BAD_WORD_PATTERN, (match) => "*".repeat(match.length));
}
