import { prisma } from "@/lib/prisma";

interface SendInboxMessageInput {
  recipientUserId: string;
  senderUserId?: string | null;
  subject: string;
  body: string;
}

export async function sendInboxMessage(input: SendInboxMessageInput) {
  return prisma.inboxMessage.create({
    data: {
      recipientUserId: input.recipientUserId,
      senderUserId: input.senderUserId ?? null,
      subject: input.subject,
      body: input.body
    }
  });
}

export async function getUnreadInboxCount(userId: string): Promise<number> {
  return prisma.inboxMessage.count({
    where: { recipientUserId: userId, isRead: false }
  });
}
