import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ensureDraftVerificationCase } from "@/lib/verification-case";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: auth.session.userId }
  });
  if (!profile) {
    return fail("Save your profile before uploading documents.", 404, "PROV_001");
  }

  const activeReview = await prisma.verificationCase.findFirst({
    where: {
      providerProfileId: profile.id,
      status: { in: ["pending", "on_hold"] }
    }
  });

  if (activeReview) {
    return ok(activeReview);
  }

  const draft = await ensureDraftVerificationCase(profile.id);
  return ok(draft);
}
