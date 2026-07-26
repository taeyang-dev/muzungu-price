import Link from "next/link";
import { decimalToNumber } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsPanel } from "@/components/RequestsPanel";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { buildServiceRequestScopeWhere } from "@/lib/service-request-scope";

type ServiceRequestWhereInput = NonNullable<
  Parameters<typeof prisma.serviceRequest.findMany>[0]
>["where"];

type RequestTypeFilter = "all" | "quotation" | "purchase" | "ebm";

function parseTypeFilter(value: string | null): RequestTypeFilter {
  if (value === "quotation" || value === "purchase" || value === "ebm") {
    return value;
  }
  return "all";
}

interface RequestsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const session = await getSession();
  const locale = await getLocaleFromCookies();
  const params = await searchParams;
  const typeFilter = parseTypeFilter(typeof params.type === "string" ? params.type : null);

  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Requests", "요청서")}</h1>
        <p>
          {tr(
            locale,
            "Please sign in to view and manage your requests.",
            "요청 내역을 보고 관리하려면 로그인해 주세요."
          )}
        </p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  const scopedWhere = await buildServiceRequestScopeWhere({
    userId: session.userId,
    role: session.role
  });
  const where = (scopedWhere ?? { id: "__none__" }) as ServiceRequestWhereInput;

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

  const providerSelf =
    session.role === "provider"
      ? await prisma.providerProfile.findUnique({
          where: { userId: session.userId },
          include: { billingCapability: true }
        })
      : null;

  type ServiceRequestListItem = (typeof requests)[number];
  type ServiceRequestOffer = ServiceRequestListItem["offers"][number];

  return (
    <RequestsPanel
      key={`requests-${session.role}-${typeFilter}`}
      locale={locale}
      mode="manage"
      requests={requests.map((item: ServiceRequestListItem) => ({
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
        offers: item.offers.map((offer: ServiceRequestOffer) => ({
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
      typeFilter={typeFilter}
      providerSelf={
        providerSelf
          ? {
              businessName: providerSelf.businessName,
              email: providerSelf.contactEmail ?? providerSelf.representativeEmail ?? "",
              phone: providerSelf.contactPhone ?? providerSelf.representativePhone ?? "",
              address: [providerSelf.city, providerSelf.country].filter(Boolean).join(", "),
              paymentMethod: providerSelf.billingCapability?.momoNumber?.trim()
                ? providerSelf.billingCapability?.bankAccountNumber?.trim()
                  ? undefined
                  : "momo"
                : "bank_transfer",
              bankName: providerSelf.billingCapability?.bankName ?? "",
              bankAccountName: providerSelf.billingCapability?.bankAccountName ?? "",
              bankAccountNumber: providerSelf.billingCapability?.bankAccountNumber ?? "",
              bankSwiftCode: providerSelf.billingCapability?.bankSwiftCode ?? "",
              momoAccountName: providerSelf.billingCapability?.momoAccountName ?? "",
              momoNumber: providerSelf.billingCapability?.momoNumber ?? ""
            }
          : null
      }
    />
  );
}
