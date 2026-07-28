import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { listProviderChatThreads } from "@/lib/vendor-chat";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: auth.session.userId },
    select: { id: true }
  });
  if (!profile) {
    return fail("Provider profile does not exist", 404, "PROV_001");
  }

  const threads = await listProviderChatThreads(profile.id);
  return ok(threads);
}
