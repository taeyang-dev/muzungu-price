import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: auth.session.userId }
  });
  if (!profile) {
    return fail("Provider profile does not exist", 404, "PROV_001");
  }

  const latest = await prisma.verificationCase.findFirst({
    where: { providerProfileId: profile.id },
    orderBy: { createdAt: "desc" }
  });

  return ok(latest);
}
