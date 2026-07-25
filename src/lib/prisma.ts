import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. Add the Supabase pooled Postgres URL in Vercel Environment Variables (Production + Preview)."
    );
  }

  return "postgresql://postgres:postgres@localhost:5432/muzungu_price?schema=public";
}

function createPool(connectionString: string): Pool {
  const needsSsl =
    /supabase\.(co|com)/i.test(connectionString) ||
    /[?&]sslmode=require/i.test(connectionString) ||
    process.env.PGSSLMODE === "require";

  return new Pool({
    connectionString,
    // Serverless-friendly: keep the pool tiny on Vercel.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {})
  });
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl();
  const pool = global.prismaPool ?? createPool(databaseUrl);
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

  if (process.env.NODE_ENV !== "production") {
    global.prismaPool = pool;
    global.prisma = client;
  }

  return client;
}

export const prisma = global.prisma ?? createPrismaClient();
