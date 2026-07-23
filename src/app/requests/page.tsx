import Link from "next/link";
import { Prisma } from "@prisma/client";
import { decimalToNumber } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsPanel } from "@/components/RequestsPanel";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";

interface RequestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const session = await getSession();
  const locale = await getLocaleFromCookies();
  const params = await searchParams;
  const vendorId = typeof params.vendorId === "string" ? params.vendorId : null;

  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Requests", "요청서")}</h1>
        <p>
          {tr(
            locale,
            "Please sign in to create requests or submit offers.",
            "요청서를 만들거나 오퍼를 제출하려면 로그인해 주세요."
          )}
        </p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  const canCreateVendorRequests = session.role === "customer" || session.role === "org_buyer";

  const vendorDirectory = await (
    canCreateVendorRequests
      ? prisma.providerProfile.findMany({
          select: { id: true, businessName: true },
          orderBy: { businessName: "asc" }
        })
      : Promise.resolve([])
  );

  const selectedVendorId = vendorId ?? vendorDirectory[0]?.id ?? null;
  const vendorContext = selectedVendorId
    ? await prisma.providerProfile.findUnique({
        where: { id: selectedVendorId },
        include: {
          services: {
            include: {
              category: true,
              priceCards: {
                where: { isPublic: true },
                orderBy: { basePrice: "asc" }
              }
            }
          },
          billingCapability: true
        }
      })
    : null;

  const where: Prisma.ServiceRequestWhereInput =
    session.role === "provider"
      ? { status: { in: ["open", "negotiating"] } }
      : { requesterUserId: session.userId };

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      category: true,
      providerProfile: true,
      service: true,
      offers: {
        include: {
          providerProfile: true
        },
        orderBy: { createdAt: "desc" }
      },
      booking: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <RequestsPanel
      locale={locale}
      requests={requests.map((item) => ({
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
        serviceId: item.serviceId,
        serviceTitle: item.service?.title ?? null,
        organizationName: item.organizationName,
        organizationTinNumber: item.organizationTinNumber,
        purchaseCode: item.purchaseCode,
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
      }))}
      role={session.role}
      selectedVendorId={selectedVendorId}
      vendorOptions={vendorDirectory}
      vendorContext={
        vendorContext
          ? {
              id: vendorContext.id,
              businessName: vendorContext.businessName,
              contactPhone: vendorContext.contactPhone,
              tinNumber: vendorContext.billingCapability?.vendorTinNumber ?? null,
              paymentTerms: vendorContext.billingCapability?.paymentTermsCsv
                ? vendorContext.billingCapability.paymentTermsCsv
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : [],
              paymentMethods: vendorContext.billingCapability?.paymentMethodsCsv
                ? vendorContext.billingCapability.paymentMethodsCsv
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean)
                : [],
              momoAccountName: vendorContext.billingCapability?.momoAccountName ?? null,
              momoNumber: vendorContext.billingCapability?.momoNumber ?? null,
              bankName: vendorContext.billingCapability?.bankName ?? null,
              bankAccountName: vendorContext.billingCapability?.bankAccountName ?? null,
              bankAccountNumber: vendorContext.billingCapability?.bankAccountNumber ?? null,
              bankSwiftCode: vendorContext.billingCapability?.bankSwiftCode ?? null,
              services: vendorContext.services.map((service) => ({
                id: service.id,
                title: service.title,
                categoryId: service.categoryId,
                categoryName: service.category.name,
                baseAmount:
                  service.priceCards.length > 0
                    ? decimalToNumber(service.priceCards[0]?.basePrice) ?? null
                    : null,
                baseCurrency: service.priceCards[0]?.currency ?? "RWF"
              }))
            }
          : null
      }
    />
  );
}
