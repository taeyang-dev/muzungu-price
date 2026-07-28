import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { markVendorChatRead } from "@/lib/vendor-chat";

const payloadSchema = z.object({
  providerProfileId: z.string().trim().min(1),
  customerUserId: z.string().trim().min(1)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    await markVendorChatRead({
      readerUserId: auth.session.userId,
      providerProfileId: payload.providerProfileId,
      customerUserId: payload.customerUserId
    });
    return ok({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to mark chat as read", 500, "CHAT_500");
  }
}
