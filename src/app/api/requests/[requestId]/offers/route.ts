import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  quotedPrice: z.coerce.number().positive(),
  currency: z.string().length(3),
  scopeText: z.string().optional(),
  canIssueQuotation: z.boolean(),
  canIssueEbm: z.boolean()
});

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const { requestId } = await params;
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: auth.session.userId }
    });
    if (!profile) {
      return fail("Provider profile does not exist", 404, "PROV_001");
    }

    const targetRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId }
    });
    if (!targetRequest) {
      return fail("Request not found", 404, "NOT_FOUND");
    }
    if (!["open", "negotiating"].includes(targetRequest.status)) {
      return fail("Request is no longer accepting offers", 409, "REQ_002");
    }

    const existing = await prisma.requestOffer.findFirst({
      where: { requestId, providerProfileId: profile.id, status: "sent" }
    });
    if (existing) {
      return fail("You already submitted an active offer for this request", 409, "OFFER_002");
    }

    const offer = await prisma.requestOffer.create({
      data: {
        requestId,
        providerProfileId: profile.id,
        quotedPrice: payload.quotedPrice,
        currency: payload.currency.toUpperCase(),
        scopeText: payload.scopeText,
        canIssueQuotation: payload.canIssueQuotation,
        canIssueEbm: payload.canIssueEbm
      }
    });

    await prisma.serviceRequest.update({
      where: { id: requestId },
      data: { status: "negotiating" }
    });

    return ok(offer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to submit offer", 500, "OFFER_500");
  }
}
