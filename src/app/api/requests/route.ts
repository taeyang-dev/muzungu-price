import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decimalToNumber, fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

type ServiceRequestWhereInput = NonNullable<
  Parameters<typeof prisma.serviceRequest.findMany>[0]
>["where"];

const schema = z.object({
  categoryId: z.string().optional(),
  requestType: z.enum(["general", "quotation", "purchase", "ebm"]).default("general"),
  providerProfileId: z.string().optional(),
  serviceId: z.string().optional(),
  organizationName: z.string().optional(),
  organizationTinNumber: z.string().optional(),
  purchaseCode: z.string().optional(),
  paymentTerm: z.enum(["prepaid", "postpaid", "deposit"]).optional(),
  paymentMethod: z.enum(["bank_transfer", "momo", "cash", "card", "other"]).optional(),
  paymentNote: z.string().optional(),
  documentFileName: z.string().optional(),
  requestedAmount: z.coerce.number().positive().optional(),
  title: z.string().min(3),
  requirementText: z.string().optional().default(""),
  locationText: z.string().nullish(),
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  needsQuotation: z.boolean().default(false),
  needsEbm: z.boolean().default(false),
  organizationId: z.string().optional()
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const selectedService = payload.serviceId
      ? await prisma.service.findUnique({
          where: { id: payload.serviceId },
          select: { id: true, categoryId: true, providerProfileId: true }
        })
      : null;

    const categoryId = payload.categoryId ?? selectedService?.categoryId;
    if (!categoryId) {
      return fail("categoryId is required (or provide a valid serviceId)", 400, "VAL_001");
    }

    const providerProfileId = payload.providerProfileId ?? selectedService?.providerProfileId ?? null;

    if (payload.requestType === "quotation") {
      if (!payload.serviceId || !selectedService) {
        return fail("Select a valid service for quotation request", 400, "VAL_001");
      }
      if (!payload.organizationName || payload.organizationName.trim().length < 2) {
        return fail("Organization name is required for quotation request", 400, "VAL_001");
      }
    }

    if (payload.requestType === "purchase") {
      if (!payload.serviceId || !selectedService) {
        return fail("Select a valid service for purchase request", 400, "VAL_001");
      }
      if (!payload.paymentTerm || !payload.paymentMethod) {
        return fail("paymentTerm and paymentMethod are required for purchase request", 400, "VAL_001");
      }
    }

    if (payload.requestType === "ebm") {
      if (!payload.organizationTinNumber || payload.organizationTinNumber.trim().length < 5) {
        return fail("Organization TIN number is required for EBM request", 400, "VAL_001");
      }
    }

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
        categoryId,
        requestType: payload.requestType,
        providerProfileId,
        serviceId: payload.serviceId ?? null,
        organizationName: payload.organizationName?.trim() || null,
        organizationTinNumber: payload.organizationTinNumber?.trim() || null,
        purchaseCode: payload.purchaseCode?.trim() || null,
        paymentTerm: payload.paymentTerm ?? null,
        paymentMethod: payload.paymentMethod ?? null,
        paymentNote: payload.paymentNote?.trim() || null,
        paymentDueAt:
          payload.requestType === "purchase" &&
          (payload.paymentTerm === "prepaid" || payload.paymentTerm === "deposit")
            ? new Date(Date.now() + 2 * 60 * 60 * 1000)
            : null,
        documentFileName: payload.documentFileName?.trim() || null,
        requestedAmount: payload.requestedAmount ?? null,
        title: payload.title,
      requirementText: payload.requirementText.trim(),
      locationText: payload.locationText?.trim() || null,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        currency: payload.currency?.toUpperCase(),
        needsQuotation: payload.requestType === "quotation" ? true : payload.needsQuotation,
        needsEbm: payload.requestType === "ebm" ? true : payload.needsEbm
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

  const where: ServiceRequestWhereInput =
    auth.session.role === "provider"
      ? { OR: [{ status: "open" }, { status: "negotiating" }] }
      : { requesterUserId: auth.session.userId };

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      category: true,
      providerProfile: true,
      service: true,
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

  type ServiceRequestListItem = (typeof requests)[number];
  type ServiceRequestOffer = ServiceRequestListItem["offers"][number];

  return ok(
    requests.map((item: ServiceRequestListItem) => ({
      id: item.id,
      title: item.title,
      requirementText: item.requirementText,
      locationText: item.locationText,
      budgetMin: decimalToNumber(item.budgetMin),
      budgetMax: decimalToNumber(item.budgetMax),
      currency: item.currency,
      needsQuotation: item.needsQuotation,
      needsEbm: item.needsEbm,
      requestType: item.requestType,
      providerProfileId: item.providerProfileId,
      providerName: item.providerProfile?.businessName ?? null,
      serviceId: item.serviceId,
      serviceTitle: item.service?.title ?? null,
      organizationName: item.organizationName,
      organizationTinNumber: item.organizationTinNumber,
      purchaseCode: item.purchaseCode,
      paymentTerm: item.paymentTerm,
      paymentMethod: item.paymentMethod,
      paymentNote: item.paymentNote,
      paymentDueAt: item.paymentDueAt,
      documentFileName: item.documentFileName,
      requestedAmount: decimalToNumber(item.requestedAmount),
      status: item.status,
      category: item.category,
      offers: item.offers.map((offer: ServiceRequestOffer) => ({
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
