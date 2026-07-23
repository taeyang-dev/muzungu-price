import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muzungu Price",
  description:
    "Verified providers, transparent prices, and Quotation/EBM-available sourcing for individuals and institutions."
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const locale = await getLocaleFromCookies();

  return (
    <html lang={locale}>
      <body>
        <AppHeader
          locale={locale}
          session={session ? { name: session.name, role: session.role } : null}
        />
        <main className="container section">{children}</main>
      </body>
    </html>
  );
}
