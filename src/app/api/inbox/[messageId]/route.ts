import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function PATCH(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(_request);
  if (!auth.session) {
    return auth.error as NextResponse;
  }

  const { messageId } = await params;
  const message = await prisma.inboxMessage.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    return fail("Message not found", 404, "NOT_FOUND");
  }

  if (message.recipientUserId !== auth.session.userId) {
    return fail("Insufficient permissions", 403, "AUTH_002");
  }

  const updated = await prisma.inboxMessage.update({
    where: { id: messageId },
    data: { isRead: true }
  });

  return ok(updated);
}
