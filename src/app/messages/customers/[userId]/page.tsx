import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerMessageComposer } from "@/components/CustomerMessageComposer";
import { getSessionForApp } from "@/lib/auth";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { loadVendorAccessForUser } from "@/lib/service-request-scope";

export const dynamic = "force-dynamic";

interface CustomerMessagePageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomerMessagePage({
  params,
  searchParams
}: CustomerMessagePageProps) {
  const session = await getSessionForApp();
  const locale = await getLocaleFromCookies();
  const { userId } = await params;
  const query = await searchParams;
  const requestId = typeof query.requestId === "string" ? query.requestId : undefined;

  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Message customer", "손님에게 메시지")}</h1>
        <p>{tr(locale, "Please sign in first.", "먼저 로그인해 주세요.")}</p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  const { providerProfileId } = await loadVendorAccessForUser(
    session.userId,
    session.email
  );
  if (!providerProfileId) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Message customer", "손님에게 메시지")}</h1>
        <p className="muted">
          {tr(
            locale,
            "Complete your vendor profile setup before messaging customers.",
            "손님에게 메시지를내려면 먼저 업체 프로필 등록을 완료해 주세요."
          )}
        </p>
        <Link className="btn" href="/provider">
          {tr(locale, "Complete vendor profile", "업체 프로필 등록 완료하기")}
        </Link>
      </section>
    );
  }

  const customer = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true }
  });

  if (!customer) {
    notFound();
  }

  const serviceRequest = requestId
    ? await prisma.serviceRequest.findFirst({
        where: {
          id: requestId,
          requesterUserId: userId,
          providerProfileId
        },
        select: {
          id: true,
          requestType: true,
          service: { select: { title: true } }
        }
      })
    : await prisma.serviceRequest.findFirst({
        where: {
          requesterUserId: userId,
          providerProfileId,
          status: { notIn: ["cancelled"] }
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          requestType: true,
          service: { select: { title: true } }
        }
      });

  if (!serviceRequest) {
    notFound();
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { businessName: true }
  });

  const requestLabel =
    serviceRequest.requestType === "ebm"
      ? tr(locale, "EBM request", "EBM 요청")
      : tr(locale, "Quotation request", "견적서 요청");

  const defaultSubject = `${provider?.businessName ?? tr(locale, "Vendor", "업체")} · ${requestLabel}`;

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>
        {tr(locale, "Message this customer", "이 손님에게 메시지 보내기")}
      </h1>
      <p className="muted" style={{ marginTop: "6px" }}>
        {tr(locale, "To", "받는 사람")}: <strong>{customer.name}</strong>
      </p>
      <article className="panel">
        <CustomerMessageComposer
          customerName={customer.name}
          customerUserId={customer.id}
          defaultSubject={defaultSubject}
          locale={locale}
          requestId={serviceRequest.id}
        />
      </article>
      <Link className="btn secondary" href="/requests?box=received">
        {tr(locale, "Back to received requests", "수신 요청으로 돌아가기")}
      </Link>
    </section>
  );
}
