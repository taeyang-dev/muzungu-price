"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Locale, tr } from "@/lib/i18n";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";

interface LogoutButtonProps {
  locale: Locale;
}

export function LogoutButton({ locale }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useSyncAppLoading(loading);

  async function handleLogout(): Promise<void> {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError(tr(locale, "Failed to sign out. Please try again.", "로그아웃에 실패했습니다. 다시 시도해 주세요."));
        return;
      }
      // Force a full navigation so session UI updates immediately without manual refresh.
      window.location.href = "/";
    } catch {
      setError(tr(locale, "Network error while signing out.", "로그아웃 중 네트워크 오류가 발생했습니다."));
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <div className="grid" style={{ gap: "6px" }}>
      <button className="btn secondary" onClick={handleLogout} disabled={loading} type="button">
        {loading ? tr(locale, "Signing out...", "로그아웃 중...") : tr(locale, "Sign out", "로그아웃")}
      </button>
      {error ? <p className="tiny muted" style={{ margin: 0 }}>{error}</p> : null}
    </div>
  );
}
