"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";
import { Locale, tr } from "@/lib/i18n";

interface CustomerMessageComposerProps {
  customerName: string;
  customerUserId: string;
  defaultSubject: string;
  locale: Locale;
  requestId?: string;
}

export function CustomerMessageComposer({
  customerName,
  customerUserId,
  defaultSubject,
  locale,
  requestId
}: CustomerMessageComposerProps) {
  const router = useRouter();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sendCompleted, setSendCompleted] = useState(false);

  useSyncAppLoading(loading);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFeedback("");

    const response = await fetch(`/api/messages/customers/${customerUserId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        requestId
      })
    });

    const data = (await response.json()) as { error?: { message: string } };
    setLoading(false);

    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to send message", "메시지 전송에 실패했습니다."));
      return;
    }

    setSendCompleted(true);
    setFeedback(
      tr(
        locale,
        `Message sent to ${customerName}.`,
        `${customerName} 손님에게 메시지를 보냈습니다.`
      )
    );
    setBody("");
    router.refresh();
  }

  function startAnotherMessage(): void {
    setSendCompleted(false);
    setFeedback("");
    setError("");
    setBody("");
  }

  return (
    <form className="grid" onSubmit={(event) => void handleSubmit(event)}>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}
      <div>
        <label className="tiny">{tr(locale, "Subject", "제목")}</label>
        <input
          className="input"
          disabled={sendCompleted}
          onChange={(event) => setSubject(event.target.value)}
          value={subject}
        />
      </div>
      <div>
        <label className="tiny">{tr(locale, "Message", "메시지")}</label>
        <textarea
          className="textarea"
          disabled={sendCompleted}
          onChange={(event) => setBody(event.target.value)}
          placeholder={tr(locale, "Write your message to this customer...", "이 손님에게 보낼 메시지를 입력하세요...")}
          required
          rows={6}
          value={body}
        />
      </div>
      <button className="btn" disabled={loading || sendCompleted} type="submit">
        {sendCompleted
          ? tr(locale, "Message sent", "전송 완료")
          : loading
            ? tr(locale, "Sending...", "전송 중...")
            : tr(locale, "Send to this customer", "이 손님에게 보내기")}
      </button>
      {sendCompleted ? (
        <button className="btn secondary" onClick={startAnotherMessage} type="button">
          {tr(locale, "Send another message", "다시 메시지 보내기")}
        </button>
      ) : null}
    </form>
  );
}
