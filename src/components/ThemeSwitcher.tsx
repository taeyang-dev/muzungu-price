"use client";

import { useRouter } from "next/navigation";
import { AppTheme } from "@/lib/theme";
import { Locale, tr } from "@/lib/i18n";

interface ThemeSwitcherProps {
  locale: Locale;
  theme: AppTheme;
}

export function ThemeSwitcher({ locale, theme }: ThemeSwitcherProps) {
  const router = useRouter();

  async function updateTheme(nextTheme: AppTheme): Promise<void> {
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
      return;
    }

    router.refresh();
  }

  return (
    <div className="theme-switcher" role="group" aria-label="Theme switcher">
      <button
        className={`theme-btn ${theme === "dark" ? "active" : ""}`}
        onClick={() => void updateTheme("dark")}
        type="button"
      >
        {tr(locale, "Dark", "다크")}
      </button>
      <button
        className={`theme-btn ${theme === "light" ? "active" : ""}`}
        onClick={() => void updateTheme("light")}
        type="button"
      >
        {tr(locale, "Light", "라이트")}
      </button>
    </div>
  );
}
