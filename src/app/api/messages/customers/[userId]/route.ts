import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { sendInboxMessage } from "@/lib/inbox";
import { prisma } from "@/lib/prisma";
import { loadVendorAccessForUser } from "@/lib/service-request-scope";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

const schema = z.object({
  body: z.string().trim().min(1),
  subject: z.string().trim().min(1).optional(),
  requestId: z.string().optional()
});

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { userId: recipientUserId } = await params;
  const { providerProfileId } = await loadVendorAccessForUser(
    auth.session.userId,
    auth.session.email
  );
  if (!providerProfileId) {
    return fail("Vendor profile is required to message customers", 403, "AUTH_002");
  }

  try {
    const payload = schema.parse(await request.json());

    if (payload.requestId) {
      const serviceRequest = await prisma.serviceRequest.findFirst({
        where: {
          id: payload.requestId,
          requesterUserId: recipientUserId,
          providerProfileId
        },
        select: { id: true, requestType: true }
      });

      if (!serviceRequest) {
        return fail("Request not found for this customer", 404, "NOT_FOUND");
      }
    } else {
      const hasRequest = await prisma.serviceRequest.findFirst({
        where: {
          requesterUserId: recipientUserId,
          providerProfileId,
          status: { notIn: ["cancelled"] }
        },
        select: { id: true }
      });

      if (!hasRequest) {
        return fail("No request history with this customer", 403, "AUTH_002");
      }
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: { businessName: true }
    });

    const subject =
      payload.subject?.trim() ||
      `${provider?.businessName ?? "Vendor"} message`;

    const message = await sendInboxMessage({
      recipientUserId,
      senderUserId: auth.session.userId,
      subject,
      body: payload.body
    });

    return ok({ id: message.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to send message", 500, "MSG_500");
  }
}
