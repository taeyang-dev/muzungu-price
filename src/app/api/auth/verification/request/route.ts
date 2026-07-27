import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  deliverVerificationCode,
  generateVerificationCode,
  normalizePhone,
  VERIFICATION_CODE_TTL_SECONDS,
  VERIFICATION_REQUEST_COOLDOWN_SECONDS
} from "@/lib/auth-verification";

const schema = z.object({
  email: z.string().email(),
  channel: z.enum(["email", "sms", "whatsapp"]),
  purpose: z.enum(["register", "login"]).default("register"),
  phone: z.string().min(8).max(30).optional().or(z.literal(""))
});

function maskDestination(channel: "email" | "sms" | "whatsapp", destination: string): string {
  if (channel === "email") {
    const [name, domain] = destination.split("@");
    if (!name || !domain) {
      return destination;
    }
    const shown = name.length <= 2 ? name[0] ?? "*" : `${name.slice(0, 2)}***`;
    return `${shown}@${domain}`;
  }

  if (destination.length <= 4) {
    return "***";
  }
  return `${destination.slice(0, 3)}***${destination.slice(-3)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());

    if (payload.purpose === "register" && payload.channel === "whatsapp") {
      return fail("WhatsApp verification is not available yet.", 400, "AUTH_WHATSAPP_DISABLED");
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(payload.phone);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    let destination: string | null = null;
    let userId: string | null = null;

    if (payload.purpose === "login") {
      if (!user) {
        return fail("Account not found for this email", 404, "AUTH_404");
      }
      userId = user.id;
      destination = payload.channel === "email" ? user.email : normalizePhone(user.phone);
      if (!destination) {
        return fail(
          "This account does not have a verified phone number. Use email verification or add phone first.",
          400,
          "AUTH_PHONE_REQUIRED"
        );
      }
    } else {
      if (user) {
        return fail("Email already exists", 409, "AUTH_003");
      }
      destination = payload.channel === "email" ? normalizedEmail : normalizedPhone;
      if (!destination) {
        return fail(
          "Phone number is required for SMS or WhatsApp verification.",
          400,
          "AUTH_PHONE_REQUIRED"
        );
      }
    }

    const cooldownThreshold = new Date(
      Date.now() - VERIFICATION_REQUEST_COOLDOWN_SECONDS * 1000
    );
    const recentCode = await prisma.authVerificationCode.findFirst({
      where: {
        email: normalizedEmail,
        purpose: payload.purpose,
        consumedAt: null,
        createdAt: { gte: cooldownThreshold }
      },
      orderBy: { createdAt: "desc" }
    });
    if (recentCode) {
      return fail(
        `Please wait ${VERIFICATION_REQUEST_COOLDOWN_SECONDS} seconds before requesting a new code.`,
        429,
        "AUTH_COOLDOWN"
      );
    }

    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_SECONDS * 1000);

    await prisma.authVerificationCode.create({
      data: {
        userId,
        email: normalizedEmail,
        purpose: payload.purpose,
        channel: payload.channel,
        destination,
        codeHash,
        expiresAt
      }
    });

    const delivery = await deliverVerificationCode(payload.channel, destination, code);
    const responseData: Record<string, unknown> = {
      channel: payload.channel,
      destinationMasked: maskDestination(payload.channel, destination),
      expiresInSeconds: VERIFICATION_CODE_TTL_SECONDS,
      provider: delivery.provider,
      mocked: delivery.mocked
    };
    if (process.env.NODE_ENV !== "production") {
      responseData.debugCode = code;
    }

    return ok(responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    if (error instanceof Error) {
      return fail(error.message, 500, "AUTH_VERIFY_500");
    }
    return fail("Failed to send verification code", 500, "AUTH_VERIFY_500");
  }
}
