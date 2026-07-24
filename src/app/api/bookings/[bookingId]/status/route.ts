import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["confirmed", "in_progress", "completed", "disputed"])
});

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const { bookingId } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { providerProfile: true }
    });
    if (!booking) {
      return fail("Booking not found", 404, "NOT_FOUND");
    }

    const canEdit =
      auth.session.role === "admin" ||
      booking.customerUserId === auth.session.userId ||
      booking.providerProfile.userId === auth.session.userId;

    if (!canEdit) {
      return fail("Insufficient permissions", 403, "AUTH_002");
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: payload.status,
        completedAt: payload.status === "completed" ? new Date() : null
      }
    });

    if (payload.status === "completed") {
      await prisma.serviceRequest.update({
        where: { id: booking.requestId },
        data: { status: "completed" }
      });
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update booking status", 500, "BOOK_500");
  }
}
