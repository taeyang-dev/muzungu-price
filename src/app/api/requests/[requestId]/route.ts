import { NextRequest, NextResponse } from "next/server";
import { decimalToNumber, fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

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
    offers: serviceRequest.offers.map((offer) => ({
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
