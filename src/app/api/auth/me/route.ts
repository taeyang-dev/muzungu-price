import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return fail("Not authenticated", 401, "AUTH_001");
  }
  return ok(session);
}
