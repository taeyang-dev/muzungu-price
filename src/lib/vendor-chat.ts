import { prisma } from "@/lib/prisma";

export interface VendorChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export interface VendorChatMessageRecord {
  id: string;
  sender: "user" | "vendor";
  text: string;
  timestamp: string;
  translations?: Partial<Record<"en" | "ko" | "rw", string>>;
  attachments?: VendorChatAttachment[];
}

type StoredVendorChatMessage = {
  id: string;
  providerProfileId: string;
  customerUserId: string;
  sender: string;
  text: string;
  attachmentsJson: string | null;
  translationsJson: string | null;
  createdAt: Date;
};

function parseJson<T>(value: string | null): T | undefined {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function mapVendorChatMessage(message: StoredVendorChatMessage): VendorChatMessageRecord {
  return {
    id: message.id,
    sender: message.sender === "vendor" ? "vendor" : "user",
    text: message.text,
    timestamp: message.createdAt.toISOString(),
    translations: parseJson<Partial<Record<"en" | "ko" | "rw", string>>>(message.translationsJson),
    attachments: parseJson<VendorChatAttachment[]>(message.attachmentsJson)
  };
}

export async function listVendorChatMessages(
  providerProfileId: string,
  customerUserId: string
): Promise<VendorChatMessageRecord[]> {
  const messages = await prisma.vendorChatMessage.findMany({
    where: { providerProfileId, customerUserId },
    orderBy: { createdAt: "asc" },
    take: 50
  });

  return messages.map(mapVendorChatMessage);
}

export async function createVendorChatMessage(input: {
  providerProfileId: string;
  customerUserId: string;
  sender: "user" | "vendor";
  text: string;
  attachments?: VendorChatAttachment[];
  translations?: Partial<Record<"en" | "ko" | "rw", string>>;
}): Promise<VendorChatMessageRecord> {
  const message = await prisma.vendorChatMessage.create({
    data: {
      providerProfileId: input.providerProfileId,
      customerUserId: input.customerUserId,
      sender: input.sender,
      text: input.text,
      attachmentsJson: input.attachments?.length ? JSON.stringify(input.attachments) : null,
      translationsJson: input.translations ? JSON.stringify(input.translations) : null
    }
  });

  return mapVendorChatMessage(message);
}

export async function listProviderChatThreads(providerProfileId: string): Promise<
  Array<{
    customerUserId: string;
    customerName: string;
    lastMessagePreview: string;
    lastMessageAt: string;
  }>
> {
  const threads = await listUserChatThreadsForProviderStorefront(providerProfileId);
  return threads.map((thread) => ({
    customerUserId: thread.customerUserId,
    customerName: thread.displayName,
    lastMessagePreview: thread.lastMessagePreview,
    lastMessageAt: thread.lastMessageAt
  }));
}

export interface UserChatThread {
  threadKey: string;
  providerProfileId: string;
  customerUserId: string;
  displayName: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  chatHref: string;
}

type ThreadAccumulator = {
  providerProfileId: string;
  customerUserId: string;
  preview: string;
  at: Date;
};

function threadKey(providerProfileId: string, customerUserId: string): string {
  return `${providerProfileId}:${customerUserId}`;
}

function ingestThreadMessage(
  threadMap: Map<string, ThreadAccumulator>,
  message: {
    providerProfileId: string;
    customerUserId: string;
    text: string;
    createdAt: Date;
  }
): void {
  const key = threadKey(message.providerProfileId, message.customerUserId);
  if (threadMap.has(key)) {
    return;
  }
  threadMap.set(key, {
    providerProfileId: message.providerProfileId,
    customerUserId: message.customerUserId,
    preview: message.text.slice(0, 120),
    at: message.createdAt
  });
}

async function listUserChatThreadsForProviderStorefront(providerProfileId: string): Promise<UserChatThread[]> {
  const messages = await prisma.vendorChatMessage.findMany({
    where: { providerProfileId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      providerProfileId: true,
      customerUserId: true,
      text: true,
      createdAt: true
    }
  });

  const threadMap = new Map<string, ThreadAccumulator>();
  for (const message of messages) {
    ingestThreadMessage(threadMap, message);
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { id: true, userId: true }
  });
  if (!provider) {
    return [];
  }

  return buildUserChatThreads(provider.userId, threadMap);
}

