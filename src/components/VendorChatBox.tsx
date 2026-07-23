"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Locale, tr } from "@/lib/i18n";

type DisplayLang = "original" | "en" | "ko" | "rw";
type StoredLang = "en" | "ko" | "rw";

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
  translations?: Partial<Record<StoredLang, string>>;
  sourceLanguage?: string;
}

interface TranslateResult {
  data?: {
    translatedText?: string;
    detectedSourceLanguage?: string;
  };
}

const languageLabels: Record<DisplayLang, { en: string; ko: string }> = {
  original: { en: "Original", ko: "원문" },
  en: { en: "English", ko: "영어" },
  ko: { en: "Korean", ko: "한국어" },
  rw: { en: "Kinyarwanda", ko: "키냐르완다어" }
};

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

function hasHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

function defaultDisplayLanguage(locale: Locale): DisplayLang {
  return locale === "ko" ? "ko" : "en";
}

async function translateText(text: string, targetLanguage: StoredLang): Promise<string> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      targetLanguage,
      sourceLanguage: "auto"
    })
  });
  const body = (await response.json()) as TranslateResult;
  return body.data?.translatedText ?? text;
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
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLang>(() =>
    defaultDisplayLanguage(locale)
  );
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);

  useEffect(() => {
    writeChat(vendorId, messages);
  }, [vendorId, messages]);

  function visibleText(message: ChatMessage): string {
    if (displayLanguage === "original") {
      return message.text;
    }
    return message.translations?.[displayLanguage] ?? message.text;
  }

  async function ensureTranslation(messageId: string, targetLanguage: DisplayLang): Promise<void> {
    if (targetLanguage === "original") {
      setDisplayLanguage("original");
      return;
    }

    const message = messages.find((item) => item.id === messageId);
    if (!message) {
      return;
    }

    if (message.translations?.[targetLanguage]) {
      setDisplayLanguage(targetLanguage);
      return;
    }

    setTranslatingMessageId(messageId);
    try {
      const translatedText = await translateText(message.text, targetLanguage);
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                translations: {
                  ...item.translations,
                  [targetLanguage]: translatedText
                }
              }
            : item
        )
      );
      setDisplayLanguage(targetLanguage);
    } finally {
      setTranslatingMessageId(null);
    }
  }

  async function changeDisplayLanguage(nextLanguage: DisplayLang): Promise<void> {
    if (nextLanguage === "original") {
      setDisplayLanguage("original");
      return;
    }

    const missing = messages.filter((message) => !message.translations?.[nextLanguage]);
    if (missing.length === 0) {
      setDisplayLanguage(nextLanguage);
      return;
    }

    setIsBulkTranslating(true);
    try {
      const translatedEntries = await Promise.all(
        missing.map(async (message) => ({
          id: message.id,
          translatedText: await translateText(message.text, nextLanguage)
        }))
      );

      const translatedMap = new Map(
        translatedEntries.map((entry) => [entry.id, entry.translatedText] as const)
      );

      setMessages((current) =>
        current.map((message) => {
          const translatedText = translatedMap.get(message.id);
          if (!translatedText) {
            return message;
          }
          return {
            ...message,
            translations: {
              ...message.translations,
              [nextLanguage]: translatedText
            }
          };
        })
      );
      setDisplayLanguage(nextLanguage);
    } finally {
      setIsBulkTranslating(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `user-${now}`,
      sender: "user",
      text: trimmed,
      timestamp: now
    };

    const vendorText = hasHangul(trimmed)
      ? "Thanks for your request. We can share timeline and formal quotation in 24 hours."
      : "Murakoze kubutumwa bwawe. Turagutegurira igihe, igiciro n'inyandiko zose vuba.";

    const vendorMessage: ChatMessage = {
      id: `vendor-${now}`,
      sender: "vendor",
      text: vendorText,
      timestamp: new Date(Date.now() + 30000).toISOString()
    };

    const targetLanguages: StoredLang[] = ["en", "ko", "rw"];
    const [userTranslations, vendorTranslations] = await Promise.all([
      Promise.all(targetLanguages.map((lang) => translateText(userMessage.text, lang))),
      Promise.all(targetLanguages.map((lang) => translateText(vendorMessage.text, lang)))
    ]);

    userMessage.translations = {
      en: userTranslations[0],
      ko: userTranslations[1],
      rw: userTranslations[2]
    };
    vendorMessage.translations = {
      en: vendorTranslations[0],
      ko: vendorTranslations[1],
      rw: vendorTranslations[2]
    };

    setMessages((current) => [...current, userMessage, vendorMessage]);
    setInput("");
  }

  return (
    <article className="panel">
      <h2 style={{ marginTop: 0 }}>{tr(locale, "Chat with vendor", "업체와 채팅")}</h2>
      <p className="tiny muted chat-helper">
        {tr(
          locale,
          "Switch language to instantly translate both your messages and vendor replies.",
          "언어 버튼을 누르면 내 메시지와 업체 답변을 즉시 번역해서 볼 수 있습니다."
        )}
        {isBulkTranslating ? ` ${tr(locale, "Translating...", "번역 중...")}` : ""}
      </p>
      <div className="chat-translate-tabs">
        {(Object.keys(languageLabels) as DisplayLang[]).map((lang) => (
          <button
            className={`chat-tab ${displayLanguage === lang ? "active" : ""}`}
            key={lang}
            onClick={() => void changeDisplayLanguage(lang)}
            type="button"
          >
            {locale === "ko" ? languageLabels[lang].ko : languageLabels[lang].en}
          </button>
        ))}
      </div>
      <div className="chat-box">
        {messages.map((message) => (
          <div className={`chat-message ${message.sender}`} key={message.id}>
            <p>{visibleText(message)}</p>
            <div className="chat-inline-actions">
              {(Object.keys(languageLabels) as DisplayLang[]).map((lang) => (
                <button
                  className="chat-inline-btn"
                  key={`${message.id}-${lang}`}
                  onClick={() => void ensureTranslation(message.id, lang)}
                  type="button"
                >
                  {locale === "ko" ? languageLabels[lang].ko : languageLabels[lang].en}
                </button>
              ))}
            </div>
            <span>
              {new Date(message.timestamp).toLocaleTimeString()}{" "}
              {translatingMessageId === message.id
                ? tr(locale, "· translating...", "· 번역 중...")
                : ""}
            </span>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={(event) => void sendMessage(event)}>
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
