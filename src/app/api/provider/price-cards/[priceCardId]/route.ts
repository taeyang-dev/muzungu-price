import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  basePrice: z.coerce.number().positive().optional(),
  unit: z.enum(["per_hour", "per_day", "per_project", "per_person"]).optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  isPublic: z.boolean().optional()
});

interface RouteParams {
  params: Promise<{ priceCardId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const { priceCardId } = await params;
    const priceCard = await prisma.servicePriceCard.findUnique({
      where: { id: priceCardId },
      include: { service: { include: { providerProfile: true } } }
    });
    if (!priceCard) {
      return fail("Price card not found", 404, "NOT_FOUND");
    }
    if (priceCard.service.providerProfile.userId !== auth.session.userId) {
      return fail("Insufficient permissions", 403, "AUTH_002");
    }

    const updated = await prisma.servicePriceCard.update({
      where: { id: priceCardId },
      data: {
        basePrice: payload.basePrice,
        unit: payload.unit,
        inclusions: payload.inclusions,
        exclusions: payload.exclusions,
        isPublic: payload.isPublic
      }
    });
    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update price card", 500, "SERV_500");
  }
}
