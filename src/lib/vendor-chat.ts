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
