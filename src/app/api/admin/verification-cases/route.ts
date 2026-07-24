import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const VERIFICATION_STATUS_VALUES = ["pending", "approved", "rejected", "on_hold"] as const;
type VerificationStatus = (typeof VERIFICATION_STATUS_VALUES)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["admin"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const status = request.nextUrl.searchParams.get("status");
  const isVerificationStatus = (value: string): value is VerificationStatus =>
    VERIFICATION_STATUS_VALUES.includes(value as VerificationStatus);
  const where =
    status && isVerificationStatus(status)
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
