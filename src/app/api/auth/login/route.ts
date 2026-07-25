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
    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        return fail(
          "No account data found. Run `npm run db:seed` first, or create a new account.",
          400,
          "AUTH_002"
        );
      }

      if (normalizedEmail === "admin@muzunguprice.com") {
        return fail(
          "Admin account is not in this database yet. Copy DATABASE_URL and DIRECT_URL from Vercel into your local .env, then run `npm run db:ensure-admin`.",
          401,
          "AUTH_003"
        );
      }
    }

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
    setSessionCookie(response, token, request);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Login failed", 500, "AUTH_500");
  }
}
