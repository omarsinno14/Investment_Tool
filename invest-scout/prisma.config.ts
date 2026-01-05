import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // Prisma 7: datasource URL lives here (not in schema.prisma)
  datasource: {
    url: env("DATABASE_URL"),
  },

  // optional but recommended: where migrations are stored
  migrations: {
    path: "prisma/migrations",
  },
});
