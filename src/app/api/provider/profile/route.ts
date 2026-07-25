import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { normalizeCityInput, normalizeCountryInput } from "@/lib/location";
import { prisma } from "@/lib/prisma";
import { ensureDraftVerificationCase } from "@/lib/verification-case";

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

const profileSchemaBase = z.object({
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
});

function validateConditionalOtherFields(
  payload: Partial<z.infer<typeof profileSchemaBase>>,
  ctx: z.RefinementCtx
): void {
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
}

const createSchema = profileSchemaBase
  .extend({
    city: z.string().min(2),
    country: z.string().min(2)
  })
  .superRefine((payload, ctx) => {
    validateConditionalOtherFields(payload, ctx);
  });

const updateSchema = profileSchemaBase.partial().superRefine((payload, ctx) => {
  validateConditionalOtherFields(payload, ctx);
});

const draftCreateSchema = profileSchemaBase.partial();
const draftUpdateSchema = profileSchemaBase.partial();

type ProfileFormInput = Partial<{
  [K in keyof z.infer<typeof profileSchemaBase>]: z.infer<typeof profileSchemaBase>[K] | null | undefined;
}>;

function buildProfileData(
  payload: ProfileFormInput,
  isDraft: boolean
): {
  businessName: string;
  providerType: z.infer<typeof providerTypeSchema>;
  providerTypeOther: string | null;
  businessActivitySector: string | null;
  businessActivityCode: string | null;
  businessActivityDetail: string | null;
  businessActivityOther: string | null;
  officialBusinessAddress: string | null;
  representativeName: string | null;
  representativeNationality: string | null;
  representativeIdType: string | null;
  representativeIdTypeOther: string | null;
  representativeIdNumber: string | null;
  representativeLocalAddress: string | null;
  representativeEmail: string | null;
  representativePhone: string | null;
  tagline: string | null | undefined;
  bio: string | null | undefined;
  logoUrl: string | null | undefined;
  coverImageUrl: string | null | undefined;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null | undefined;
  yearsInBusiness: number | null | undefined;
  country: string | null;
  city: string | null;
} {
  const representativeEmail = payload.representativeEmail?.trim() || null;
  const representativePhone = payload.representativePhone?.trim() || null;

  return {
    businessName: payload.businessName?.trim() || (isDraft ? "임시 저장" : ""),
    providerType: (payload.providerType as z.infer<typeof providerTypeSchema> | null | undefined) ?? "company",
    providerTypeOther: payload.providerTypeOther?.trim() || null,
    businessActivitySector: payload.businessActivitySector ?? null,
    businessActivityCode: payload.businessActivityCode?.trim() || null,
    businessActivityDetail: payload.businessActivityDetail?.trim() || null,
    businessActivityOther: payload.businessActivityOther?.trim() || null,
    officialBusinessAddress: payload.officialBusinessAddress?.trim() || null,
    representativeName: payload.representativeName?.trim() || null,
    representativeNationality: payload.representativeNationality?.trim() || null,
    representativeIdType: payload.representativeIdType ?? null,
    representativeIdTypeOther: payload.representativeIdTypeOther?.trim() || null,
    representativeIdNumber: payload.representativeIdNumber?.trim() || null,
    representativeLocalAddress: payload.representativeLocalAddress?.trim() || null,
    representativeEmail,
    representativePhone,
    tagline: payload.tagline,
    bio: payload.bio,
    logoUrl: payload.logoUrl || null,
    coverImageUrl: payload.coverImageUrl || null,
    contactEmail: payload.contactEmail?.trim() || representativeEmail,
    contactPhone: payload.contactPhone?.trim() || representativePhone,
    websiteUrl: payload.websiteUrl || null,
    yearsInBusiness: payload.yearsInBusiness,
    country: payload.country ? normalizeCountryInput(payload.country) : null,
    city: payload.city ? normalizeCityInput(payload.city) : null
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const requestBody = (await request.json()) as Record<string, unknown>;
    const isDraft = requestBody.draft === true;
    delete requestBody.draft;
    const payload = isDraft ? draftCreateSchema.parse(requestBody) : createSchema.parse(requestBody);
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
        ...buildProfileData(payload, isDraft),
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

    await ensureDraftVerificationCase(profile.id);

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
    const requestBody = (await request.json()) as Record<string, unknown>;
    const isDraft = requestBody.draft === true;
    delete requestBody.draft;
    const payload = isDraft ? draftUpdateSchema.parse(requestBody) : updateSchema.parse(requestBody);
    const categoryIds = payload.categoryIds?.filter((item) => item.length > 0);
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: auth.session.userId }
    });
    if (!profile) {
      return fail("Provider profile does not exist", 404, "PROV_001");
    }

    const draftData = isDraft ? buildProfileData(payload, true) : null;

    const updated = await prisma.providerProfile.update({
      where: { id: profile.id },
      data: isDraft
        ? {
            businessName: draftData?.businessName,
            providerType: draftData?.providerType,
            providerTypeOther: draftData?.providerTypeOther,
            businessActivitySector: draftData?.businessActivitySector,
            businessActivityCode: draftData?.businessActivityCode,
            businessActivityDetail: draftData?.businessActivityDetail,
            businessActivityOther: draftData?.businessActivityOther,
            officialBusinessAddress: draftData?.officialBusinessAddress,
            representativeName: draftData?.representativeName,
            representativeNationality: draftData?.representativeNationality,
            representativeIdType: draftData?.representativeIdType,
            representativeIdTypeOther: draftData?.representativeIdTypeOther,
            representativeIdNumber: draftData?.representativeIdNumber,
            representativeLocalAddress: draftData?.representativeLocalAddress,
            representativeEmail: draftData?.representativeEmail,
            representativePhone: draftData?.representativePhone,
            tagline: draftData?.tagline,
            bio: draftData?.bio,
            logoUrl: draftData?.logoUrl,
            coverImageUrl: draftData?.coverImageUrl,
            contactEmail: draftData?.contactEmail,
            contactPhone: draftData?.contactPhone,
            websiteUrl: draftData?.websiteUrl,
            yearsInBusiness: draftData?.yearsInBusiness,
            country: draftData?.country,
            city: draftData?.city
          }
        : {
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
        country:
          payload.country === undefined ? undefined : normalizeCountryInput(payload.country),
        city: payload.city === undefined ? undefined : normalizeCityInput(payload.city)
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

    await ensureDraftVerificationCase(updated.id);

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update provider profile", 500, "PROV_500");
  }
}
