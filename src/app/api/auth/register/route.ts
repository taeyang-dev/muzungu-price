import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { signSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(8).max(30).optional().or(z.literal(""))
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedName = payload.name.trim();
    const normalizedPhone = payload.phone ? payload.phone.trim() : null;
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existing) {
      return fail("Email already exists", 409, "AUTH_003");
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        role: "customer",
        phone: normalizedPhone || null,
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
