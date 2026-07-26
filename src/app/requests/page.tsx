import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsPanel } from "@/components/RequestsPanel";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import {
  buildReceivedRequestsWhere,
  buildSentRequestsWhere,
  getProviderProfileIdForUser
} from "@/lib/service-request-scope";
import { mapServiceRequestItem, serviceRequestInclude } from "@/lib/service-request-mapper";

export const dynamic = "force-dynamic";

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

  const providerProfileId = await getProviderProfileIdForUser(session.userId);

  if (boxFilter === "received" && !providerProfileId) {
    return (
      <section className="grid">
        <h1 style={{ marginBottom: 0 }}>{tr(locale, "Requests", "요청서")}</h1>
        <article className="panel">
          <p className="muted" style={{ marginTop: 0 }}>
            {session.role === "provider"
              ? tr(
                  locale,
                  "Complete your vendor profile setup to view received requests.",
                  "수신 요청을 보려면 업체 프로필 등록을 완료해 주세요."
                )
              : tr(
                  locale,
                  "Switch to vendor mode and complete vendor profile setup to receive customer requests.",
                  "고객 요청을 받으려면 벤더 모드로 전환한 뒤 업체 프로필 등록을 완료해 주세요."
                )}
          </p>
          <Link className="btn" href="/provider">
            {session.role === "provider"
              ? tr(locale, "Complete vendor profile", "업체 프로필 등록 완료하기")
              : tr(locale, "Register as vendor", "벤더 등록")}
          </Link>
        </article>
      </section>
    );
  }

  const where =
    boxFilter === "sent"
      ? buildSentRequestsWhere(session.userId)
      : buildReceivedRequestsWhere(providerProfileId!);

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: serviceRequestInclude,
    orderBy: { createdAt: "desc" }
  });

  const providerSelf = providerProfileId
    ? await prisma.providerProfile.findUnique({
        where: { id: providerProfileId },
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
