import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ProviderProfileServiceSetup } from "@/components/provider/ProviderProfileServiceSetup";
import { BecomeProviderButton } from "@/components/BecomeProviderButton";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { loadProviderPageData } from "@/lib/provider-data";

export default async function MyPage() {
  const session = await getSession();
  const locale = await getLocaleFromCookies();

  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "My page", "마이페이지")}</h1>
        <p>{tr(locale, "Please sign in first.", "먼저 로그인해 주세요.")}</p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  const data = session.role === "provider" ? await loadProviderPageData(session.userId) : null;

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "My page", "마이페이지")}</h1>
      <p className="muted">
        {session.name} · {session.role}
      </p>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Account", "계정")}</h2>
        <nav className="drawer-nav">
          <Link href="/requests">{tr(locale, "Requests", "요청서")}</Link>
          <Link href="/inbox">{tr(locale, "Inbox", "쪽지함")}</Link>
          {session.role !== "provider" && (
            <Link href="/provider">{tr(locale, "Register as vendor", "벤더 등록")}</Link>
          )}
          {session.role === "provider" && (
            <>
              <Link href="/provider">{tr(locale, "Vendor registration", "벤더 등록")}</Link>
              <Link href="/provider/setup">{tr(locale, "Vendor review status", "벤더 심사 현황")}</Link>
            </>
          )}
        </nav>
      </article>

      {session.role === "provider" && data?.profile && (
        <ProviderProfileServiceSetup
          categories={data.categories}
          locale={locale}
          profile={data.profile}
          service={data.service}
          showIntro={false}
          verificationApproved={data.verificationStatus === "approved"}
        />
      )}

      {session.role === "provider" && !data?.profile && (
        <article className="panel">
          <p className="muted">
            {tr(
              locale,
              "Complete vendor registration to manage your public profile and services here.",
              "벤더 등록을 완료하면 여기에서 노출 프로필과 서비스를 관리할 수 있습니다."
            )}
          </p>
          <BecomeProviderButton locale={locale} />
        </article>
      )}
    </section>
  );
}
