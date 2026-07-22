import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      return fail("Invalid email or password", 401, "AUTH_001");
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return fail("Invalid email or password", 401, "AUTH_001");
    }

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
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Login failed", 500, "AUTH_500");
  }
}
