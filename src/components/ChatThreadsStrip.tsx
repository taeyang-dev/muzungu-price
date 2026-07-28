"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Locale, tr } from "@/lib/i18n";

export interface ChatThreadItem {
  threadKey: string;
  displayName: string;
  unreadCount: number;
  chatHref: string;
}

interface ChatThreadsStripProps {
  locale: Locale;
  signedIn: boolean;
  onNavigate?: () => void;
}

export function getChatThreadsUpdatedEventName(): string {
  return "chat-threads-updated";
}

export function ChatThreadsStrip({ locale, signedIn, onNavigate }: ChatThreadsStripProps) {
  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signedIn) {
      setThreads([]);
      return undefined;
    }

    let cancelled = false;

    async function refresh(): Promise<void> {
      setLoading(true);
      try {
        const response = await fetch("/api/chat-threads");
        const payload = (await response.json()) as { data?: ChatThreadItem[] };
        if (!cancelled && response.ok && Array.isArray(payload.data)) {
          setThreads(payload.data);
        }
      } catch {
        if (!cancelled) {
          setThreads([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void refresh();
    const eventName = getChatThreadsUpdatedEventName();
    const handleRefresh = (): void => {
      void refresh();
    };
    window.addEventListener(eventName, handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, handleRefresh);
    };
  }, [signedIn]);

  if (!signedIn) {
    return (
      <p className="drawer-empty">
        {tr(locale, "Sign in to view your chats.", "로그인하면 채팅 목록을 볼 수 있어요.")}
      </p>
    );
  }

  if (loading && threads.length === 0) {
    return <p className="drawer-empty">{tr(locale, "Loading chats...", "채팅 불러오는 중...")}</p>;
  }

  if (threads.length === 0) {
    return <p className="drawer-empty">{tr(locale, "No chats yet.", "대화가 없습니다.")}</p>;
  }

  return (
    <div className="drawer-chat-strip-wrap">
      <div aria-label={tr(locale, "Chats", "채팅")} className="drawer-chat-strip" role="list">
        {threads.map((thread) => (
          <Link
            className="drawer-chat-chip"
            href={thread.chatHref}
            key={thread.threadKey}
            onClick={onNavigate}
            role="listitem"
          >
            <span className="drawer-chat-name">{thread.displayName}</span>
            {thread.unreadCount > 0 ? (
              <span aria-label={tr(locale, "Unread messages", "읽지 않은 메시지")} className="drawer-chat-badge">
                {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
