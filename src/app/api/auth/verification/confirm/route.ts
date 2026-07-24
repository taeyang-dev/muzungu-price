import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";
import { VERIFICATION_MAX_ATTEMPTS } from "@/lib/auth-verification";

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (!user) {
      return fail("Account not found for this email", 404, "AUTH_404");
    }

    const verificationCode = await prisma.authVerificationCode.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    if (!verificationCode) {
      return fail("No active verification code. Request a new one.", 400, "AUTH_NO_CODE");
    }
    if (verificationCode.attempts >= VERIFICATION_MAX_ATTEMPTS) {
      return fail("Too many invalid attempts. Request a new code.", 429, "AUTH_TOO_MANY_ATTEMPTS");
    }

    const matches = await bcrypt.compare(payload.code, verificationCode.codeHash);
    if (!matches) {
      await prisma.authVerificationCode.update({
        where: { id: verificationCode.id },
        data: { attempts: verificationCode.attempts + 1 }
      });
      return fail("Invalid verification code", 401, "AUTH_INVALID_CODE");
    }

    await prisma.authVerificationCode.update({
      where: { id: verificationCode.id },
      data: { consumedAt: new Date() }
    });

    const token = await signSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    });
    const response = ok({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    });
    setSessionCookie(response, token, request);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Verification failed", 500, "AUTH_VERIFY_500");
  }
}
