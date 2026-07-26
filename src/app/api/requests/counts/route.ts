import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import { buildServiceRequestScopeWhere } from "@/lib/service-request-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const where = await buildServiceRequestScopeWhere(auth.session);
  if (!where) {
    return ok({ total: 0, quotation: 0, purchase: 0, ebm: 0 });
  }

  const [total, quotation, purchase, ebm] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.count({ where: { ...where, requestType: "quotation" } }),
    prisma.serviceRequest.count({ where: { ...where, requestType: "purchase" } }),
    prisma.serviceRequest.count({ where: { ...where, requestType: "ebm" } })
  ]);

  return ok({ total, quotation, purchase, ebm });
}
