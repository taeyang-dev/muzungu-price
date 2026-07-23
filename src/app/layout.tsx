import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
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
        <header className="topbar">
          <div className="container topbar-inner">
            <Link className="headline" href="/">
              THIS NOT MUZUNGU PRICE
            </Link>
            <div className="topbar-actions">
              <Link className="btn browse-btn" href="/?verified=1">
                Browse verified vendors
              </Link>
              {session ? <LogoutButton /> : <Link href="/auth">Sign in</Link>}
            </div>
          </div>
        </header>
        <main className="container section">{children}</main>
      </body>
    </html>
  );
}
