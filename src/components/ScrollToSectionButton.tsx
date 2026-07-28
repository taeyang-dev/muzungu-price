"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface ScrollToSectionButtonProps {
  locale: Locale;
  targetId: string;
  className?: string;
  signedIn: boolean;
  authHref?: string;
  children: ReactNode;
}

export function ScrollToSectionButton({
  locale,
  targetId,
  className = "btn provider-action-btn",
  signedIn,
  authHref = "/auth",
  children
}: ScrollToSectionButtonProps) {
  const router = useRouter();

  function handleClick(): void {
    if (!signedIn) {
      router.push(authHref);
      return;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      setFeedbackFallback();
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const focusable = target.querySelector<HTMLElement>(
        "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])"
      );
      focusable?.focus({ preventScroll: true });
    }, 350);
  }

  function setFeedbackFallback(): void {
    window.alert(
      tr(
        locale,
        "The request form is not available on this page yet. Please refresh and try again.",
        "요청 양식을 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요."
      )
    );
  }

  return (
    <button className={className} onClick={handleClick} type="button">
      {children}
    </button>
  );
}
