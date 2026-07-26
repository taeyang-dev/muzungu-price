import { decimalToNumber } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type ServiceRequestRecord = Awaited<
  ReturnType<
    typeof prisma.serviceRequest.findMany<{
      include: {
        category: true;
        providerProfile: true;
        service: true;
        requester: { select: { name: true } };
        offers: { include: { providerProfile: true } };
        booking: true;
      };
    }>
  >
>[number];

export type MappedServiceRequestItem = {
  id: string;
  title: string;
  requirementText: string;
  locationText: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string | null;
  needsQuotation: boolean;
  needsEbm: boolean;
  requestType: string;
  providerProfileId: string | null;
  providerName: string | null;
  requesterName: string | null;
  requesterUserId: string | null;
  createdAt: string;
  serviceId: string | null;
  serviceTitle: string | null;
  organizationName: string | null;
  organizationTinNumber: string | null;
  purchaseCode: string | null;
  purchaseCodeUpdatedAt: string | null;
  paymentTerm: string | null;
  paymentMethod: string | null;
  paymentNote: string | null;
  paymentDueAt: string | null;
  documentFileName: string | null;
  requestedAmount: number | null;
  status: string;
  category: { name: string };
  offers: Array<{
    id: string;
    providerName: string;
    quotedPrice: number;
    currency: string;
    status: string;
    canIssueQuotation: boolean;
    canIssueEbm: boolean;
  }>;
  booking: {
    id: string;
    status: string;
    finalPrice: number;
    currency: string;
  } | null;
};

export function mapServiceRequestItem(item: ServiceRequestRecord): MappedServiceRequestItem {
  return {
    id: item.id,
    title: item.title,
    requirementText: item.requirementText,
    locationText: item.locationText,
    budgetMin: decimalToNumber(item.budgetMin),
    budgetMax: decimalToNumber(item.budgetMax),
    currency: item.currency,
    needsQuotation: item.needsQuotation,
    needsEbm: item.needsEbm,
    requestType: item.requestType,
    providerProfileId: item.providerProfileId,
    providerName: item.providerProfile?.businessName ?? null,
    requesterName: item.requester?.name ?? null,
    requesterUserId: item.requesterUserId,
    createdAt: item.createdAt.toISOString(),
    serviceId: item.serviceId,
    serviceTitle: item.service?.title ?? null,
    organizationName: item.organizationName,
    organizationTinNumber: item.organizationTinNumber,
    purchaseCode: item.purchaseCode,
    purchaseCodeUpdatedAt: item.purchaseCodeUpdatedAt?.toISOString() ?? null,
    paymentTerm: item.paymentTerm,
    paymentMethod: item.paymentMethod,
    paymentNote: item.paymentNote,
    paymentDueAt: item.paymentDueAt?.toISOString() ?? null,
    documentFileName: item.documentFileName,
    requestedAmount: decimalToNumber(item.requestedAmount),
    status: item.status,
    category: {
      name: item.category.name
    },
    offers: item.offers.map((offer) => ({
      id: offer.id,
      providerName: offer.providerProfile.businessName,
      quotedPrice: decimalToNumber(offer.quotedPrice) ?? 0,
      currency: offer.currency,
      status: offer.status,
      canIssueQuotation: offer.canIssueQuotation,
      canIssueEbm: offer.canIssueEbm
    })),
    booking: item.booking
      ? {
          id: item.booking.id,
          status: item.booking.status,
          finalPrice: decimalToNumber(item.booking.finalPrice) ?? 0,
          currency: item.booking.currency
        }
      : null
  };
}

export const serviceRequestInclude = {
  category: true,
  providerProfile: true,
  service: true,
  requester: { select: { name: true } },
  offers: {
    include: {
      providerProfile: true
    },
    orderBy: { createdAt: "desc" as const }
  },
  booking: true
};
