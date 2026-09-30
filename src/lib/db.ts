import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 runs on driver adapters: the connection string lives here (runtime,
// Supabase pooler on port 6543), not in the schema block. An empty connection
// string is safe at construction — the pg Pool only connects on first query —
// so the app still builds and renders before Supabase credentials exist.

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

function createDb(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
  });
}

export const db: PrismaClient = globalForDb.prisma ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.prisma = db;
