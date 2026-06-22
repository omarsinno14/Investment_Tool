/**
 * Seed script — creates pre-made community Hubs for Vertica.
 * Run with: cd artifacts/api-server && npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as crypto from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const WORLD_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
  "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
  "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria",
  "Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon",
  "Canada","Central African Republic","Chad","Chile","China","Colombia",
  "Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic",
  "DR Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini",
  "Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany",
  "Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq",
  "Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya",
  "Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
  "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands",
  "Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco",
  "Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia",
  "Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
  "North Korea","North Macedonia","Norway","Oman","Pakistan","Palau",
  "Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines",
  "Poland","Portugal","Qatar","Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay",
  "Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen",
  "Zambia","Zimbabwe",
];

const FEATURED_HUBS = [
  { name: "Vertica",         slug: "vertica",         description: "The official Vertica community. Discuss the platform, share feedback, and connect with fellow investors and founders." },
  { name: "News",            slug: "news",             description: "Investment news, market updates, and global headlines curated for the Vertica community." },
  { name: "Deals",           slug: "deals",            description: "Community-posted investment opportunities, deal flow, and due diligence discussions." },
  { name: "Private Equity",  slug: "private-equity",   description: "PE deal flow, fund performance, and buyout market discussions." },
  { name: "Venture Capital", slug: "venture-capital",  description: "Startup funding rounds, VC thesis sharing, and emerging company discussions." },
  { name: "Real Estate",     slug: "real-estate",      description: "Real estate investment, REITs, property deals, and market analysis." },
  { name: "Africa",          slug: "africa",            description: "Pan-African investment opportunities, emerging market insights, and continent-wide deal flow." },
];

function makeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function upsertHub(name: string, slug: string, description: string, ownerId: string) {
  const existing = await prisma.hub.findFirst({ where: { slug } });
  if (!existing) {
    await prisma.hub.create({
      data: {
        name, slug, description, ownerUserId: ownerId,
        memberships: { create: { userId: ownerId, role: "OWNER" } },
      },
    });
    return true;
  }
  return false;
}

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Find or create system bot user
  let botUser = await prisma.user.findFirst({ where: { email: "system@vertica.app" } });
  if (!botUser) {
    botUser = await prisma.user.create({
      data: {
        email: "system@vertica.app",
        passwordHash: crypto.randomBytes(32).toString("hex"),
        role: "ADMIN",
        profile: { create: { name: "Vertica", username: "vertica", bio: "Official Vertica community account" } },
      },
    });
    console.log("✅ Created system bot user");
  } else {
    console.log("✓  System bot user exists");
  }

  const ownerId = botUser.id;

  // 2. Featured hubs
  for (const hub of FEATURED_HUBS) {
    const created = await upsertHub(hub.name, hub.slug, hub.description, ownerId);
    console.log(created ? `✅ Hub: ${hub.name}` : `✓  Hub exists: ${hub.name}`);
  }

  // 3. Country hubs
  let created = 0, skipped = 0;
  for (const country of WORLD_COUNTRIES) {
    const slug = makeSlug(country);
    const ok = await upsertHub(country, slug, `Investment opportunities, news, and discussions about ${country}.`, ownerId);
    ok ? created++ : skipped++;
  }
  console.log(`✅ Country hubs: ${created} created, ${skipped} already existed`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
