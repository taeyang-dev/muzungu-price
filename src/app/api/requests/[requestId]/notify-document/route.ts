import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { sendInboxMessage } from "@/lib/inbox";
import { prisma } from "@/lib/prisma";
import { loadVendorAccessForUser } from "@/lib/service-request-scope";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

const schema = z.object({
  type: z.enum(["quotation", "ebm"]),
  fileName: z.string().trim().min(1).optional()
});

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { requestId } = await params;
  const { providerProfileId } = await loadVendorAccessForUser(
    auth.session.userId,
    auth.session.email
  );

  if (!providerProfileId) {
    return fail("Vendor profile is required", 403, "AUTH_002");
  }

  try {
    const payload = schema.parse(await request.json());

    const serviceRequest = await prisma.serviceRequest.findFirst({
      where: {
        id: requestId,
        providerProfileId,
        requestType: payload.type
      },
      include: {
        requester: { select: { id: true, name: true } },
        providerProfile: { select: { businessName: true } }
      }
    });

    if (!serviceRequest) {
      return fail("Request not found", 404, "NOT_FOUND");
    }

    const docLabel =
      payload.type === "quotation"
        ? "quotation"
        : "EBM";
    const fileName = payload.fileName?.trim();
    const vendorName = serviceRequest.providerProfile?.businessName ?? "Vendor";

    await sendInboxMessage({
      recipientUserId: serviceRequest.requesterUserId,
      senderUserId: auth.session.userId,
      subject: `${vendorName} sent your ${docLabel}`,
      body: [
        `${vendorName} uploaded a ${docLabel} for your request.`,
        fileName ? `File: ${fileName}` : "",
        "Open Requests to download the document."
      ]
        .filter(Boolean)
        .join("\n")
    });

    if (serviceRequest.status === "open") {
      await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: "negotiating" }
      });
    }

    return ok({ notified: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to notify requester", 500, "REQ_500");
  }
}
