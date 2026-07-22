"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
}

interface ApiResult {
  error?: { message: string };
}

export function AdminVerificationPanel({ cases }: AdminVerificationPanelProps) {
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
      setError(data.error?.message ?? "Failed to review case");
      return;
    }

    setFeedback("Verification case updated.");
    router.refresh();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>Admin Verification Center</h1>
      <p className="muted">
        Verify provider trust, enforce fixed pricing quality, and review Quotation/EBM document readiness.
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      {cases.length === 0 && <div className="panel">No verification cases yet.</div>}
      {cases.map((item) => (
        <article className="panel" key={item.id}>
          <div className="row">
            <h2 style={{ margin: 0 }}>{item.providerProfile.businessName}</h2>
            <span className="badge">{item.status}</span>
            <span className="badge">Score {item.score}</span>
            {item.level && <span className="badge good">{item.level.replaceAll("_", " ")}</span>}
          </div>
          <p className="tiny muted">
            Owner: {item.providerProfile.user.name} ({item.providerProfile.user.email})
          </p>
          <p className="tiny muted">Current notes: {item.notes ?? "No notes yet"}</p>

          <h4>Documents ({item.documents.length})</h4>
          {item.documents.length === 0 ? (
            <p className="tiny muted">No submitted documents.</p>
          ) : (
            <div className="grid">
              {item.documents.map((document) => (
                <div className="card" key={document.id}>
                  <strong>{document.docType}</strong>
                  <p className="tiny muted">Status: {document.status}</p>
                  <a className="tiny" href={document.fileUrl} rel="noreferrer" target="_blank">
                    View evidence
                  </a>
                </div>
              ))}
            </div>
          )}

          <form className="grid grid-3" onSubmit={(event) => void reviewCase(event, item.id)}>
            <div>
              <label className="tiny">Decision</label>
              <select className="select" defaultValue={item.status} name="status">
                <option value="approved">Approved</option>
                <option value="on_hold">On hold</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="tiny">Score (0-100)</label>
              <input className="input" defaultValue={item.score} max={100} min={0} name="score" type="number" />
            </div>
            <div>
              <label className="tiny">Level</label>
              <select className="select" defaultValue={item.level ?? "verified"} name="level">
                <option value="verified">Verified</option>
                <option value="pro_verified">Pro verified</option>
                <option value="premium_verified">Premium verified</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="tiny">Reviewer notes</label>
              <textarea className="textarea" defaultValue={item.notes ?? ""} name="notes" />
            </div>
            <button className="btn" disabled={loadingId === item.id} type="submit">
              {loadingId === item.id ? "Saving..." : "Save review"}
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}
