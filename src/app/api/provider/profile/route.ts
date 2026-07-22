import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  businessName: z.string().min(2),
  providerType: z.enum(["freelancer", "company"]),
  bio: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  categoryIds: z.array(z.string()).optional()
});

const updateSchema = createSchema.partial();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = createSchema.parse(await request.json());
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
        bio: payload.bio,
        country: payload.country,
        city: payload.city,
        categories: payload.categoryIds
          ? {
              createMany: {
                data: payload.categoryIds.map((categoryId) => ({ categoryId }))
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
        bio: payload.bio ?? undefined,
        country: payload.country ?? undefined,
        city: payload.city ?? undefined
      }
    });

    if (payload.categoryIds) {
      await prisma.providerCategory.deleteMany({ where: { providerProfileId: profile.id } });
      await prisma.providerCategory.createMany({
        data: payload.categoryIds.map((categoryId) => ({
          providerProfileId: profile.id,
          categoryId
        }))
      });
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update provider profile", 500, "PROV_500");
  }
}
