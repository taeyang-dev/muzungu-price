"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Locale, tr } from "@/lib/i18n";
import { recordChatVendor } from "@/lib/vendor-storage";

type DisplayLang = "original" | "en" | "ko" | "rw";
type StoredLang = "en" | "ko" | "rw";

interface VendorChatBoxProps {
  vendorId: string;
  vendorName: string;
  locale: Locale;
}

interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "vendor";
  text: string;
  timestamp: string;
  translations?: Partial<Record<StoredLang, string>>;
  attachments?: ChatAttachment[];
}

interface TranslateResult {
  data?: {
    translatedText?: string;
  };
}

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 3;

const languageLabels: Record<DisplayLang, { en: string; ko: string }> = {
  original: { en: "Original", ko: "원문" },
  en: { en: "English", ko: "영어" },
  ko: { en: "Korean", ko: "한국어" },
  rw: { en: "Kinyarwanda", ko: "키냐르완다어" }
};

function getStorageKey(vendorId: string): string {
  return `muzungu_chat_${vendorId}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  window.localStorage.setItem(getStorageKey(vendorId), JSON.stringify(messages.slice(-30)));
}

function hasHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

function defaultDisplayLanguage(locale: Locale): DisplayLang {
  return locale === "ko" ? "ko" : "en";
}

async function translateText(text: string, targetLanguage: StoredLang): Promise<string> {
  if (!text.trim()) {
    return "";
  }

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
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
  const [isOpen, setIsOpen] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState("");

  useEffect(() => {
    writeChat(vendorId, messages);
  }, [vendorId, messages]);

  useEffect(() => {
    recordChatVendor({ id: vendorId, name: vendorName });
  }, [vendorId, vendorName]);

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
    if (!message || !message.text.trim()) {
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

    const missing = messages.filter(
      (message) => message.text.trim().length > 0 && !message.translations?.[nextLanguage]
    );
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

  async function onPickFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const next = [...pendingAttachments];
    for (const file of files) {
      if (next.length >= MAX_ATTACHMENT_COUNT) {
        setAttachmentNotice(
          tr(
            locale,
            `You can attach up to ${MAX_ATTACHMENT_COUNT} files per message.`,
            `메시지당 최대 ${MAX_ATTACHMENT_COUNT}개 파일까지 첨부할 수 있습니다.`
          )
        );
        break;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setAttachmentNotice(
          tr(
            locale,
            `File is too large: ${file.name}. Maximum size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`,
            `파일 용량이 너무 큽니다: ${file.name}. 최대 ${formatFileSize(MAX_FILE_SIZE_BYTES)}까지 가능합니다.`
          )
        );
        continue;
      }

      const dataUrl = await readFileAsDataUrl(file);
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        dataUrl
      });
    }

    setPendingAttachments(next);
    event.target.value = "";
  }

  function removePendingAttachment(id: string): void {
    setPendingAttachments((current) => current.filter((item) => item.id !== id));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed && pendingAttachments.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `user-${now}`,
      sender: "user",
      text: trimmed,
      timestamp: now,
      attachments: pendingAttachments
    };

    const vendorText = hasHangul(trimmed)
      ? "Thanks for your request. We can share timeline and formal quotation in 24 hours."
      : pendingAttachments.length > 0
        ? "Murakoze ku butumwa n'inyandiko mwaduhaye. Turazisuzuma duhite tubasubiza."
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
    recordChatVendor({ id: vendorId, name: vendorName });
    setInput("");
    setPendingAttachments([]);
    setAttachmentNotice("");
  }

  return (
    <div className={`chat-widget ${isOpen ? "open" : "closed"}`}>
      {!isOpen ? (
        <button className="chat-widget-launch" onClick={() => setIsOpen(true)} type="button">
          💬 {tr(locale, "Chat with vendor", "업체와 채팅")}
        </button>
      ) : (
        <article className="chat-widget-panel">
          <div className="chat-widget-header">
            <div>
              <strong>{vendorName}</strong>
              <p>{tr(locale, "Messenger-style quick chat", "메신저형 빠른 채팅")}</p>
            </div>
            <button aria-label="Minimize chat" onClick={() => setIsOpen(false)} type="button">
              −
            </button>
          </div>
          <div className="chat-widget-body">
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
                  {message.text ? <p>{visibleText(message)}</p> : <p>{tr(locale, "(Attachment)", "(첨부파일)")}</p>}
                  {message.attachments && message.attachments.length > 0 && (
                    <ul className="chat-attachment-list">
                      {message.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <a download={attachment.name} href={attachment.dataUrl}>
                            {attachment.name}
                          </a>
                          <span>{formatFileSize(attachment.sizeBytes)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
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
              <div className="chat-upload-row">
                <label className="chat-upload-label">
                  <span>{tr(locale, "Attach file", "파일 첨부")}</span>
                  <input multiple onChange={(event) => void onPickFiles(event)} type="file" />
                </label>
                <button className="btn" type="submit">
                  {tr(locale, "Send", "보내기")}
                </button>
              </div>
              {pendingAttachments.length > 0 && (
                <ul className="chat-pending-list">
                  {pendingAttachments.map((attachment) => (
                    <li key={attachment.id}>
                      <span>
                        {attachment.name} ({formatFileSize(attachment.sizeBytes)})
                      </span>
                      <button onClick={() => removePendingAttachment(attachment.id)} type="button">
                        {tr(locale, "Remove", "삭제")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {attachmentNotice && <p className="tiny muted">{attachmentNotice}</p>}
            </form>
          </div>
        </article>
      )}
    </div>
  );
}
