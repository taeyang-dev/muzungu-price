import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { signSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone, VERIFICATION_MAX_ATTEMPTS } from "@/lib/auth-verification";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(8).max(30).optional().or(z.literal("")),
  verificationChannel: z.enum(["email", "sms", "whatsapp"]),
  verificationCode: z.string().regex(/^\d{6}$/)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedName = payload.name.trim();
    const normalizedPhone = normalizePhone(payload.phone);
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      return fail("Email already exists", 409, "AUTH_003");
    }

    const destination =
      payload.verificationChannel === "email" ? normalizedEmail : normalizedPhone;
    if (!destination) {
      return fail(
        "Phone number is required for SMS or WhatsApp verification.",
        400,
        "AUTH_PHONE_REQUIRED"
      );
    }

    const verification = await prisma.authVerificationCode.findFirst({
      where: {
        email: normalizedEmail,
        purpose: "register",
        channel: payload.verificationChannel,
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!verification) {
      return fail("No active verification code. Please request a new code.", 400, "AUTH_NO_CODE");
    }
    if (verification.attempts >= VERIFICATION_MAX_ATTEMPTS) {
      return fail("Too many invalid attempts. Request a new code.", 429, "AUTH_TOO_MANY_ATTEMPTS");
    }
    if (verification.destination !== destination) {
      return fail("Verification destination has changed. Request a new code.", 400, "AUTH_DESTINATION_MISMATCH");
    }

    const validCode = await bcrypt.compare(payload.verificationCode, verification.codeHash);
    if (!validCode) {
      await prisma.authVerificationCode.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 }
      });
      return fail("Invalid verification code", 401, "AUTH_INVALID_CODE");
    }

    await prisma.authVerificationCode.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() }
    });

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        role: "customer",
        phone: normalizedPhone,
        passwordHash
      }
    });

    const token = await signSession({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name
    });

    const response = ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    setSessionCookie(response, token, request);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Registration failed", 500, "AUTH_500");
  }
}
