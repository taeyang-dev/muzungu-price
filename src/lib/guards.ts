import { NextRequest } from "next/server";
import { AppRole, getSessionFromRequest, SessionPayload } from "@/lib/auth";
import { fail } from "@/lib/api";

export interface GuardResult {
  session: SessionPayload | null;
  error?: ReturnType<typeof fail>;
}

export async function requireSession(request: NextRequest): Promise<GuardResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { session: null, error: fail("Not authenticated", 401, "AUTH_001") };
  }
  return { session };
}

export async function requireRole(
  request: NextRequest,
  roles: AppRole[]
): Promise<GuardResult> {
  const auth = await requireSession(request);
  if (!auth.session) {
    return auth;
  }

  if (!roles.includes(auth.session.role)) {
    return { session: auth.session, error: fail("Insufficient permissions", 403, "AUTH_002") };
  }

  return auth;
}
