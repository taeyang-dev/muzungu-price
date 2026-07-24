import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const imageValueSchema = z
  .string()
  .refine((value) => {
    if (value.length === 0) {
      return true;
    }
    if (value.startsWith("data:image/")) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Invalid image value");

const providerTypeSchema = z.enum([
  "freelancer",
  "company",
  "sole_proprietor",
  "partnership",
  "cooperative",
  "ngo",
  "other"
]);

const businessActivitySectorSchema = z.enum([
  "ict",
  "trade",
  "services",
  "construction",
  "manufacturing",
  "tourism",
  "agriculture",
  "logistics",
  "education",
  "health",
  "other"
]);

const representativeIdTypeSchema = z.enum(["passport", "national_id", "other"]);

const createSchema = z.object({
  businessName: z.string().min(2),
  providerType: providerTypeSchema,
  providerTypeOther: z.string().max(120).optional(),
  businessActivitySector: businessActivitySectorSchema,
  businessActivityCode: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(2).max(32).optional()
  ),
  businessActivityDetail: z.string().min(2).max(140),
  businessActivityOther: z.string().max(200).optional(),
  officialBusinessAddress: z.string().min(8),
  representativeName: z.string().min(2),
  representativeNationality: z.string().min(2),
  representativeIdType: representativeIdTypeSchema,
  representativeIdTypeOther: z.string().max(120).optional(),
  representativeIdNumber: z.string().min(4).max(80),
  representativeLocalAddress: z.string().min(5),
  representativeEmail: z.string().email(),
  representativePhone: z.string().min(6).max(40),
  tagline: z.string().max(140).optional(),
  bio: z.string().optional(),
  logoUrl: imageValueSchema.optional().or(z.literal("")),
  coverImageUrl: imageValueSchema.optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  yearsInBusiness: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(0).max(80).optional()
  ),
  country: z.string().optional(),
  city: z.string().optional(),
  categoryIds: z.array(z.string()).optional()
}).superRefine((payload, ctx) => {
  if (payload.providerType === "other" && !payload.providerTypeOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Business type detail is required when selecting Other",
      path: ["providerTypeOther"]
    });
  }

  if (
    (payload.businessActivitySector === "other" || payload.businessActivityDetail?.toLowerCase() === "other") &&
    !payload.businessActivityOther?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Business activity detail is required when selecting Other",
      path: ["businessActivityOther"]
    });
  }

  if (payload.representativeIdType === "other" && !payload.representativeIdTypeOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Representative ID type detail is required when selecting Other",
      path: ["representativeIdTypeOther"]
    });
  }
});

