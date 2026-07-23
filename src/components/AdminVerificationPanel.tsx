"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface VerificationCaseItem {
  id: string;
  status: string;
  score: number;
  level: string | null;
  notes: string | null;
  createdAt: string;
  providerProfile: {
    businessName: string;
    user: {
      email: string;
      name: string;
    };
  };
  documents: Array<{
    id: string;
    docType: string;
    fileUrl: string;
    status: string;
  }>;
}

interface AdminVerificationPanelProps {
  cases: VerificationCaseItem[];
  locale: Locale;
}

interface ApiResult {
  error?: { message: string };
}

export function AdminVerificationPanel({ cases, locale }: AdminVerificationPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  async function reviewCase(event: FormEvent<HTMLFormElement>, caseId: string): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setLoadingId(caseId);
    setError("");
    setFeedback("");

    const response = await fetch(`/api/admin/verification-cases/${caseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as ApiResult;
    setLoadingId(null);

    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to review case", "검증 케이스 업데이트 실패"));
      return;
    }

    setFeedback(tr(locale, "Verification case updated.", "검증 케이스가 업데이트되었습니다."));
    router.refresh();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Admin Verification Center", "관리자 검증 센터")}</h1>
      <p className="muted">
        {tr(
          locale,
          "Verify provider trust, enforce fixed pricing quality, and review Quotation/EBM document readiness.",
          "업체 신뢰도와 가격 투명성을 검증하고 Quotation/EBM 준비 상태를 확인하세요."
        )}
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      {cases.length === 0 && <div className="panel">{tr(locale, "No verification cases yet.", "검증 케이스가 없습니다.")}</div>}
      {cases.map((item) => (
        <article className="panel" key={item.id}>
          <div className="row">
            <h2 style={{ margin: 0 }}>{item.providerProfile.businessName}</h2>
            <span className="badge">{item.status}</span>
            <span className="badge">
              {tr(locale, "Score", "점수")} {item.score}
            </span>
            {item.level && <span className="badge good">{item.level.replaceAll("_", " ")}</span>}
          </div>
          <p className="tiny muted">
            {tr(locale, "Owner", "담당자")}: {item.providerProfile.user.name} ({item.providerProfile.user.email})
          </p>
          <p className="tiny muted">
            {tr(locale, "Current notes", "현재 노트")}: {item.notes ?? tr(locale, "No notes yet", "노트 없음")}
          </p>

          <h4>
            {tr(locale, "Documents", "문서")} ({item.documents.length})
          </h4>
          {item.documents.length === 0 ? (
            <p className="tiny muted">{tr(locale, "No submitted documents.", "제출된 문서가 없습니다.")}</p>
          ) : (
            <div className="grid">
              {item.documents.map((document) => (
                <div className="card" key={document.id}>
                  <strong>{document.docType}</strong>
                  <p className="tiny muted">
                    {tr(locale, "Status", "상태")}: {document.status}
                  </p>
                  <a className="tiny" href={document.fileUrl} rel="noreferrer" target="_blank">
                    {tr(locale, "View evidence", "증빙 보기")}
                  </a>
                </div>
              ))}
            </div>
          )}

          <form className="grid grid-3" onSubmit={(event) => void reviewCase(event, item.id)}>
            <div>
              <label className="tiny">{tr(locale, "Decision", "결정")}</label>
              <select className="select" defaultValue={item.status} name="status">
                <option value="approved">{tr(locale, "Approved", "승인")}</option>
                <option value="on_hold">{tr(locale, "On hold", "보류")}</option>
                <option value="rejected">{tr(locale, "Rejected", "반려")}</option>
              </select>
            </div>
            <div>
              <label className="tiny">{tr(locale, "Score (0-100)", "점수 (0-100)")}</label>
              <input className="input" defaultValue={item.score} max={100} min={0} name="score" type="number" />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Level", "레벨")}</label>
              <select className="select" defaultValue={item.level ?? "verified"} name="level">
                <option value="verified">{tr(locale, "Verified", "검증됨")}</option>
                <option value="pro_verified">{tr(locale, "Pro verified", "프로 검증")}</option>
                <option value="premium_verified">{tr(locale, "Premium verified", "프리미엄 검증")}</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="tiny">{tr(locale, "Reviewer notes", "검토자 노트")}</label>
              <textarea className="textarea" defaultValue={item.notes ?? ""} name="notes" />
            </div>
            <button className="btn" disabled={loadingId === item.id} type="submit">
              {loadingId === item.id
                ? tr(locale, "Saving...", "저장 중...")
                : tr(locale, "Save review", "검토 저장")}
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}
