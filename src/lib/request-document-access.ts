import { prisma } from "@/lib/prisma";
import { loadVendorAccessForUser } from "@/lib/service-request-scope";

type SessionScope = {
  userId: string;
  role: string;
  email?: string | null;
};

export async function getAuthorizedRequestForDocuments(
  session: SessionScope,
  requestId: string
) {
  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requesterUserId: true,
      requestType: true,
      providerProfileId: true,
      providerProfile: {
        select: { userId: true, businessName: true }
      }
    }
  });

  if (!serviceRequest) {
    return { serviceRequest: null, allowed: false as const };
  }

  if (session.role === "admin" || serviceRequest.requesterUserId === session.userId) {
    return { serviceRequest, allowed: true as const };
  }

  const { providerProfileId } = await loadVendorAccessForUser(session.userId, session.email);
  if (providerProfileId && serviceRequest.providerProfileId === providerProfileId) {
    return { serviceRequest, allowed: true as const };
  }

  return { serviceRequest, allowed: false as const };
}

export function mapRequestDocumentRecord(document: {
  id: string;
  requestId: string;
  type: string;
  fileName: string;
  dataUrl: string;
  vendorProfileId: string | null;
  vendorName: string;
  createdAt: Date;
}) {
  return {
    id: document.id,
    requestId: document.requestId,
    vendorId: document.vendorProfileId ?? "provider",
    vendorName: document.vendorName,
    type: document.type,
    fileName: document.fileName,
    createdAt: document.createdAt.toISOString(),
    dataUrl: document.dataUrl
  };
}
