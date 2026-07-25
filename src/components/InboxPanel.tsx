"use client";

import { useEffect, useState } from "react";
import { Locale, tr } from "@/lib/i18n";

interface InboxMessageItem {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender: { name: string; email: string } | null;
}

interface ApiListResult {
  data?: InboxMessageItem[];
  error?: { message: string };
}

interface InboxPanelProps {
  locale: Locale;
}

export function InboxPanel({ locale }: InboxPanelProps) {
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMessages(): Promise<void> {
    setLoading(true);
    const response = await fetch("/api/inbox");
    const data = (await response.json()) as ApiListResult;
    setLoading(false);

    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to load inbox", "쪽지함을 불러오지 못했습니다."));
      return;
    }

    setMessages(data.data ?? []);
  }

  async function markAsRead(messageId: string): Promise<void> {
    const response = await fetch(`/api/inbox/${messageId}`, { method: "PATCH" });
    if (!response.ok) {
      return;
    }
    setMessages((current) =>
      current.map((message) => (message.id === messageId ? { ...message, isRead: true } : message))
    );
    window.dispatchEvent(new Event("inbox-updated"));
  }

  useEffect(() => {
    void loadMessages();
  }, []);

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Inbox", "쪽지함")}</h1>
      <p className="muted">
        {tr(
          locale,
          "Messages from the review team and system notifications appear here.",
          "심사팀 및 시스템 알림 메시지를 확인할 수 있습니다."
        )}
      </p>

      {error && <div className="flash error">{error}</div>}
      {loading && <div className="panel">{tr(locale, "Loading...", "불러오는 중...")}</div>}

      {!loading && messages.length === 0 && (
        <div className="panel">{tr(locale, "No messages yet.", "받은 쪽지가 없습니다.")}</div>
      )}

      {messages.map((message) => (
        <article className={`panel ${message.isRead ? "" : "panel-highlight"}`} key={message.id}>
          <div className="row">
            <h2 style={{ margin: 0 }}>{message.subject}</h2>
            {!message.isRead && <span className="badge">{tr(locale, "New", "새 쪽지")}</span>}
          </div>
          <p className="tiny muted">
            {new Date(message.createdAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}
            {message.sender ? ` · ${message.sender.name}` : ` · ${tr(locale, "System", "시스템")}`}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{message.body}</p>
          {!message.isRead && (
            <button className="btn secondary" onClick={() => void markAsRead(message.id)} type="button">
              {tr(locale, "Mark as read", "읽음 처리")}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
