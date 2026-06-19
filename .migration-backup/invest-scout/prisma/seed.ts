import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "O.sinno@outlook.com";
  const username = process.env.SUPER_ADMIN_USERNAME ?? "Omarsinno_";
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "Omsi1978@";

  const passwordHash = await hashPassword(password);
  const usernameLower = username.toLowerCase();

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      profile: { create: { username, usernameLower, name: username } },
    },
    update: {
      passwordHash,
      role: "ADMIN",
      profile: {
        upsert: {
          create: { username, usernameLower, name: username },
          update: { username, usernameLower, name: username },
        },
      },
    },
  });
}

main().finally(() => prisma.$disconnect());
