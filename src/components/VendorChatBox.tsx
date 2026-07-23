"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Locale, tr } from "@/lib/i18n";

interface VendorChatBoxProps {
  vendorId: string;
  vendorName: string;
  locale: Locale;
}

interface ChatMessage {
  id: string;
  sender: "user" | "vendor";
  text: string;
  timestamp: string;
}

function getStorageKey(vendorId: string): string {
  return `muzungu_chat_${vendorId}`;
}

function readChat(vendorId: string): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(getStorageKey(vendorId));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as ChatMessage[];
  } catch {
    return [];
  }
}

function writeChat(vendorId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getStorageKey(vendorId), JSON.stringify(messages.slice(-50)));
}

export function VendorChatBox({ vendorId, vendorName, locale }: VendorChatBoxProps) {
  const initialMessage = useMemo<ChatMessage[]>(
    () => [
      {
        id: "welcome-message",
        sender: "vendor",
        text:
          locale === "ko"
            ? `안녕하세요, ${vendorName}입니다. 요청 내용을 남겨주시면 가격 정보를 포함해 빠르게 답변드릴게요.`
            : `Hi, this is ${vendorName}. Share your request and we will respond quickly with pricing details.`,
        timestamp: new Date().toISOString()
      }
    ],
    [vendorName, locale]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") {
      return initialMessage;
    }
    const stored = readChat(vendorId);
    return stored.length > 0 ? stored : initialMessage;
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    writeChat(vendorId, messages);
  }, [vendorId, messages]);

  function sendMessage(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const now = new Date().toISOString();
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: `user-${now}`,
        sender: "user",
        text: trimmed,
        timestamp: now
      },
      {
        id: `vendor-${now}`,
        sender: "vendor",
        text:
          locale === "ko"
            ? "문의 감사합니다. 범위와 일정, 최종 RWF 견적을 곧 안내드리겠습니다."
            : "Thanks for your message. We will confirm scope, timeline, and final RWF quotation shortly.",
        timestamp: new Date(Date.now() + 30000).toISOString()
      }
    ];

    setMessages(nextMessages);
    setInput("");
  }

  return (
    <article className="panel">
      <h2 style={{ marginTop: 0 }}>{tr(locale, "Chat with vendor", "업체와 채팅")}</h2>
      <div className="chat-box">
        {messages.map((message) => (
          <div className={`chat-message ${message.sender}`} key={message.id}>
            <p>{message.text}</p>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={sendMessage}>
        <input
          className="input"
          onChange={(event) => setInput(event.target.value)}
          placeholder={tr(locale, "Write a message...", "메시지를 입력하세요...")}
          value={input}
        />
        <button className="btn" type="submit">
          {tr(locale, "Send", "보내기")}
        </button>
      </form>
    </article>
  );
}
