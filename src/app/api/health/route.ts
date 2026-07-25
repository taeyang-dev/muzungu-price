import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim());

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "connected",
      env: {
        DATABASE_URL: hasDatabaseUrl,
        AUTH_SECRET: hasAuthSecret
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        message,
        env: {
          DATABASE_URL: hasDatabaseUrl,
          AUTH_SECRET: hasAuthSecret
        }
      },
      { status: 503 }
    );
  }
}
