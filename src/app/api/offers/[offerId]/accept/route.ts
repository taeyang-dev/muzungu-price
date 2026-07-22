import { NextRequest, NextResponse } from "next/server";
import { decimalToNumber, fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ offerId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["customer", "org_buyer"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { offerId } = await params;
  const offer = await prisma.requestOffer.findUnique({
    where: { id: offerId },
    include: {
      request: true
    }
  });

  if (!offer) {
    return fail("Offer not found", 404, "NOT_FOUND");
  }

  if (offer.request.requesterUserId !== auth.session.userId) {
    return fail("Insufficient permissions", 403, "AUTH_002");
  }

  if (offer.status !== "sent") {
    return fail("Offer is not active", 409, "OFFER_003");
  }

  const existingBooking = await prisma.booking.findUnique({
    where: { requestId: offer.requestId }
  });
  if (existingBooking) {
    return fail("Request already has a booking", 409, "BOOK_002");
  }

  await prisma.requestOffer.updateMany({
    where: { requestId: offer.requestId, status: "sent" },
    data: { status: "rejected" }
  });

  const accepted = await prisma.requestOffer.update({
    where: { id: offerId },
    data: { status: "accepted" }
  });

  const booking = await prisma.booking.create({
    data: {
      requestId: offer.requestId,
      providerProfileId: offer.providerProfileId,
      customerUserId: auth.session.userId,
      finalPrice: offer.quotedPrice,
      currency: offer.currency,
      status: "confirmed"
    }
  });

  await prisma.serviceRequest.update({
    where: { id: offer.requestId },
    data: { status: "booked" }
  });

  return ok({
    acceptedOfferId: accepted.id,
    booking: {
      id: booking.id,
      status: booking.status,
      finalPrice: decimalToNumber(booking.finalPrice),
      currency: booking.currency
    }
  });
}
