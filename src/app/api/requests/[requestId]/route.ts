import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decimalToNumber, fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

const patchSchema = z.object({
  purchaseCode: z.string().min(2).optional(),
  organizationTinNumber: z.string().min(5).optional()
});

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { requestId } = await params;
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      category: true,
      offers: {
        include: {
          providerProfile: true
        },
        orderBy: { createdAt: "desc" }
      },
      booking: true
    }
  });

  if (!serviceRequest) {
    return fail("Request not found", 404, "NOT_FOUND");
  }

  if (
    auth.session.role !== "provider" &&
    serviceRequest.requesterUserId !== auth.session.userId &&
    auth.session.role !== "admin"
  ) {
    return fail("Insufficient permissions", 403, "AUTH_002");
  }

  type ServiceRequestOffer = (typeof serviceRequest.offers)[number];

  return ok({
    id: serviceRequest.id,
    title: serviceRequest.title,
    requirementText: serviceRequest.requirementText,
    locationText: serviceRequest.locationText,
    budgetMin: decimalToNumber(serviceRequest.budgetMin),
    budgetMax: decimalToNumber(serviceRequest.budgetMax),
    currency: serviceRequest.currency,
    status: serviceRequest.status,
    needsQuotation: serviceRequest.needsQuotation,
    needsEbm: serviceRequest.needsEbm,
    category: serviceRequest.category,
    offers: serviceRequest.offers.map((offer: ServiceRequestOffer) => ({
      id: offer.id,
      quotedPrice: decimalToNumber(offer.quotedPrice),
      currency: offer.currency,
      status: offer.status,
      provider: {
        id: offer.providerProfile.id,
        businessName: offer.providerProfile.businessName
      },
      canIssueQuotation: offer.canIssueQuotation,
      canIssueEbm: offer.canIssueEbm,
      scopeText: offer.scopeText
    })),
    booking: serviceRequest.booking
      ? {
          id: serviceRequest.booking.id,
          status: serviceRequest.booking.status,
          finalPrice: decimalToNumber(serviceRequest.booking.finalPrice)
        }
      : null
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { requestId } = await params;
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requesterUserId: true,
      requestType: true
    }
  });

  if (!serviceRequest) {
    return fail("Request not found", 404, "NOT_FOUND");
  }

  if (
    auth.session.role !== "admin" &&
    serviceRequest.requesterUserId !== auth.session.userId
  ) {
    return fail("Insufficient permissions", 403, "AUTH_002");
  }

  try {
    const payload = patchSchema.parse(await request.json());
    if (!payload.purchaseCode && !payload.organizationTinNumber) {
      return fail("No update payload provided", 400, "VAL_001");
    }

    const updated = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        purchaseCode: payload.purchaseCode?.trim() || undefined,
        organizationTinNumber: payload.organizationTinNumber?.trim() || undefined
      }
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update request", 500, "REQ_500");
  }
}
