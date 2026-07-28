"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";
import { Locale, tr } from "@/lib/i18n";
import { recordChatVendor } from "@/lib/vendor-storage";
import { getChatThreadsUpdatedEventName } from "@/components/ChatThreadsStrip";
import { RequestDocumentType, saveRequestedDocument } from "@/lib/request-documents-storage";

type DisplayLang = "original" | "en" | "ko" | "rw";
type StoredLang = "en" | "ko" | "rw";

interface UploadAttachment {
  id?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export interface VendorPaymentInfo {
  businessName: string;
  phone?: string;
  tinNumber?: string;
  paymentMethods?: string;
  momoAccountName?: string;
  momoNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankSwiftCode?: string;
}

interface VendorChatBoxProps {
  vendorId: string;
  vendorName: string;
  locale: Locale;
  chatUserId?: string | null;
  initialCustomerUserId?: string | null;
  isProviderOwner?: boolean;
  canSendPaymentInfo?: boolean;
  paymentInfo?: VendorPaymentInfo | null;
}

interface ProviderChatThread {
  customerUserId: string;
  customerName: string;
  lastMessagePreview: string;
  lastMessageAt: string;
}

interface ChatAttachment extends UploadAttachment {
  id: string;
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

const languageLabels: Record<DisplayLang, { en: string; ko: string; fr: string; rw: string }> = {
  original: { en: "Original", ko: "원문", fr: "Original", rw: "Umwimerere" },
  en: { en: "English", ko: "영어", fr: "Anglais", rw: "Icyongereza" },
  ko: { en: "Korean", ko: "한국어", fr: "Coréen", rw: "Igikoreya" },
  rw: { en: "Kinyarwanda", ko: "키냐르완다어", fr: "Kinyarwanda", rw: "Ikinyarwanda" }
};

function getStorageKey(vendorId: string): string {
  return `muzungu_chat_${vendorId}`;
}

function getChatOpenStorageKey(vendorId: string): string {
  return `muzungu_chat_open_${vendorId}`;
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

async function markChatThreadRead(vendorId: string, customerUserId: string): Promise<void> {
  try {
    await fetch("/api/chat-threads/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerProfileId: vendorId,
        customerUserId
      })
    });
    window.dispatchEvent(new Event(getChatThreadsUpdatedEventName()));
  } catch {
    // Ignore read-state sync failures.
  }
}

