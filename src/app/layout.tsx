import type { Metadata } from "next";
import { getSessionForApp } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { AppProviders } from "@/components/AppProviders";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { getThemeFromCookies } from "@/lib/theme-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muzungu Price",
  description:
    "Verified providers, transparent prices, and Quotation/EBM-available sourcing for individuals and institutions."
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionForApp();
  const locale = await getLocaleFromCookies();
  const theme = await getThemeFromCookies();

  return (
    <html data-theme={theme} lang={locale} suppressHydrationWarning>
      <body>
        <AppProviders locale={locale}>
          <AppHeader
            locale={locale}
            session={session ? { name: session.name, role: session.role } : null}
            theme={theme}
          />
          <main className="container section">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
