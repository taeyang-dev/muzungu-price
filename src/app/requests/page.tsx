import Link from "next/link";
import { getSessionForApp, writeSessionCookie, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsPanel } from "@/components/RequestsPanel";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import {
  buildReceivedRequestsWhere,
  buildSentRequestsWhere,
  loadVendorAccessForUser
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
  const session = await getSessionForApp();
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

  const { dbRole, providerProfileId, roleUpdated } = await loadVendorAccessForUser(
    session.userId,
    session.email
  );

  let effectiveSession: SessionPayload = session;
  if (roleUpdated && dbRole === "provider") {
    effectiveSession = { ...session, role: "provider" };
    await writeSessionCookie(effectiveSession);
  }

  const where =
    boxFilter === "sent"
      ? buildSentRequestsWhere(session.userId)
      : providerProfileId
        ? buildReceivedRequestsWhere(providerProfileId)
        : { id: "__none__" };

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
      key={`requests-${boxFilter}-${typeFilter}-${providerProfileId ?? "none"}`}
      boxFilter={boxFilter}
      locale={locale}
      mode="manage"
      requests={requests.map(mapServiceRequestItem)}
      role={effectiveSession.role}
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