const updateSchema = createSchema.partial();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = createSchema.parse(await request.json());
    const categoryIds = payload.categoryIds?.filter((item) => item.length > 0) ?? [];
    const existing = await prisma.providerProfile.findUnique({
      where: { userId: auth.session.userId }
    });
    if (existing) {
      return fail("Provider profile already exists", 409, "PROV_002");
    }

    const profile = await prisma.providerProfile.create({
      data: {
        userId: auth.session.userId,
        businessName: payload.businessName,
        providerType: payload.providerType,
        providerTypeOther: payload.providerTypeOther?.trim() || null,
        businessActivitySector: payload.businessActivitySector,
        businessActivityCode: payload.businessActivityCode?.trim() || null,
        businessActivityDetail: payload.businessActivityDetail.trim(),
        businessActivityOther: payload.businessActivityOther?.trim() || null,
        officialBusinessAddress: payload.officialBusinessAddress.trim(),
        representativeName: payload.representativeName.trim(),
        representativeNationality: payload.representativeNationality.trim(),
        representativeIdType: payload.representativeIdType,
        representativeIdTypeOther: payload.representativeIdTypeOther?.trim() || null,
        representativeIdNumber: payload.representativeIdNumber.trim(),
        representativeLocalAddress: payload.representativeLocalAddress.trim(),
        representativeEmail: payload.representativeEmail.trim(),
        representativePhone: payload.representativePhone.trim(),
        tagline: payload.tagline,
        bio: payload.bio,
        logoUrl: payload.logoUrl || null,
        coverImageUrl: payload.coverImageUrl || null,
        contactEmail: payload.contactEmail || payload.representativeEmail || null,
        contactPhone: payload.contactPhone || payload.representativePhone || null,
        websiteUrl: payload.websiteUrl || null,
        yearsInBusiness: payload.yearsInBusiness,
        country: payload.country?.trim() || null,
        city: payload.city?.trim() || null,
        categories: categoryIds.length > 0
          ? {
              createMany: {
                data: categoryIds.map((categoryId) => ({ categoryId }))
              }
            }
          : undefined
      },
      include: {
        categories: { include: { category: true } }
      }
    });

    return ok(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to create provider profile", 500, "PROV_500");
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = updateSchema.parse(await request.json());
    const categoryIds = payload.categoryIds?.filter((item) => item.length > 0);
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: auth.session.userId }
    });
    if (!profile) {
      return fail("Provider profile does not exist", 404, "PROV_001");
    }

    const updated = await prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        businessName: payload.businessName ?? undefined,
        providerType: payload.providerType ?? undefined,
        providerTypeOther:
          payload.providerTypeOther === undefined ? undefined : payload.providerTypeOther.trim() || null,
        businessActivitySector: payload.businessActivitySector ?? undefined,
        businessActivityCode:
          payload.businessActivityCode === undefined ? undefined : payload.businessActivityCode.trim() || null,
        businessActivityDetail:
          payload.businessActivityDetail === undefined ? undefined : payload.businessActivityDetail.trim() || null,
        businessActivityOther:
          payload.businessActivityOther === undefined ? undefined : payload.businessActivityOther.trim() || null,
        officialBusinessAddress:
          payload.officialBusinessAddress === undefined
            ? undefined
            : payload.officialBusinessAddress.trim() || null,
        representativeName:
          payload.representativeName === undefined ? undefined : payload.representativeName.trim() || null,
        representativeNationality:
          payload.representativeNationality === undefined
            ? undefined
            : payload.representativeNationality.trim() || null,
        representativeIdType: payload.representativeIdType ?? undefined,
        representativeIdTypeOther:
          payload.representativeIdTypeOther === undefined
            ? undefined
            : payload.representativeIdTypeOther.trim() || null,
        representativeIdNumber:
          payload.representativeIdNumber === undefined ? undefined : payload.representativeIdNumber.trim() || null,
        representativeLocalAddress:
          payload.representativeLocalAddress === undefined
            ? undefined
            : payload.representativeLocalAddress.trim() || null,
        representativeEmail:
          payload.representativeEmail === undefined ? undefined : payload.representativeEmail.trim() || null,
        representativePhone:
          payload.representativePhone === undefined ? undefined : payload.representativePhone.trim() || null,
        tagline: payload.tagline ?? undefined,
        bio: payload.bio ?? undefined,
        logoUrl: payload.logoUrl === undefined ? undefined : payload.logoUrl || null,
        coverImageUrl:
          payload.coverImageUrl === undefined ? undefined : payload.coverImageUrl || null,
        contactEmail:
          payload.contactEmail === undefined
            ? payload.representativeEmail === undefined
              ? undefined
              : payload.representativeEmail || null
            : payload.contactEmail || null,
        contactPhone:
          payload.contactPhone === undefined
            ? payload.representativePhone === undefined
              ? undefined
              : payload.representativePhone || null
            : payload.contactPhone || null,
        websiteUrl: payload.websiteUrl === undefined ? undefined : payload.websiteUrl || null,
        yearsInBusiness: payload.yearsInBusiness ?? undefined,
        country: payload.country ?? undefined,
        city: payload.city ?? undefined
      }
    });

    if (categoryIds !== undefined) {
      await prisma.providerCategory.deleteMany({ where: { providerProfileId: profile.id } });
      if (categoryIds.length > 0) {
        await prisma.providerCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            providerProfileId: profile.id,
            categoryId
          }))
        });
      }
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update provider profile", 500, "PROV_500");
  }
}
