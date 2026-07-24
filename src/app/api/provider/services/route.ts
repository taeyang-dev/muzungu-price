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
  categoryId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  imageUrl: imageValueSchema.optional().or(z.literal(""))
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: auth.session.userId }
    });
    if (!profile) {
      return fail("Provider profile does not exist", 404, "PROV_001");
    }

    const service = await prisma.service.create({
      data: {
        providerProfileId: profile.id,
        categoryId: payload.categoryId,
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl || null
      }
    });

    return ok(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to create service", 500, "SERV_500");
  }
}
