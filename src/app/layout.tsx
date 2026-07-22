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
}: Readonly<{ children: React.ReactNode }>): Promise<JSX.Element> {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container topbar-inner">
            <div>
              <Link className="brand" href="/">
                Muzungu Price
              </Link>
              <div className="motto">This not Muzungu Price</div>
            </div>
            <nav className="nav">
              <Link href="/">Marketplace</Link>
              <Link href="/requests">Requests</Link>
              <Link href="/provider">Provider Hub</Link>
              <Link href="/admin">Admin</Link>
              {!session && <Link href="/auth">Sign in / Register</Link>}
            </nav>
            <div className="row tiny">
              {session ? (
                <>
                  <span>
                    {session.name} ({session.role})
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <span className="muted">Guest mode</span>
              )}
            </div>
          </div>
        </header>
        <main className="container section">{children}</main>
      </body>
    </html>
  );
}
