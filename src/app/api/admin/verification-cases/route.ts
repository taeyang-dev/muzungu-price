import { NextRequest, NextResponse } from "next/server";
import { VerificationStatus } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["admin"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const status = request.nextUrl.searchParams.get("status");
  const where =
    status && Object.values(VerificationStatus).includes(status as VerificationStatus)
      ? { status: status as VerificationStatus }
      : {};

  const cases = await prisma.verificationCase.findMany({
    where,
    include: {
      providerProfile: {
        include: {
          user: true
        }
      },
      documents: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(cases, { total: cases.length });
}
