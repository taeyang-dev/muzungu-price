import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BecomeProviderButton } from "@/components/BecomeProviderButton";
import { ProviderSetupView } from "@/components/provider/ProviderSetupView";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";
import { loadProviderPageData } from "@/lib/provider-data";

export default async function ProviderSetupPage() {
  const session = await getSession();
  const locale = await getLocaleFromCookies();

  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Vendor review status", "벤더 심사 현황")}</h1>
        <p>{tr(locale, "Please sign in first.", "먼저 로그인해 주세요.")}</p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  if (session.role !== "provider") {
    return (
      <section className="panel">
        <h1>{tr(locale, "Vendor review status", "벤더 심사 현황")}</h1>
        <p className="muted">
          {tr(locale, "Register as a vendor to access this page.", "벤더로 등록하면 이 페이지를 이용할 수 있습니다.")}
        </p>
        <BecomeProviderButton locale={locale} />
      </section>
    );
  }

  const data = await loadProviderPageData(session.userId);

  if (!data.profile) {
    redirect("/provider");
  }

  if (data.verificationStatus === "draft" || data.verificationStatus === "rejected" || !data.verificationStatus) {
    redirect("/provider");
  }

  return (
    <ProviderSetupView
      categories={data.categories}
      locale={locale}
      profile={data.profile}
      service={data.service}
      verificationStatus={data.verificationStatus}
    />
  );
}
