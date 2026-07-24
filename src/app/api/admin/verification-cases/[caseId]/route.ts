import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status: z.enum(["approved", "rejected", "on_hold"]),
  score: z.coerce.number().int().min(0).max(100).optional(),
  level: z.enum(["verified", "pro_verified", "premium_verified"]).optional(),
  notes: z.string().optional()
});

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["admin"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const { caseId } = await params;
    const verificationCase = await prisma.verificationCase.findUnique({
      where: { id: caseId }
    });
    if (!verificationCase) {
      return fail("Verification case not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.verificationCase.update({
      where: { id: caseId },
      data: {
        status: payload.status,
        score: payload.score,
        level: payload.level,
        notes: payload.notes,
        reviewedAt: new Date(),
        reviewerUserId: auth.session.userId
      }
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to review verification case", 500, "VER_500");
  }
}
