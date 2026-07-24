import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT, JWTPayload } from "jose";

export type AppRole = "customer" | "provider" | "org_buyer" | "admin";

export interface SessionPayload extends JWTPayload {
  userId: string;
  role: AppRole;
  email: string;
  name: string;
}

const SESSION_COOKIE = "muzungu_session";
const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "muzungu-dev-secret-unsafe"
);

function shouldUseSecureCookie(request?: NextRequest): boolean {
  if (!request) {
    return process.env.NODE_ENV === "production";
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.includes("https");
  }

  const protocol = request.nextUrl.protocol.replace(":", "");
  if (protocol) {
    return protocol === "https";
  }

  return process.env.NODE_ENV === "production";
}

export async function signSession(session: SessionPayload): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, secretKey);
    const payload = verified.payload as unknown as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySession(token);
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySession(token);
}

export function setSessionCookie(response: NextResponse, token: string, request?: NextRequest): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: NextResponse, request?: NextRequest): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function hasRole(session: SessionPayload | null, roles: AppRole[]): boolean {
  if (!session) {
    return false;
  }
  return roles.includes(session.role);
}
