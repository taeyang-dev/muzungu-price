import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import {
  getAuthorizedRequestForDocuments,
  mapRequestDocumentRecord
} from "@/lib/request-document-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const idsParam = request.nextUrl.searchParams.get("ids")?.trim();
  if (!idsParam) {
    return ok([]);
  }

  const requestIds = [...new Set(idsParam.split(",").map((id) => id.trim()).filter(Boolean))].slice(
    0,
    100
  );
  if (requestIds.length === 0) {
    return ok([]);
  }

  const authorizedRequestIds: string[] = [];
  for (const requestId of requestIds) {
    const access = await getAuthorizedRequestForDocuments(auth.session, requestId);
    if (access.allowed) {
      authorizedRequestIds.push(requestId);
    }
  }

  if (authorizedRequestIds.length === 0) {
    return ok([]);
  }

  const documents = await prisma.requestDocument.findMany({
    where: { requestId: { in: authorizedRequestIds } },
    orderBy: { createdAt: "desc" }
  });

  return ok(documents.map(mapRequestDocumentRecord));
}
