import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = ok({ success: true });
  clearSessionCookie(response, request);
  return response;
}
