import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { sendInboxMessage } from "@/lib/inbox";
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
      where: { id: caseId },
      include: {
        providerProfile: {
          select: { userId: true, businessName: true }
        }
      }
    });
    if (!verificationCase) {
      return fail("Verification case not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.verificationCase.update({
      where: { id: caseId },
      data: {
        status: payload.status,
        score: payload.score ?? 0,
        level: payload.level ?? "verified",
        notes: payload.notes || null,
        reviewedAt: new Date(),
        reviewerUserId: auth.session.userId
      }
    });

    const statusLabels: Record<string, { subject: string; body: string }> = {
      approved: {
        subject: "업체 심사가 승인되었습니다",
        body: `${verificationCase.providerProfile.businessName} 업체 심사가 승인되었습니다. 이제 마켓플레이스에 노출됩니다.`
      },
      rejected: {
        subject: "업체 심사가 반려되었습니다",
        body: `${verificationCase.providerProfile.businessName} 업체 심사가 반려되었습니다. 벤더 등록 페이지에서 서류를 보완한 뒤 다시 심사를 요청해 주세요.${
          payload.notes ? `\n\n관리자 메모: ${payload.notes}` : ""
        }`
      },
      on_hold: {
        subject: "업체 심사가 보류되었습니다",
        body: `${verificationCase.providerProfile.businessName} 업체 심사가 보류되었습니다. 추가 자료가 필요할 수 있습니다. 쪽지함과 벤더 등록 페이지를 확인해 주세요.${
          payload.notes ? `\n\n관리자 메모: ${payload.notes}` : ""
        }`
      }
    };

    const message = statusLabels[payload.status];
    if (message) {
      try {
        await sendInboxMessage({
          recipientUserId: verificationCase.providerProfile.userId,
          senderUserId: auth.session.userId,
          subject: message.subject,
          body: message.body
        });
      } catch (inboxError) {
        console.error("Failed to send inbox message after review:", inboxError);
      }
    }

    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    console.error("Failed to review verification case:", error);
    const message = error instanceof Error ? error.message : "Failed to review verification case";
    return fail(message, 500, "VER_500");
  }
}
