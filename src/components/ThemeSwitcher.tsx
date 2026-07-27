"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";
import { AppTheme } from "@/lib/theme";
import { Locale, tr } from "@/lib/i18n";

interface ThemeSwitcherProps {
  locale: Locale;
  theme: AppTheme;
}

export function ThemeSwitcher({ locale, theme }: ThemeSwitcherProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useSyncAppLoading(loading);

  async function updateTheme(nextTheme: AppTheme): Promise<void> {
    if (nextTheme === theme || loading) {
      return;
    }

    setLoading(true);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.cookie = `mp_theme=${nextTheme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    const response = await fetch("/api/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ theme: nextTheme })
    });

    if (!response.ok) {
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="theme-switcher" role="group" aria-label="Theme switcher">
      <button
        className={`theme-btn ${theme === "dark" ? "active" : ""}`}
        disabled={loading}
        onClick={() => void updateTheme("dark")}
        type="button"
      >
        {tr(locale, "Dark", "다크")}
      </button>
      <button
        className={`theme-btn ${theme === "light" ? "active" : ""}`}
        disabled={loading}
        onClick={() => void updateTheme("light")}
        type="button"
      >
        {tr(locale, "Light", "라이트")}
      </button>
    </div>
  );
}
