import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsPanel } from "@/components/RequestsPanel";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { buildServiceRequestScopeWhere } from "@/lib/service-request-scope";
import { mapServiceRequestItem, serviceRequestInclude } from "@/lib/service-request-mapper";

type RequestBoxFilter = "sent" | "received";
type RequestTypeFilter = "all" | "quotation" | "ebm";

function parseBoxFilter(value: string | null): RequestBoxFilter {
  return value === "received" ? "received" : "sent";
}

function parseTypeFilter(value: string | null): RequestTypeFilter {
  if (value === "quotation" || value === "ebm") {
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
  const boxFilter = parseBoxFilter(typeof params.box === "string" ? params.box : null);
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

  const scopedWhere = await buildServiceRequestScopeWhere(
    {
      userId: session.userId,
      role: session.role
    },
    boxFilter
  );

  if (!scopedWhere && boxFilter === "received") {
    return (
      <section className="panel">
        <h1>{tr(locale, "Requests", "요청서")}</h1>
        <p>
          {tr(
            locale,
            "Register as a vendor to view received requests.",
            "수신 요청을 보려면 벤더로 등록해 주세요."
          )}
        </p>
        <Link className="btn" href="/provider">
          {tr(locale, "Register as vendor", "벤더 등록")}
        </Link>
      </section>
    );
  }

  const requests = await prisma.serviceRequest.findMany({
    where: scopedWhere ?? { id: "__none__" },
    include: serviceRequestInclude,
    orderBy: { createdAt: "desc" }
  });

  const providerSelf =
    session.role === "provider"
      ? await prisma.providerProfile.findUnique({
          where: { userId: session.userId },
          include: { billingCapability: true }
        })
      : null;

  return (
    <RequestsPanel
      key={`requests-${boxFilter}-${typeFilter}`}
      boxFilter={boxFilter}
      locale={locale}
      mode="manage"
      requests={requests.map(mapServiceRequestItem)}
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
