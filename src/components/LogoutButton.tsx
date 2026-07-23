"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Locale, tr } from "@/lib/i18n";

interface LogoutButtonProps {
  locale: Locale;
}

export function LogoutButton({ locale }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout(): Promise<void> {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <button className="btn secondary" onClick={handleLogout} disabled={loading} type="button">
      {loading ? tr(locale, "Signing out...", "로그아웃 중...") : tr(locale, "Sign out", "로그아웃")}
    </button>
  );
}