async function fetchServerChat(vendorId: string, customerUserId?: string): Promise<ChatMessage[] | null> {
  try {
    const query = customerUserId ? `?customerUserId=${encodeURIComponent(customerUserId)}` : "";
    const response = await fetch(`/api/providers/${vendorId}/chat${query}`);
    if (response.status === 401) {
      return null;
    }
    const payload = (await response.json()) as { data?: ChatMessage[] };
    if (!response.ok || !Array.isArray(payload.data)) {
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

async function saveServerChatMessage(
  vendorId: string,
  message: ChatMessage,
  customerUserId?: string
): Promise<ChatMessage | null> {
  try {
    const response = await fetch(`/api/providers/${vendorId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: message.sender,
        text: message.text,
        attachments: message.attachments,
        translations: message.translations,
        customerUserId
      })
    });
    const payload = (await response.json()) as { data?: ChatMessage };
    if (!response.ok || !payload.data) {
      return null;
    }
    return payload.data;
  } catch {
    return null;
  }
}

function hasPaymentInfoMessage(messages: ChatMessage[]): boolean {
  return messages.some(
    (message) =>
      message.sender === "vendor" &&
      (message.text.includes("Payment information") || message.text.includes("결제 정보"))
  );
}

function hasHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

function defaultDisplayLanguage(locale: Locale): DisplayLang {
  if (locale === "ko") {
    return "ko";
  }
  if (locale === "rw") {
    return "rw";
  }
  return "en";
}

function buildPaymentInfoMessage(info: VendorPaymentInfo, locale: Locale): string {
  const lines = [
    tr(locale, "Payment information", "결제 정보"),
    `${tr(locale, "Company", "회사명")}: ${info.businessName}`
  ];

  if (info.phone?.trim()) {
    lines.push(`${tr(locale, "Phone", "휴대폰")}: ${info.phone}`);
  }
  if (info.tinNumber?.trim()) {
    lines.push(`TIN: ${info.tinNumber}`);
  }
  if (info.paymentMethods?.trim()) {
    lines.push(`${tr(locale, "Payment methods", "결제 방법")}: ${info.paymentMethods}`);
  }
  if (info.momoNumber?.trim()) {
    lines.push(
      `MoMo: ${info.momoNumber}${info.momoAccountName ? ` (${info.momoAccountName})` : ""}`
    );
  }
  if (info.bankAccountNumber?.trim()) {
    lines.push(`${tr(locale, "Bank", "은행")}: ${info.bankName ?? "-"}`);
    lines.push(`${tr(locale, "Account name", "예금주")}: ${info.bankAccountName ?? "-"}`);
    lines.push(`${tr(locale, "Account number", "계좌번호")}: ${info.bankAccountNumber}`);
    if (info.bankSwiftCode?.trim()) {
      lines.push(`SWIFT: ${info.bankSwiftCode}`);
    }
  }

  return lines.join("\n");
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

function createTextAttachment(id: string, name: string, content: string): ChatAttachment {
  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
  return {
    id,
    name,
    mimeType: "text/plain",
    sizeBytes: content.length,
    dataUrl
  };
}

export function VendorChatBox({
  vendorId,
  vendorName,
  locale,
  chatUserId = null,
  initialCustomerUserId = null,
  isProviderOwner = false,
  canSendPaymentInfo = false,
  paymentInfo = null
}: VendorChatBoxProps) {
  const initialMessage = useMemo<ChatMessage[]>(
    () => [
      {
        id: "welcome-message",
        sender: "vendor",
        text:
          locale === "ko"
            ? `안녕하세요, ${vendorName}입니다. 요청 내용을 남겨주시면 가격 정보를 포함해 빠르게 답변드릴게요.`
            : locale === "fr"
              ? `Bonjour, ici ${vendorName}. Partagez votre demande et nous répondrons rapidement avec les informations de prix.`
              : locale === "rw"
                ? `Muraho, aha ni ${vendorName}. Tanga ubusabe bwawe tugusubize vuba hamwe n'ibiciro.`
                : `Hi, this is ${vendorName}. Share your request and we will respond quickly with pricing details.`,
        timestamp: "welcome"
      }
    ],
    [vendorName, locale]
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessage);
  const [loadedVendorId, setLoadedVendorId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLang>(() =>
    defaultDisplayLanguage(locale)
  );
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [paymentInfoSent, setPaymentInfoSent] = useState(false);
  const [chatThreads, setChatThreads] = useState<ProviderChatThread[]>([]);
  const [activeCustomerUserId, setActiveCustomerUserId] = useState<string | null>(null);
  const serverCustomerUserId = isProviderOwner ? activeCustomerUserId : chatUserId;
  const usesServerChat = Boolean(serverCustomerUserId);

  useSyncAppLoading(isSending || isBulkTranslating || translatingMessageId !== null);

  useEffect(() => {
    if (!isProviderOwner) {
      return undefined;
    }

    let cancelled = false;

    async function loadThreads(): Promise<void> {
      try {
        const response = await fetch("/api/provider/chat-threads");
        const payload = (await response.json()) as { data?: ProviderChatThread[] };
        if (cancelled || !response.ok || !Array.isArray(payload.data)) {
          return;
        }
        setChatThreads(payload.data);
        setActiveCustomerUserId((current) => {
          if (initialCustomerUserId && payload.data?.some((thread) => thread.customerUserId === initialCustomerUserId)) {
            return initialCustomerUserId;
          }
          return current ?? payload.data?.[0]?.customerUserId ?? null;
        });
      } catch {
        // Keep local fallback when thread lookup fails.
      }
    }

    void loadThreads();
    return () => {
      cancelled = true;
    };
  }, [isProviderOwner, vendorId, initialCustomerUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#vendor-chat") {
      return;
    }
    setIsOpen(true);
    const target = document.getElementById("vendor-chat");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [vendorId]);

  useEffect(() => {
    let cancelled = false;

    async function loadChat(): Promise<void> {
      if (isProviderOwner && !activeCustomerUserId) {
        setMessages(initialMessage);
        setLoadedVendorId(vendorId);
        return;
      }

      if (usesServerChat) {
        const serverMessages = await fetchServerChat(vendorId, serverCustomerUserId ?? undefined);
        if (cancelled) {
          return;
        }
        if (serverMessages) {
          setMessages(serverMessages.length > 0 ? serverMessages : initialMessage);
          setPaymentInfoSent(hasPaymentInfoMessage(serverMessages));
          setLoadedVendorId(vendorId);
          const storedOpen = window.localStorage.getItem(getChatOpenStorageKey(vendorId));
          setIsOpen(storedOpen !== "0" || window.location.hash === "#vendor-chat");
          if (serverCustomerUserId) {
            void markChatThreadRead(vendorId, serverCustomerUserId);
          }
          return;
        }
      }

      const stored = readChat(vendorId);
      if (cancelled) {
        return;
      }
      setMessages(stored.length > 0 ? stored : initialMessage);
      setPaymentInfoSent(hasPaymentInfoMessage(stored));
      setLoadedVendorId(vendorId);
      const storedOpen = window.localStorage.getItem(getChatOpenStorageKey(vendorId));
      setIsOpen(storedOpen !== "0");
    }

    void loadChat();
    return () => {
      cancelled = true;
    };
  }, [vendorId, initialMessage, usesServerChat, serverCustomerUserId, isProviderOwner, activeCustomerUserId]);

  useEffect(() => {
    window.localStorage.setItem(getChatOpenStorageKey(vendorId), isOpen ? "1" : "0");
  }, [vendorId, isOpen]);

  useEffect(() => {
    if (loadedVendorId !== vendorId || usesServerChat) {
      return;
    }
    writeChat(vendorId, messages);
  }, [vendorId, messages, loadedVendorId, usesServerChat]);

  useEffect(() => {
    recordChatVendor({ id: vendorId, name: vendorName });
  }, [vendorId, vendorName]);

  function visibleText(message: ChatMessage): string {
    if (displayLanguage === "original") {
      return message.text;
    }
    return message.translations?.[displayLanguage] ?? message.text;
  }

  function formatTimestamp(timestamp: string): string {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toLocaleTimeString();
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

  function saveAttachmentAs(attachment: ChatAttachment, type: RequestDocumentType): void {
    const saved = saveRequestedDocument({
      requestId: `chat-${vendorId}-${attachment.id}`,
      vendorId,
      vendorName,
      type,
      dataUrl: attachment.dataUrl
    });

    setSaveNotice(
      tr(
        locale,
        `Saved to Requests: ${saved.fileName}`,
        `요청서 문서로 저장됨: ${saved.fileName}`
      )
    );
  }

  async function persistMessages(nextMessages: ChatMessage[]): Promise<ChatMessage[]> {
    if (!usesServerChat) {
      return nextMessages;
    }

    const existingIds = new Set(messages.map((message) => message.id));
    const freshMessages = nextMessages.filter(
      (message) => !existingIds.has(message.id) && message.id !== "welcome-message"
    );
    const savedMessages = [...messages];

    for (const message of freshMessages) {
      const saved = await saveServerChatMessage(vendorId, message, serverCustomerUserId ?? undefined);
      savedMessages.push(saved ?? message);
    }

    if (freshMessages.length > 0) {
      window.dispatchEvent(new Event(getChatThreadsUpdatedEventName()));
    }

    return savedMessages;
  }

  async function appendVendorMessage(text: string, attachments?: ChatAttachment[]): Promise<void> {
    const now = new Date().toISOString();
    const vendorMessage: ChatMessage = {
      id: `vendor-${now}`,
      sender: "vendor",
      text,
      timestamp: now,
      attachments
    };

    const targetLanguages: StoredLang[] = ["en", "ko", "rw"];
    const vendorTranslations = await Promise.all(
      targetLanguages.map((lang) => translateText(vendorMessage.text, lang))
    );
    vendorMessage.translations = {
      en: vendorTranslations[0],
      ko: vendorTranslations[1],
      rw: vendorTranslations[2]
    };

    const nextMessages = [...messages, vendorMessage];
    const persisted = await persistMessages(nextMessages);
    setMessages(persisted);
    recordChatVendor({ id: vendorId, name: vendorName });
  }

  async function sendPaymentInfo(): Promise<void> {
    if (!paymentInfo || paymentInfoSent || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const text = buildPaymentInfoMessage(paymentInfo, locale);
      const attachment = createTextAttachment(
        `payment-info-${Date.now()}`,
        "payment-information.txt",
        text
      );
      await appendVendorMessage(text, [attachment]);
      setPaymentInfoSent(true);
      setSaveNotice(tr(locale, "Payment information sent.", "결제 정보를 전송했습니다."));
    } finally {
      setIsSending(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && pendingAttachments.length === 0) || isSending) {
      return;
    }

    setIsSending(true);
    try {
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

    const lower = trimmed.toLowerCase();
    const vendorAttachments: ChatAttachment[] = [];
    if (lower.includes("quote") || lower.includes("quotation") || lower.includes("견적")) {
      vendorAttachments.push(
        createTextAttachment(
          `vendor-quotation-${now}`,
          "vendor-quotation.txt",
          `Quotation draft from ${vendorName}\nRequested at: ${new Date().toISOString()}\nPlease review and save as Quotation if needed.`
        )
      );
    }
    if (lower.includes("ebm")) {
      vendorAttachments.push(
        createTextAttachment(
          `vendor-ebm-${now}`,
          "vendor-ebm.txt",
          `EBM sample from ${vendorName}\nIssued at: ${new Date().toISOString()}\nPlease review and save as EBM if needed.`
        )
      );
    }
    if (vendorAttachments.length > 0) {
      vendorMessage.attachments = vendorAttachments;
    }

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

    const nextMessages = [...messages, userMessage, vendorMessage];
    const persisted = await persistMessages(nextMessages);
    setMessages(persisted);
    recordChatVendor({ id: vendorId, name: vendorName });
    setInput("");
    setPendingAttachments([]);
    setAttachmentNotice("");
    } finally {
      setIsSending(false);
    }
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
            <div className="chat-widget-header-actions">
              <button
                aria-label={tr(locale, "Minimize chat", "채팅 내리기")}
                className="chat-widget-close-btn"
                onClick={() => setIsOpen(false)}
                title={tr(locale, "Minimize", "내리기")}
                type="button"
              >
                −
              </button>
            </div>
          </div>
          <div className="chat-widget-body">
            {isProviderOwner && (
              <div style={{ marginBottom: "12px" }}>
                <label className="tiny">{tr(locale, "Customer conversation", "손님 대화")}</label>
                {chatThreads.length === 0 ? (
                  <p className="tiny muted" style={{ margin: "6px 0 0" }}>
                    {tr(
                      locale,
                      "Customer chats appear here after someone messages your storefront.",
                      "손님이 업체 페이지에서 채팅을 내면 여기에 표시됩니다."
                    )}
                  </p>
                ) : (
                  <select
                    className="select"
                    onChange={(event) => setActiveCustomerUserId(event.target.value)}
                    value={activeCustomerUserId ?? ""}
                  >
                    {chatThreads.map((thread) => (
                      <option key={thread.customerUserId} value={thread.customerUserId}>
                        {thread.customerName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {canSendPaymentInfo && paymentInfo && (
              <div className="chat-payment-actions">
                <button
                  className="btn secondary"
                  disabled={paymentInfoSent}
                  onClick={() => void sendPaymentInfo()}
                  type="button"
                >
                  {paymentInfoSent
                    ? tr(locale, "Payment info sent", "결제 정보 전송 완료")
                    : tr(locale, "Send payment information", "결제 정보 보내기")}
                </button>
              </div>
            )}
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
                  {locale === "ko"
                    ? languageLabels[lang].ko
                    : locale === "fr"
                      ? languageLabels[lang].fr
                      : locale === "rw"
                        ? languageLabels[lang].rw
                        : languageLabels[lang].en}
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
                          <div>
                            <a download={attachment.name} href={attachment.dataUrl}>
                              {attachment.name}
                            </a>
                            <span>{formatFileSize(attachment.sizeBytes)}</span>
                          </div>
                          {message.sender === "vendor" && (
                            <div className="chat-doc-actions">
                              <button onClick={() => saveAttachmentAs(attachment, "quotation")} type="button">
                                {tr(locale, "Save as Quotation", "견적서로 저장")}
                              </button>
                              <button onClick={() => saveAttachmentAs(attachment, "ebm")} type="button">
                                {tr(locale, "Save as EBM", "EBM으로 저장")}
                              </button>
                            </div>
                          )}
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
                        {locale === "ko"
                          ? languageLabels[lang].ko
                          : locale === "fr"
                            ? languageLabels[lang].fr
                            : locale === "rw"
                              ? languageLabels[lang].rw
                              : languageLabels[lang].en}
                      </button>
                    ))}
                  </div>
                  <span>
                    {formatTimestamp(message.timestamp)}{" "}
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
              {saveNotice && <p className="tiny muted">{saveNotice}</p>}
            </form>
          </div>
        </article>
      )}
    </div>
  );
}
