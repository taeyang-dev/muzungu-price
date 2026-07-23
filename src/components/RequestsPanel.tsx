"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface Category {
  id: string;
  name: string;
}

interface Offer {
  id: string;
  providerName: string;
  quotedPrice: number;
  currency: string;
  status: string;
  canIssueQuotation: boolean;
  canIssueEbm: boolean;
}

interface Booking {
  id: string;
  status: string;
  finalPrice: number;
  currency: string;
}

interface RequestItem {
  id: string;
  title: string;
  requirementText: string;
  locationText: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string | null;
  needsQuotation: boolean;
  needsEbm: boolean;
  status: string;
  category: { name: string };
  offers: Offer[];
  booking: Booking | null;
}

interface RequestsPanelProps {
  role: "customer" | "provider" | "org_buyer" | "admin";
  categories: Category[];
  requests: RequestItem[];
  locale: Locale;
}

interface ApiResult {
  error?: { message: string };
}

export function RequestsPanel({ role, categories, requests, locale }: RequestsPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submitJson(
    event: FormEvent<HTMLFormElement>,
    url: string,
    method: "POST" | "PATCH"
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());

    if ("needsQuotation" in payload) {
      payload.needsQuotation = payload.needsQuotation === "on";
    }
    if ("needsEbm" in payload) {
      payload.needsEbm = payload.needsEbm === "on";
    }
    if ("canIssueQuotation" in payload) {
      payload.canIssueQuotation = payload.canIssueQuotation === "on";
    }
    if ("canIssueEbm" in payload) {
      payload.canIssueEbm = payload.canIssueEbm === "on";
    }

    setLoading(true);
    setError("");
    setFeedback("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Request failed", "요청에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Saved successfully.", "저장되었습니다."));
    router.refresh();
    event.currentTarget.reset();
  }

  async function acceptOffer(offerId: string): Promise<void> {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/offers/${offerId}/accept`, { method: "PATCH" });
    const data = (await response.json()) as ApiResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to accept offer", "오퍼 수락에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Offer accepted and booking created.", "오퍼가 수락되어 예약이 생성되었습니다."));
    router.refresh();
  }

  async function updateBookingStatus(bookingId: string, status: string): Promise<void> {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to update booking", "예약 상태 업데이트에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Booking status updated.", "예약 상태가 업데이트되었습니다."));
    router.refresh();
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, bookingId: string): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());

    setLoading(true);
    setError("");
    const response = await fetch(`/api/bookings/${bookingId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to submit review", "리뷰 제출에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Review submitted.", "리뷰가 제출되었습니다."));
    router.refresh();
    event.currentTarget.reset();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Requests & Matching", "요청서 & 매칭")}</h1>
      <p className="muted">
        {tr(
          locale,
          "Create procurement requests, gather fixed-price offers, and close bookings with review-based trust.",
          "요청서를 만들고 정가 오퍼를 비교한 뒤, 리뷰 기반으로 거래를 확정하세요."
        )}
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      {(role === "customer" || role === "org_buyer") && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Create a request", "요청서 작성")}</h2>
          <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/requests", "POST")}>
            <div>
              <label className="tiny">{tr(locale, "Category", "카테고리")}</label>
              <select className="select" name="categoryId" required>
                <option value="">{tr(locale, "Select category", "카테고리 선택")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="tiny">{tr(locale, "Title", "제목")}</label>
              <input className="input" name="title" required />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Location", "위치")}</label>
              <input className="input" name="locationText" placeholder={tr(locale, "Kampala", "키갈리")} />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Budget min", "최소 예산")}</label>
              <input className="input" name="budgetMin" type="number" />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Budget max", "최대 예산")}</label>
              <input className="input" name="budgetMax" type="number" />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Currency", "통화")}</label>
              <input className="input" defaultValue="RWF" maxLength={3} name="currency" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="tiny">{tr(locale, "Requirements", "요청 사항")}</label>
              <textarea className="textarea" name="requirementText" required />
            </div>
            <label className="tiny">
              <input name="needsQuotation" type="checkbox" /> {tr(locale, "Quotation required", "견적서 필요")}
            </label>
            <label className="tiny">
              <input name="needsEbm" type="checkbox" /> {tr(locale, "EBM required", "EBM 필요")}
            </label>
            <button className="btn" disabled={loading} type="submit">
              {tr(locale, "Create request", "요청서 만들기")}
            </button>
          </form>
        </article>
      )}

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>
          {role === "provider"
            ? tr(locale, "Open requests", "열린 요청서")
            : tr(locale, "My requests", "내 요청서")}
        </h2>
        {requests.length === 0 && <p className="muted">{tr(locale, "No requests yet.", "요청서가 없습니다.")}</p>}
        <div className="grid">
          {requests.map((item) => (
            <div className="card" key={item.id}>
              <h3 style={{ marginTop: 0 }}>{item.title}</h3>
              <p className="tiny muted" style={{ marginTop: 0 }}>
                {item.category.name} · {item.locationText ?? tr(locale, "No location", "위치 없음")} ·{" "}
                {tr(locale, "Status", "상태")}: {item.status}
              </p>
              <p>{item.requirementText}</p>
              <p className="tiny">
                {tr(locale, "Budget", "예산")}:{" "}
                {item.budgetMin && item.budgetMax
                  ? `${item.currency ?? "RWF"} ${item.budgetMin} - ${item.budgetMax}`
                  : tr(locale, "Not specified", "미기재")}
              </p>
              {item.needsQuotation && <span className="badge">{tr(locale, "Quotation required", "견적서 필요")}</span>}
              {item.needsEbm && <span className="badge">{tr(locale, "EBM required", "EBM 필요")}</span>}

              {role === "provider" && (
                <form
                  className="grid"
                  style={{ marginTop: "10px" }}
                  onSubmit={(event) => submitJson(event, `/api/requests/${item.id}/offers`, "POST")}
                >
                  <div className="row">
                    <input className="input" name="quotedPrice" placeholder={tr(locale, "Quoted price", "제안 가격")} required type="number" />
                    <input className="input" defaultValue="RWF" maxLength={3} name="currency" />
                  </div>
                  <textarea className="textarea" name="scopeText" placeholder={tr(locale, "Scope and assumptions", "작업 범위 및 가정")} />
                  <label className="tiny">
                    <input defaultChecked name="canIssueQuotation" type="checkbox" />{" "}
                    {tr(locale, "Can issue quotation", "견적서 발행 가능")}
                  </label>
                  <label className="tiny">
                    <input defaultChecked name="canIssueEbm" type="checkbox" />{" "}
                    {tr(locale, "Can issue EBM", "EBM 발행 가능")}
                  </label>
                  <button className="btn" disabled={loading} type="submit">
                    {tr(locale, "Submit offer", "오퍼 제출")}
                  </button>
                </form>
              )}

              {role !== "provider" && (
                <>
                  <div className="hr" />
                  <h4>
                    {tr(locale, "Offers", "오퍼")} ({item.offers.length})
                  </h4>
                  {item.offers.map((offer) => (
                    <div className="card" key={offer.id} style={{ marginBottom: "8px" }}>
                      <div className="row tiny">
                        <strong>{offer.providerName}</strong>
                        <span>
                          {offer.currency} {offer.quotedPrice}
                        </span>
                        <span>
                          {tr(locale, "Status", "상태")}: {offer.status}
                        </span>
                      </div>
                      <div className="tiny">
                        {offer.canIssueQuotation
                          ? tr(locale, "Quotation yes", "견적서 가능")
                          : tr(locale, "Quotation no", "견적서 불가")}{" "}
                        ·{" "}
                        {offer.canIssueEbm
                          ? tr(locale, "EBM yes", "EBM 가능")
                          : tr(locale, "EBM no", "EBM 불가")}
                      </div>
                      {offer.status === "sent" && !item.booking && (
                        <button
                          className="btn"
                          disabled={loading}
                          onClick={() => void acceptOffer(offer.id)}
                          type="button"
                        >
                          {tr(locale, "Accept offer", "오퍼 수락")}
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {item.booking && (
                <div style={{ marginTop: "12px" }}>
                  <h4>{tr(locale, "Booking", "예약")}</h4>
                  <p className="tiny">
                    {item.booking.currency} {item.booking.finalPrice} · {tr(locale, "Status", "상태")}:{" "}
                    {item.booking.status}
                  </p>
                  <div className="row">
                    <button
                      className="btn secondary"
                      disabled={loading}
                      onClick={() => void updateBookingStatus(item.booking!.id, "in_progress")}
                      type="button"
                    >
                      {tr(locale, "In Progress", "진행 중")}
                    </button>
                    <button
                      className="btn secondary"
                      disabled={loading}
                      onClick={() => void updateBookingStatus(item.booking!.id, "completed")}
                      type="button"
                    >
                      {tr(locale, "Mark completed", "완료로 표시")}
                    </button>
                  </div>
                  {(role === "customer" || role === "org_buyer") && item.booking.status === "completed" && (
                    <form
                      className="grid"
                      style={{ marginTop: "10px" }}
                      onSubmit={(event) => submitReview(event, item.booking!.id)}
                    >
                      <div className="row">
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingOverall"
                          placeholder={tr(locale, "Overall (1-5)", "종합 평점 (1-5)")}
                          required
                          type="number"
                        />
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingPriceTransparency"
                          placeholder={tr(locale, "Price", "가격")}
                          type="number"
                        />
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingTimeliness"
                          placeholder={tr(locale, "Time", "시간")}
                          type="number"
                        />
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingQuality"
                          placeholder={tr(locale, "Quality", "품질")}
                          type="number"
                        />
                      </div>
                      <textarea className="textarea" name="comment" placeholder={tr(locale, "Feedback", "후기 작성")} />
                      <button className="btn" disabled={loading} type="submit">
                        {tr(locale, "Submit review", "리뷰 제출")}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
