import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import {
  canAccessVendorChat,
  createVendorChatMessage,
  listVendorChatMessages,
  type VendorChatAttachment
} from "@/lib/vendor-chat";

interface RouteParams {
  params: Promise<{ providerId: string }>;
}

const MAX_DATA_URL_LENGTH = 4_500_000;
const MAX_ATTACHMENT_COUNT = 3;

const attachmentSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
  dataUrl: z.string().trim().min(1).max(MAX_DATA_URL_LENGTH)
});

const messageSchema = z.object({
  sender: z.enum(["user", "vendor"]),
  text: z.string().max(8000),
  attachments: z.array(attachmentSchema).max(MAX_ATTACHMENT_COUNT).optional(),
  translations: z
    .object({
      en: z.string().optional(),
      ko: z.string().optional(),
      rw: z.string().optional()
    })
    .optional(),
  customerUserId: z.string().trim().min(1).optional()
});

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { providerId } = await params;
  const customerUserId = request.nextUrl.searchParams.get("customerUserId")?.trim() || auth.session.userId;
  const allowed = await canAccessVendorChat(auth.session, providerId, customerUserId);
  if (!allowed) {
    return fail("Chat thread not found", 404, "NOT_FOUND");
  }

  const messages = await listVendorChatMessages(providerId, customerUserId);
  return ok(messages);
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { providerId } = await params;

  try {
    const payload = messageSchema.parse(await request.json());
    const customerUserId = payload.customerUserId ?? auth.session.userId;
    const allowed = await canAccessVendorChat(auth.session, providerId, customerUserId);
    if (!allowed) {
      return fail("Chat thread not found", 404, "NOT_FOUND");
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { userId: true }
    });
    if (!provider) {
      return fail("Provider not found", 404, "NOT_FOUND");
    }

    const isVendorOwner = provider.userId === auth.session.userId;
    if (payload.sender === "vendor" && !isVendorOwner) {
      return fail("Only the vendor can send vendor messages", 403, "AUTH_002");
    }
    if (payload.sender === "user" && auth.session.userId !== customerUserId) {
      return fail("Only the customer can send user messages", 403, "AUTH_002");
    }

    const message = await createVendorChatMessage({
      providerProfileId: providerId,
      customerUserId,
      sender: payload.sender,
      text: payload.text,
      attachments: payload.attachments as VendorChatAttachment[] | undefined,
      translations: payload.translations
    });

    return ok(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to save chat message", 500, "CHAT_500");
  }
}
