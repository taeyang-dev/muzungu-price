import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { getUnreadInboxCount } from "@/lib/inbox";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (!auth.session) {
    return auth.error as NextResponse;
  }

  const messages = await prisma.inboxMessage.findMany({
    where: { recipientUserId: auth.session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: { name: true, email: true }
      }
    }
  });

  return ok(messages);
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (!auth.session) {
    return auth.error as NextResponse;
  }

  const unreadCount = await getUnreadInboxCount(auth.session.userId);
  return new NextResponse(null, {
    status: 200,
    headers: { "X-Unread-Count": String(unreadCount) }
  });
}
