"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import {
  getVendorStorageEventName,
  readChatVendors,
  readFavoriteVendors,
  readRecentVendors,
  VendorReference
} from "@/lib/vendor-storage";
import { Locale, tr } from "@/lib/i18n";

interface AppHeaderProps {
  session: {
    name: string;
    role: string;
  } | null;
  locale: Locale;
}

function VendorList({
  items,
  emptyText,
  hrefSuffix = ""
}: {
  items: VendorReference[];
  emptyText: string;
  hrefSuffix?: string;
}) {
  if (items.length === 0) {
    return <p className="drawer-empty">{emptyText}</p>;
  }

  return (
    <ul className="drawer-vendor-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/providers/${item.id}${hrefSuffix}`}>{item.name}</Link>
        </li>
      ))}
    </ul>
  );
}

export function AppHeader({ session, locale }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<VendorReference[]>([]);
  const [recent, setRecent] = useState<VendorReference[]>([]);
  const [chatVendors, setChatVendors] = useState<VendorReference[]>([]);
  const [requestCounts, setRequestCounts] = useState({
    sent: { total: 0, quotation: 0, ebm: 0 },
    received: { total: 0, quotation: 0, ebm: 0 }
  });
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  useEffect(() => {
    function refresh(): void {
      setFavorites(readFavoriteVendors());
      setRecent(readRecentVendors());
      setChatVendors(readChatVendors());
    }

    async function refreshRequestCounts(): Promise<void> {
      if (!session) {
        setRequestCounts({
          sent: { total: 0, quotation: 0, ebm: 0 },
          received: { total: 0, quotation: 0, ebm: 0 }
        });
        return;
      }
      try {
        const response = await fetch("/api/requests/counts");
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as {
          data?: {
            sent: { total: number; quotation: number; ebm: number };
            received: { total: number; quotation: number; ebm: number };
          };
        };
        if (payload.data) {
          setRequestCounts(payload.data);
        }
      } catch {
        setRequestCounts({
          sent: { total: 0, quotation: 0, ebm: 0 },
          received: { total: 0, quotation: 0, ebm: 0 }
        });
      }
    }

    async function refreshInbox(): Promise<void> {
      if (!session) {
        setUnreadInboxCount(0);
        return;
      }
      try {
        const response = await fetch("/api/inbox", { method: "HEAD" });
        if (response.ok) {
          setUnreadInboxCount(Number(response.headers.get("X-Unread-Count") ?? "0"));
        }
      } catch {
        setUnreadInboxCount(0);
      }
    }

    refresh();
    void refreshRequestCounts();
    void refreshInbox();
    const eventName = getVendorStorageEventName();
    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("requests-updated", () => void refreshRequestCounts());
    window.addEventListener("inbox-updated", () => void refreshInbox());
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("requests-updated", () => void refreshRequestCounts());
      window.removeEventListener("inbox-updated", () => void refreshInbox());
    };
  }, [session]);

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
            <img alt="This not Muzungu Price logo" className="brand-mark" src="/brand-mark.svg" />
          </Link>
          <div className="topbar-actions">
            <LocaleSwitcher locale={locale} />
            <Link className="btn browse-btn" href="/">
              {tr(locale, "Browse vendors", "업체 둘러보기")}
            </Link>
            {session ? (
              <LogoutButton locale={locale} />
            ) : (
              <Link href="/auth">{tr(locale, "Sign in", "로그인")}</Link>
            )}
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
          <h2>{tr(locale, "Quick Menu", "빠른 메뉴")}</h2>
          <button aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} type="button">
            ✕
          </button>
        </div>

        <section className="drawer-section">
          <h3>{tr(locale, "My page", "마이페이지")}</h3>
          {session ? (
            <p className="drawer-meta">
              {session.name} · {session.role}
            </p>
          ) : (
            <p className="drawer-meta">
              {tr(locale, "Sign in to save vendors and view history.", "로그인하면 즐겨찾기와 최근 본 업체를 저장할 수 있어요.")}
            </p>
          )}
          <nav className="drawer-nav">
            <Link href="/my-page" onClick={() => setMenuOpen(false)}>
              {tr(locale, "My page", "마이페이지")}
            </Link>
            <Link href="/" onClick={() => setMenuOpen(false)}>
              {tr(locale, "Home", "홈")}
            </Link>
            {session && (
              <Link href="/provider" onClick={() => setMenuOpen(false)}>
                {session.role === "provider"
                  ? tr(locale, "Vendor registration", "벤더 등록")
                  : tr(locale, "Register as vendor", "벤더 등록")}
              </Link>
            )}
            {session && (
              <Link href="/inbox" onClick={() => setMenuOpen(false)}>
                {tr(locale, "Inbox", "쪽지함")} ({unreadInboxCount})
              </Link>
            )}
            <Link href="/" onClick={() => setMenuOpen(false)}>
              {tr(locale, "Browse vendors", "업체 둘러보기")}
            </Link>
            {!session && (
              <Link href="/auth" onClick={() => setMenuOpen(false)}>
                {tr(locale, "Sign in / register", "로그인 / 회원가입")}
              </Link>
            )}
          </nav>
        </section>

        <section className="drawer-section">
          <h3>{tr(locale, "Requests", "요청서")}</h3>
          <nav className="drawer-nav">
            <Link href="/requests?box=sent" onClick={() => setMenuOpen(false)}>
              {tr(locale, "Sent", "발신")} ({requestCounts.sent.total})
            </Link>
            <Link href="/requests?box=received" onClick={() => setMenuOpen(false)}>
              {tr(locale, "Received", "수신")} ({requestCounts.received.total})
            </Link>
          </nav>
        </section>

        <section className="drawer-section">
          <h3>{tr(locale, "Messages with vendors", "업체와 대화")}</h3>
          <VendorList
            items={chatVendors}
            emptyText={tr(locale, "No active chats yet.", "대화중인 업체가 없습니다.")}
            hrefSuffix="#vendor-chat"
          />
        </section>

        <section className="drawer-section">
          <h3>{tr(locale, "Favorite vendors", "즐겨찾는 업체")}</h3>
          <VendorList items={favorites} emptyText={tr(locale, "No favorites yet.", "즐겨찾기한 업체가 없습니다.")} />
        </section>

        <section className="drawer-section">
          <h3>{tr(locale, "Recently viewed", "최근 본 업체")}</h3>
          <VendorList items={recent} emptyText={tr(locale, "No recent views yet.", "최근 본 업체가 없습니다.")} />
        </section>
      </aside>
    </>
  );
}
