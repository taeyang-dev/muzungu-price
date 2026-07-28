import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { sendInboxMessage } from "@/lib/inbox";
import { verificationSubmittedInboxMessage } from "@/lib/inbox-messages";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(_request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { caseId } = await params;
  const verificationCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: {
      providerProfile: true,
      documents: true
    }
  });

  if (!verificationCase) {
    return fail("Verification case not found", 404, "NOT_FOUND");
  }

  if (verificationCase.providerProfile.userId !== auth.session.userId) {
    return fail("Insufficient permissions", 403, "AUTH_002");
  }

  if (verificationCase.status !== "draft") {
    return fail("Only draft cases can be submitted for review", 400, "VER_003");
  }

  const updated = await prisma.verificationCase.update({
    where: { id: caseId },
    data: { status: "pending" }
  });

  const inboxMessage = verificationSubmittedInboxMessage();
  await sendInboxMessage({
    recipientUserId: auth.session.userId,
    subject: inboxMessage.subject,
    body: inboxMessage.body
  });

  return ok(updated);
}
