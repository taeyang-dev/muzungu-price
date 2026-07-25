import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const schema = z.object({
  docType: z.string().min(2),
  fileUrl: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith("data:") || isHttpUrl(value),
      "File must be an upload data URL or a valid URL"
    )
});

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const { caseId } = await params;
    const payload = schema.parse(await request.json());
    const verificationCase = await prisma.verificationCase.findUnique({
      where: { id: caseId },
      include: { providerProfile: true }
    });
    if (!verificationCase) {
      return fail("Submission target not found", 404, "NOT_FOUND");
    }
    if (verificationCase.providerProfile.userId !== auth.session.userId) {
      return fail("Insufficient permissions", 403, "AUTH_002");
    }
    if (!["draft", "pending", "on_hold"].includes(verificationCase.status)) {
      return fail("Documents cannot be uploaded for this review status", 400, "VER_005");
    }

    const document = await prisma.verificationDocument.create({
      data: {
        verificationCaseId: caseId,
        docType: payload.docType,
        fileUrl: payload.fileUrl
      }
    });
    return ok(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to upload document", 500, "VER_500");
  }
}
