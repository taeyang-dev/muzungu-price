"use client";

import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";

interface LocaleSwitcherProps {
  locale: Locale;
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const router = useRouter();

  async function updateLocale(nextLocale: Locale): Promise<void> {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale })
    });
    router.refresh();
  }

  return (
    <div className="locale-switcher" role="group" aria-label="Language switcher">
      <button
        className={`locale-btn ${locale === "en" ? "active" : ""}`}
        onClick={() => void updateLocale("en")}
        type="button"
      >
        EN
      </button>
      <button
        className={`locale-btn ${locale === "ko" ? "active" : ""}`}
        onClick={() => void updateLocale("ko")}
        type="button"
      >
        한국어
      </button>
    </div>
  );
}
