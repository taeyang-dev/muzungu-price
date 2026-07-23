import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signSession } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const session = auth.session;
  if (session.role === "provider") {
    return ok({ role: "provider" });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { role: "provider" }
  });

  const nextToken = await signSession({
    ...session,
    role: "provider"
  });

  const response = ok({ role: "provider" });
  setSessionCookie(response, nextToken, request);
  return response;
}
