import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { listAdminProviders } from "@/lib/admin-providers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["admin"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const providers = await listAdminProviders();
  return ok(providers, { total: providers.length });
}
