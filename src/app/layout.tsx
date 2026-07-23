import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muzungu Price",
  description:
    "Verified providers, transparent prices, and Quotation/EBM-ready sourcing for individuals and institutions."
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <AppHeader
          session={session ? { name: session.name, role: session.role } : null}
        />
        <main className="container section">{children}</main>
      </body>
    </html>
  );
}
