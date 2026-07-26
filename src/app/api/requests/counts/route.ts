import { NextRequest, NextResponse } from "next/server";
import { ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import {
  buildReceivedRequestsWhere,
  buildSentRequestsWhere,
  countRequestsByType,
  getProviderProfileIdForUser
} from "@/lib/service-request-scope";

export const dynamic = "force-dynamic";

const emptyCounts = { total: 0, quotation: 0, ebm: 0 };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const sentCounts = await countRequestsByType(buildSentRequestsWhere(auth.session.userId));

  const providerProfileId = await getProviderProfileIdForUser(auth.session.userId);
  const receivedCounts = providerProfileId
    ? await countRequestsByType(buildReceivedRequestsWhere(providerProfileId))
    : emptyCounts;

  return ok({ sent: sentCounts, received: receivedCounts });
}
