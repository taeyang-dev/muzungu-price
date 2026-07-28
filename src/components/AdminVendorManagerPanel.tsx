"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";
import { Locale, tr } from "@/lib/i18n";
import type { AdminProviderListItem } from "@/lib/admin-providers";

interface AdminVendorManagerPanelProps {
  locale: Locale;
  providers: AdminProviderListItem[];
}

interface ApiResult {
  error?: { message: string; code?: string };
}

export function AdminVendorManagerPanel({ locale, providers }: AdminVendorManagerPanelProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useSyncAppLoading(deletingId !== null);

  async function deleteProvider(provider: AdminProviderListItem): Promise<void> {
    const confirmed = window.confirm(
      tr(
        locale,
        `Delete vendor "${provider.businessName}"?\n\nThis removes the storefront, services, verification data, and chat history. The owner account (${provider.owner.email}) will become a customer again.`,
        `업체 "${provider.businessName}"을(를) 삭제할까요?\n\n업체 페이지, 서비스, 심사 데이터, 채팅 기록이 삭제됩니다. 소유자 계정(${provider.owner.email})은 손님(customer)으로 돌아갑니다.`
      )
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(provider.id);
    setError("");
    setFeedback("");

    try {
      const response = await fetch(`/api/admin/providers/${provider.id}`, { method: "DELETE" });
      const data = (await response.json()) as ApiResult;
      if (!response.ok) {
        setError(data.error?.message ?? tr(locale, "Failed to delete vendor.", "업체 삭제에 실패했습니다."));
        return;
      }
      setFeedback(
        tr(
          locale,
          `Deleted vendor "${provider.businessName}".`,
          `업체 "${provider.businessName}"을(를) 삭제했습니다.`
        )
      );
      router.refresh();
    } catch {
      setError(tr(locale, "Failed to delete vendor.", "업체 삭제에 실패했습니다."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="grid">
      <h2 style={{ marginBottom: 0 }}>{tr(locale, "Registered vendors", "등록된 업체")}</h2>
      <p className="muted" style={{ marginTop: "6px" }}>
        {tr(
          locale,
          "Remove test or duplicate vendor registrations before launch. Deletion cannot be undone.",
          "배포 전 테스트/중복 업체를 삭제할 수 있습니다. 삭제는 되돌릴 수 없습니다."
        )}
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      {providers.length === 0 ? (
        <article className="panel">
          <p className="muted" style={{ margin: 0 }}>
            {tr(locale, "No registered vendors yet.", "등록된 업체가 없습니다.")}
          </p>
        </article>
      ) : (
        <div className="cards">
          {providers.map((provider) => (
            <article className="card" key={provider.id}>
              <div className="row" style={{ flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ margin: 0 }}>{provider.businessName}</h3>
                {provider.verificationStatus ? (
                  <span className="badge">{provider.verificationStatus}</span>
                ) : null}
                <span className={`badge ${provider.isActive ? "good" : ""}`}>
                  {provider.isActive
                    ? tr(locale, "Active", "활성")
                    : tr(locale, "Inactive", "비활성")}
                </span>
              </div>
              <p className="tiny muted" style={{ margin: "8px 0" }}>
                {tr(locale, "Owner", "담당자")}: {provider.owner.name} ({provider.owner.email})
              </p>
              <p className="tiny muted" style={{ margin: "0 0 8px" }}>
                {provider.city ?? tr(locale, "City not listed", "도시 미등록")},{" "}
                {provider.country ?? tr(locale, "Country not listed", "국가 미등록")} ·{" "}
                {tr(locale, "Services", "서비스")}: {provider.serviceCount} ·{" "}
                {new Date(provider.createdAt).toLocaleDateString()}
              </p>
              <div className="row" style={{ flexWrap: "wrap", gap: "8px" }}>
                <Link className="btn secondary" href={`/providers/${provider.id}`}>
                  {tr(locale, "View storefront", "업체 페이지 보기")}
                </Link>
                <button
                  className="btn secondary"
                  disabled={deletingId === provider.id}
                  onClick={() => void deleteProvider(provider)}
                  type="button"
                >
                  {deletingId === provider.id
                    ? tr(locale, "Deleting...", "삭제 중...")
                    : tr(locale, "Delete vendor", "업체 삭제")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
