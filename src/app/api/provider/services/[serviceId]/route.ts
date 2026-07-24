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

const schema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  imageUrl: imageValueSchema.optional().or(z.literal("")),
  isActive: z.boolean().optional()
});

interface RouteParams {
  params: Promise<{ serviceId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl === undefined ? undefined : payload.imageUrl || null,
        isActive: payload.isActive
      }
    });
    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update service", 500, "SERV_500");
  }
}
