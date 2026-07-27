import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const hasDirectUrl = Boolean(process.env.DIRECT_URL?.trim());

  try {
    await prisma.$queryRaw`SELECT 1`;

    let schemaReady = true;
    let schemaMessage: string | null = null;
    try {
      await prisma.serviceRequest.findFirst({
        select: { id: true, purchaseCodeUpdatedAt: true, documentNotifiedAt: true }
      });
    } catch (schemaError) {
      schemaReady = false;
      schemaMessage =
        schemaError instanceof Error
          ? schemaError.message
          : "ServiceRequest schema is out of date. Run npm run db:push or prisma/sql/add_purchase_code_updated_at.sql.";
    }

    return NextResponse.json({
      ok: schemaReady,
      database: "connected",
      schema: schemaReady ? "ready" : "out_of_date",
      schemaMessage,
      env: {
        DATABASE_URL: hasDatabaseUrl,
        DIRECT_URL: hasDirectUrl,
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
