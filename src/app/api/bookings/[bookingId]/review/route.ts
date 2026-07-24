import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ratingOverall: z.coerce.number().int().min(1).max(5),
  ratingPriceTransparency: z.coerce.number().int().min(1).max(5).optional(),
  ratingTimeliness: z.coerce.number().int().min(1).max(5).optional(),
  ratingQuality: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().optional()
});

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["customer", "org_buyer"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const { bookingId } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) {
      return fail("Booking not found", 404, "NOT_FOUND");
    }
    if (booking.customerUserId !== auth.session.userId) {
      return fail("Insufficient permissions", 403, "AUTH_002");
    }
    if (booking.status !== "completed") {
      return fail("Booking must be completed before reviewing", 409, "BOOK_001");
    }

    const exists = await prisma.review.findUnique({ where: { bookingId } });
    if (exists) {
      return fail("Review already exists for this booking", 409, "REV_002");
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        reviewerUserId: auth.session.userId,
        providerProfileId: booking.providerProfileId,
        ratingOverall: payload.ratingOverall,
        ratingPriceTransparency: payload.ratingPriceTransparency,
        ratingTimeliness: payload.ratingTimeliness,
        ratingQuality: payload.ratingQuality,
        comment: payload.comment
      }
    });

    return ok(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to create review", 500, "REV_500");
  }
}
