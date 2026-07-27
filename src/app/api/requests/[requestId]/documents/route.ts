import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/guards";
import {
  getAuthorizedRequestForDocuments,
  mapRequestDocumentRecord
} from "@/lib/request-document-access";
import { loadVendorAccessForUser } from "@/lib/service-request-scope";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

const MAX_DATA_URL_LENGTH = 4_500_000;

const uploadSchema = z.object({
  type: z.enum(["quotation", "ebm"]),
  fileName: z.string().trim().min(1).max(255),
  dataUrl: z.string().trim().min(1).max(MAX_DATA_URL_LENGTH)
});

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireSession(request);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { requestId } = await params;
  const { providerProfileId } = await loadVendorAccessForUser(
    auth.session.userId,
    auth.session.email
  );

  if (!providerProfileId) {
    return fail("Vendor profile is required", 403, "AUTH_002");
  }

  try {
    const payload = uploadSchema.parse(await request.json());
    const access = await getAuthorizedRequestForDocuments(auth.session, requestId);

    if (!access.allowed || !access.serviceRequest) {
      return fail("Request not found", 404, "NOT_FOUND");
    }

    if (access.serviceRequest.providerProfileId !== providerProfileId) {
      return fail("Insufficient permissions", 403, "AUTH_002");
    }

    if (access.serviceRequest.requestType !== payload.type) {
      return fail("Document type does not match request type", 400, "VAL_001");
    }

    const vendorName = access.serviceRequest.providerProfile?.businessName ?? "Vendor";
    const document = await prisma.requestDocument.create({
      data: {
        requestId,
        type: payload.type,
        fileName: payload.fileName,
        dataUrl: payload.dataUrl,
        vendorProfileId: providerProfileId,
        vendorName,
        uploadedByUserId: auth.session.userId
      }
    });

    return ok(mapRequestDocumentRecord(document));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to upload document", 500, "REQ_500");
  }
}
