"use client";

import { type ReactNode } from "react";
import { LoadingProvider } from "@/components/LoadingProvider";
import type { Locale } from "@/lib/i18n";

export function AppProviders({
  children,
  locale
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return <LoadingProvider locale={locale}>{children}</LoadingProvider>;
}