export async function listUserChatThreads(readerUserId: string): Promise<UserChatThread[]> {
  const threadMap = new Map<string, ThreadAccumulator>();

  const asCustomer = await prisma.vendorChatMessage.findMany({
    where: { customerUserId: readerUserId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      providerProfileId: true,
      customerUserId: true,
      text: true,
      createdAt: true
    }
  });
  for (const message of asCustomer) {
    ingestThreadMessage(threadMap, message);
  }

  const ownProfile = await prisma.providerProfile.findUnique({
    where: { userId: readerUserId },
    select: { id: true }
  });
  if (ownProfile) {
    const asProvider = await prisma.vendorChatMessage.findMany({
      where: { providerProfileId: ownProfile.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        providerProfileId: true,
        customerUserId: true,
        text: true,
        createdAt: true
      }
    });
    for (const message of asProvider) {
      ingestThreadMessage(threadMap, message);
    }
  }

  return buildUserChatThreads(readerUserId, threadMap);
}

async function buildUserChatThreads(
  readerUserId: string,
  threadMap: Map<string, ThreadAccumulator>
): Promise<UserChatThread[]> {
  if (threadMap.size === 0) {
    return [];
  }

  const providerProfileIds = Array.from(new Set(Array.from(threadMap.values()).map((item) => item.providerProfileId)));
  const customerUserIds = Array.from(new Set(Array.from(threadMap.values()).map((item) => item.customerUserId)));

  const [providers, customers, cursors] = await Promise.all([
    prisma.providerProfile.findMany({
      where: { id: { in: providerProfileIds } },
      select: { id: true, businessName: true, userId: true }
    }),
    prisma.user.findMany({
      where: { id: { in: customerUserIds } },
      select: { id: true, name: true, email: true }
    }),
    prisma.vendorChatReadCursor.findMany({
      where: { readerUserId },
      select: { providerProfileId: true, customerUserId: true, lastReadAt: true }
    })
  ]);

  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const cursorByKey = new Map(
    cursors.map((cursor) => [threadKey(cursor.providerProfileId, cursor.customerUserId), cursor.lastReadAt])
  );

  const threads = await Promise.all(
    Array.from(threadMap.values()).map(async (thread) => {
      const provider = providerById.get(thread.providerProfileId);
      const isCustomerParticipant = readerUserId === thread.customerUserId;
      const isProviderOwner = provider?.userId === readerUserId;

      if (!isCustomerParticipant && !isProviderOwner) {
        return null;
      }

      const displayName = isCustomerParticipant
        ? provider?.businessName ?? thread.providerProfileId
        : customerById.get(thread.customerUserId)?.name?.trim() ||
          customerById.get(thread.customerUserId)?.email ||
          thread.customerUserId;

      const lastReadAt = cursorByKey.get(threadKey(thread.providerProfileId, thread.customerUserId)) ?? new Date(0);
      const incomingSender = isCustomerParticipant ? "vendor" : "user";
      const unreadCount = await prisma.vendorChatMessage.count({
        where: {
          providerProfileId: thread.providerProfileId,
          customerUserId: thread.customerUserId,
          sender: incomingSender,
          createdAt: { gt: lastReadAt }
        }
      });

      const chatHref = isProviderOwner
        ? `/providers/${thread.providerProfileId}#vendor-chat?customer=${encodeURIComponent(thread.customerUserId)}`
        : `/providers/${thread.providerProfileId}#vendor-chat`;

      return {
        threadKey: threadKey(thread.providerProfileId, thread.customerUserId),
        providerProfileId: thread.providerProfileId,
        customerUserId: thread.customerUserId,
        displayName,
        lastMessagePreview: thread.preview,
        lastMessageAt: thread.at.toISOString(),
        unreadCount,
        chatHref
      } satisfies UserChatThread;
    })
  );

  return threads
    .filter((thread): thread is UserChatThread => thread !== null)
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

export async function markVendorChatRead(input: {
  readerUserId: string;
  providerProfileId: string;
  customerUserId: string;
}): Promise<void> {
  const allowed = await canAccessVendorChat(
    { userId: input.readerUserId },
    input.providerProfileId,
    input.customerUserId
  );
  if (!allowed) {
    return;
  }

  await prisma.vendorChatReadCursor.upsert({
    where: {
      providerProfileId_customerUserId_readerUserId: {
        providerProfileId: input.providerProfileId,
        customerUserId: input.customerUserId,
        readerUserId: input.readerUserId
      }
    },
    create: {
      providerProfileId: input.providerProfileId,
      customerUserId: input.customerUserId,
      readerUserId: input.readerUserId,
      lastReadAt: new Date()
    },
    update: {
      lastReadAt: new Date()
    }
  });
}

export async function canAccessVendorChat(
  session: { userId: string; email?: string | null },
  providerProfileId: string,
  customerUserId: string
): Promise<boolean> {
  if (session.userId === customerUserId) {
    const provider = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: { id: true }
    });
    return Boolean(provider);
  }

  const provider = await prisma.providerProfile.findFirst({
    where: { id: providerProfileId, userId: session.userId },
    select: { id: true }
  });
  return Boolean(provider) && session.userId !== customerUserId;
}
