"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

interface VendorChatBoxProps {
  vendorId: string;
  vendorName: string;
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

export function VendorChatBox({ vendorId, vendorName }: VendorChatBoxProps) {
  const initialMessage = useMemo<ChatMessage[]>(
    () => [
      {
        id: "welcome-message",
        sender: "vendor",
        text: `Hi, this is ${vendorName}. Share your request and we will respond quickly with pricing details.`,
        timestamp: new Date().toISOString()
      }
    ],
    [vendorName]
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
        text: "Thanks for your message. We will confirm scope, timeline, and final RWF quotation shortly.",
        timestamp: new Date(Date.now() + 30000).toISOString()
      }
    ];

    setMessages(nextMessages);
    setInput("");
  }

  return (
    <article className="panel">
      <h2 style={{ marginTop: 0 }}>Chat with vendor</h2>
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
          placeholder="Write a message..."
          value={input}
        />
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </article>
  );
}
