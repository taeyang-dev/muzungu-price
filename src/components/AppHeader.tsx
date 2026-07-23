"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import {
  getVendorStorageEventName,
  readFavoriteVendors,
  readRecentVendors,
  VendorReference
} from "@/lib/vendor-storage";

interface AppHeaderProps {
  session: {
    name: string;
    role: string;
  } | null;
}

function VendorList({
  items,
  emptyText
}: {
  items: VendorReference[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="drawer-empty">{emptyText}</p>;
  }

  return (
    <ul className="drawer-vendor-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/providers/${item.id}`}>{item.name}</Link>
        </li>
      ))}
    </ul>
  );
}

export function AppHeader({ session }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<VendorReference[]>([]);
  const [recent, setRecent] = useState<VendorReference[]>([]);

  useEffect(() => {
    function refresh(): void {
      setFavorites(readFavoriteVendors());
      setRecent(readRecentVendors());
    }

    refresh();
    const eventName = getVendorStorageEventName();
    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <button
            aria-label="Open navigation menu"
            className="menu-toggle"
            onClick={() => setMenuOpen((prev) => !prev)}
            type="button"
          >
            ☰
          </button>
          <Link className="headline" href="/">
            <img alt="Muzungu Price mark" className="brand-mark" src="/brand-mark.svg" />
            <span>THIS NOT MUZUNGU PRICE</span>
          </Link>
          <div className="topbar-actions">
            <Link className="btn browse-btn" href="/?verified=1">
              Browse verified vendors
            </Link>
            {session ? <LogoutButton /> : <Link href="/auth">Sign in</Link>}
          </div>
        </div>
      </header>

      <div
        className={`drawer-backdrop ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
        role="presentation"
      />
      <aside className={`drawer ${menuOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <h2>Quick Menu</h2>
          <button aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} type="button">
            ✕
          </button>
        </div>

        <section className="drawer-section">
          <h3>My page</h3>
          {session ? (
            <p className="drawer-meta">
              {session.name} · {session.role}
            </p>
          ) : (
            <p className="drawer-meta">Sign in to save vendors and view history.</p>
          )}
          <nav className="drawer-nav">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/requests" onClick={() => setMenuOpen(false)}>
              Requests
            </Link>
            <Link href="/?verified=1" onClick={() => setMenuOpen(false)}>
              Browse verified vendors
            </Link>
            {!session && (
              <Link href="/auth" onClick={() => setMenuOpen(false)}>
                Sign in / register
              </Link>
            )}
          </nav>
        </section>

        <section className="drawer-section">
          <h3>Favorite vendors</h3>
          <VendorList items={favorites} emptyText="No favorites yet." />
        </section>

        <section className="drawer-section">
          <h3>Recently viewed</h3>
          <VendorList items={recent} emptyText="No recent views yet." />
        </section>
      </aside>
    </>
  );
}
