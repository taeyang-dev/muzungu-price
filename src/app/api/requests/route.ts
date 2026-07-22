import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { decimalToNumber, fail, ok } from "@/lib/api";
import { requireRole, requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  categoryId: z.string(),
  title: z.string().min(3),
  requirementText: z.string().min(10),
  locationText: z.string().optional(),
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  needsQuotation: z.boolean().default(false),
  needsEbm: z.boolean().default(false),
  organizationId: z.string().optional()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["customer", "org_buyer"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    if (
      payload.budgetMin !== undefined &&
      payload.budgetMax !== undefined &&
      payload.budgetMin > payload.budgetMax
    ) {
      return fail("budgetMin cannot be greater than budgetMax", 400, "VAL_001");
    }

    const created = await prisma.serviceRequest.create({
      data: {
        requesterUserId: auth.session.userId,
        organizationId: payload.organizationId,
        categoryId: payload.categoryId,
        title: payload.title,
        requirementText: payload.requirementText,
        locationText: payload.locationText,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        currency: payload.currency?.toUpperCase(),
        needsQuotation: payload.needsQuotation,
        needsEbm: payload.needsEbm
      }
    });
    return ok(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to create request", 500, "REQ_500");
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const where: Prisma.ServiceRequestWhereInput =
    auth.session.role === "provider"
      ? { status: { in: ["open", "negotiating"] } }
      : { requesterUserId: auth.session.userId };

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      category: true,
      offers: {
        include: {
          providerProfile: true
        },
        orderBy: { createdAt: "desc" }
      },
      booking: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(
    requests.map((item) => ({
      id: item.id,
      title: item.title,
      requirementText: item.requirementText,
      locationText: item.locationText,
      budgetMin: decimalToNumber(item.budgetMin),
      budgetMax: decimalToNumber(item.budgetMax),
      currency: item.currency,
      needsQuotation: item.needsQuotation,
      needsEbm: item.needsEbm,
      status: item.status,
      category: item.category,
      offers: item.offers.map((offer) => ({
        id: offer.id,
        providerName: offer.providerProfile.businessName,
        quotedPrice: decimalToNumber(offer.quotedPrice),
        currency: offer.currency,
        status: offer.status,
        canIssueQuotation: offer.canIssueQuotation,
        canIssueEbm: offer.canIssueEbm
      })),
      booking: item.booking
        ? {
            id: item.booking.id,
            status: item.booking.status,
            finalPrice: decimalToNumber(item.booking.finalPrice),
            currency: item.booking.currency
          }
        : null
    })),
    { total: requests.length }
  );
}
