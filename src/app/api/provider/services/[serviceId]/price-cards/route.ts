import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  tier: z.enum(["basic", "standard", "premium"]),
  currency: z.string().length(3),
  basePrice: z.coerce.number().positive(),
  unit: z.enum(["per_hour", "per_day", "per_project"]),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  isPublic: z.boolean().default(true)
});

interface RouteParams {
  params: Promise<{ serviceId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const { serviceId } = await params;
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { providerProfile: true }
    });
    if (!service) {
      return fail("Service not found", 404, "NOT_FOUND");
    }
    if (service.providerProfile.userId !== auth.session.userId) {
      return fail("Insufficient permissions", 403, "AUTH_002");
    }

    const priceCard = await prisma.servicePriceCard.create({
      data: {
        serviceId,
        tier: payload.tier,
        currency: payload.currency.toUpperCase(),
        basePrice: payload.basePrice,
        unit: payload.unit,
        inclusions: payload.inclusions,
        exclusions: payload.exclusions,
        isPublic: payload.isPublic
      }
    });

    return ok(priceCard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to create price card", 500, "SERV_500");
  }
}
