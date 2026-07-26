import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { mapServiceRequestItem, serviceRequestInclude } from "@/lib/service-request-mapper";
import { buildServiceRequestScopeWhere } from "@/lib/service-request-scope";
import { prisma } from "@/lib/prisma";

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
      return fail("Purchase requests are no longer supported", 400, "VAL_001");
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

    if (payload.serviceId && providerProfileId) {
      const existingRequest = await prisma.serviceRequest.findFirst({
        where: {
          requesterUserId: auth.session.userId,
          providerProfileId,
          serviceId: payload.serviceId,
          requestType: payload.requestType,
          status: { notIn: ["completed", "cancelled"] }
        },
        select: { id: true }
      });

      if (existingRequest) {
        return fail("This request already exists.", 409, "REQ_409");
      }
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
        paymentDueAt: null,
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

  const boxParam = request.nextUrl.searchParams.get("box");
  const box = boxParam === "received" ? "received" : "sent";
  const where = await buildServiceRequestScopeWhere(auth.session, box);
  if (!where) {
    return ok([], { total: 0 });
  }

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: serviceRequestInclude,
    orderBy: { createdAt: "desc" }
  });

  return ok(
    requests.map(mapServiceRequestItem),
    { total: requests.length }
  );
}
