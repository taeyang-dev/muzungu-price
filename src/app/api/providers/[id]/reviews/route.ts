import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const exists = await prisma.providerProfile.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!exists) {
    return fail("Provider not found", 404, "NOT_FOUND");
  }

  const reviews = await prisma.review.findMany({
    where: { providerProfileId: id },
    orderBy: { createdAt: "desc" }
  });

  return ok(reviews, { total: reviews.length });
}
