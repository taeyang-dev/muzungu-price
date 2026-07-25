"use client";

import Link from "next/link";
import { Locale, tr } from "@/lib/i18n";
import { ProviderPageCategory, ProviderPageProfile, ProviderVerificationStatus } from "@/lib/provider-data";
import { ProviderProfileServiceSetup } from "@/components/provider/ProviderProfileServiceSetup";

interface ProviderSetupViewProps {
  locale: Locale;
  categories: ProviderPageCategory[];
  profile: ProviderPageProfile;
  verificationStatus: ProviderVerificationStatus;
}

export function ProviderSetupView({
  locale,
  categories,
  profile,
  verificationStatus
}: ProviderSetupViewProps) {
  const verificationApproved = verificationStatus === "approved";
  const isPending = verificationStatus === "pending" || verificationStatus === "on_hold";

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Vendor review status", "벤더 심사 현황")}</h1>

      {isPending && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Review in progress", "심사 중입니다")}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {tr(
              locale,
              "Review is in progress. It will be completed within 12 hours. If we need additional information, you will receive a message in your inbox.",
              "심사 중입니다. 12시간 이내 심사가 완료되며, 추가 요청이 있을 경우 쪽지함에서 확인하세요."
            )}
          </p>
          <p className="tiny muted" style={{ marginTop: "12px", marginBottom: 0 }}>
            <Link href="/inbox">{tr(locale, "Go to inbox", "쪽지함 바로가기")}</Link>
          </p>
        </article>
      )}

      {verificationStatus === "approved" && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Review approved", "심사 승인")}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {tr(
              locale,
              "Your business verification is approved. You are now visible on the marketplace.",
              "업체 심사가 승인되었습니다. 이제 마켓플레이스에 노출됩니다."
            )}
          </p>
        </article>
      )}

      {verificationStatus === "rejected" && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Review rejected", "심사 반려")}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {tr(
              locale,
              "Your review was rejected. Update your documents and request review again from the registration page.",
              "심사가 반려되었습니다. 벤더 등록 페이지에서 서류를 보완한 뒤 다시 심사를 요청해 주세요."
            )}
          </p>
          <p className="tiny muted" style={{ marginTop: "12px", marginBottom: 0 }}>
            <Link href="/provider">{tr(locale, "Go to vendor registration", "벤더 등록으로 이동")}</Link>
          </p>
        </article>
      )}

      {(isPending || verificationApproved) && (
        <ProviderProfileServiceSetup
          categories={categories}
          locale={locale}
          profile={profile}
          showIntro
          verificationApproved={verificationApproved}
        />
      )}
    </section>
  );
}
