"use client";

import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";

interface LocaleSwitcherProps {
  locale: Locale;
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const router = useRouter();

  async function updateLocale(nextLocale: Locale): Promise<void> {
    const response = await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ locale: nextLocale })
    });

    // Fallback for browsers that may delay applying Set-Cookie from fetch responses.
    document.cookie = `mp_lang=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    if (!response.ok) {
      return;
    }
    router.refresh();
    window.location.reload();
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
      <button
        className={`locale-btn ${locale === "fr" ? "active" : ""}`}
        onClick={() => void updateLocale("fr")}
        type="button"
      >
        FR
      </button>
      <button
        className={`locale-btn ${locale === "rw" ? "active" : ""}`}
        onClick={() => void updateLocale("rw")}
        type="button"
      >
        RW
      </button>
    </div>
  );
}
