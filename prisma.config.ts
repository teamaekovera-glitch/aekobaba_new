import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Prisma CLI connects DIRECTLY to Postgres (Supabase port 5432) — required
  // for migrations; the transaction-mode pooler on 6543 does not support the
  // prepared statements Prisma Migrate relies on. The app's runtime client
  // uses DATABASE_URL (pooler) instead. See docs/supabase-setup.md.
  //
  // Empty fallback keeps env-free commands (prisma generate in postinstall/CI)
  // working; migrations simply fail to connect until DIRECT_URL is set.
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
