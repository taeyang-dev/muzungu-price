"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";
import { Locale, tr } from "@/lib/i18n";

interface BecomeProviderButtonProps {
  locale: Locale;
}

export function BecomeProviderButton({ locale }: BecomeProviderButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useSyncAppLoading(loading);

  async function activateProvider(): Promise<void> {
    setLoading(true);
    setError("");
    const response = await fetch("/api/provider/activate", {
      method: "POST",
      credentials: "same-origin"
    });
    setLoading(false);
    if (!response.ok) {
      setError(tr(locale, "Failed to switch account to provider.", "업체 계정 전환에 실패했습니다."));
      return;
    }
    router.refresh();
    router.push("/provider");
  }

  return (
    <div className="grid" style={{ maxWidth: "520px" }}>
      <button className="btn" disabled={loading} onClick={() => void activateProvider()} type="button">
        {loading
          ? tr(locale, "Switching account...", "전환 중...")
          : tr(locale, "Register as vendor", "벤더로 등록하기")}
      </button>
      {error && <p className="flash error">{error}</p>}
    </div>
  );
}
