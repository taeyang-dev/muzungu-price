"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
}

interface ApiResult {
  error?: { message: string };
}

export function RequestsPanel({ role, categories, requests }: RequestsPanelProps): JSX.Element {
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
    const payload = Object.fromEntries(formData.entries());

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
      setError(data.error?.message ?? "Request failed");
      return;
    }
    setFeedback("Saved successfully.");
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
      setError(data.error?.message ?? "Failed to accept offer");
      return;
    }
    setFeedback("Offer accepted and booking created.");
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
      setError(data.error?.message ?? "Failed to update booking");
      return;
    }
    setFeedback("Booking status updated.");
    router.refresh();
  }

  async function submitReview(event: FormEvent<HTMLFormElement>, bookingId: string): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

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
      setError(data.error?.message ?? "Failed to submit review");
      return;
    }
    setFeedback("Review submitted.");
    router.refresh();
    event.currentTarget.reset();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>Requests & Matching</h1>
      <p className="muted">
        Create procurement requests, gather fixed-price offers, and close bookings with review-based trust.
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      {(role === "customer" || role === "org_buyer") && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Create a request</h2>
          <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/requests", "POST")}>
            <div>
              <label className="tiny">Category</label>
              <select className="select" name="categoryId" required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="tiny">Title</label>
              <input className="input" name="title" required />
            </div>
            <div>
              <label className="tiny">Location</label>
              <input className="input" name="locationText" placeholder="Kampala" />
            </div>
            <div>
              <label className="tiny">Budget min</label>
              <input className="input" name="budgetMin" type="number" />
            </div>
            <div>
              <label className="tiny">Budget max</label>
              <input className="input" name="budgetMax" type="number" />
            </div>
            <div>
              <label className="tiny">Currency</label>
              <input className="input" defaultValue="USD" maxLength={3} name="currency" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="tiny">Requirements</label>
              <textarea className="textarea" name="requirementText" required />
            </div>
            <label className="tiny">
              <input name="needsQuotation" type="checkbox" /> Quotation required
            </label>
            <label className="tiny">
              <input name="needsEbm" type="checkbox" /> EBM required
            </label>
            <button className="btn" disabled={loading} type="submit">
              Create request
            </button>
          </form>
        </article>
      )}

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{role === "provider" ? "Open requests" : "My requests"}</h2>
        {requests.length === 0 && <p className="muted">No requests yet.</p>}
        <div className="grid">
          {requests.map((item) => (
            <div className="card" key={item.id}>
              <h3 style={{ marginTop: 0 }}>{item.title}</h3>
              <p className="tiny muted" style={{ marginTop: 0 }}>
                {item.category.name} · {item.locationText ?? "No location"} · Status: {item.status}
              </p>
              <p>{item.requirementText}</p>
              <p className="tiny">
                Budget:{" "}
                {item.budgetMin && item.budgetMax
                  ? `${item.currency ?? "USD"} ${item.budgetMin} - ${item.budgetMax}`
                  : "Not specified"}
              </p>
              {item.needsQuotation && <span className="badge">Quotation required</span>}
              {item.needsEbm && <span className="badge">EBM required</span>}

              {role === "provider" && (
                <form
                  className="grid"
                  style={{ marginTop: "10px" }}
                  onSubmit={(event) => submitJson(event, `/api/requests/${item.id}/offers`, "POST")}
                >
                  <div className="row">
                    <input className="input" name="quotedPrice" placeholder="Quoted price" required type="number" />
                    <input className="input" defaultValue="USD" maxLength={3} name="currency" />
                  </div>
                  <textarea className="textarea" name="scopeText" placeholder="Scope and assumptions" />
                  <label className="tiny">
                    <input defaultChecked name="canIssueQuotation" type="checkbox" /> Can issue quotation
                  </label>
                  <label className="tiny">
                    <input defaultChecked name="canIssueEbm" type="checkbox" /> Can issue EBM
                  </label>
                  <button className="btn" disabled={loading} type="submit">
                    Submit offer
                  </button>
                </form>
              )}

              {role !== "provider" && (
                <>
                  <div className="hr" />
                  <h4>Offers ({item.offers.length})</h4>
                  {item.offers.map((offer) => (
                    <div className="card" key={offer.id} style={{ marginBottom: "8px" }}>
                      <div className="row tiny">
                        <strong>{offer.providerName}</strong>
                        <span>
                          {offer.currency} {offer.quotedPrice}
                        </span>
                        <span>Status: {offer.status}</span>
                      </div>
                      <div className="tiny">
                        {offer.canIssueQuotation ? "Quotation yes" : "Quotation no"} ·{" "}
                        {offer.canIssueEbm ? "EBM yes" : "EBM no"}
                      </div>
                      {offer.status === "sent" && !item.booking && (
                        <button
                          className="btn"
                          disabled={loading}
                          onClick={() => void acceptOffer(offer.id)}
                          type="button"
                        >
                          Accept offer
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {item.booking && (
                <div style={{ marginTop: "12px" }}>
                  <h4>Booking</h4>
                  <p className="tiny">
                    {item.booking.currency} {item.booking.finalPrice} · Status: {item.booking.status}
                  </p>
                  <div className="row">
                    <button
                      className="btn secondary"
                      disabled={loading}
                      onClick={() => void updateBookingStatus(item.booking!.id, "in_progress")}
                      type="button"
                    >
                      In Progress
                    </button>
                    <button
                      className="btn secondary"
                      disabled={loading}
                      onClick={() => void updateBookingStatus(item.booking!.id, "completed")}
                      type="button"
                    >
                      Mark completed
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
                          placeholder="Overall (1-5)"
                          required
                          type="number"
                        />
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingPriceTransparency"
                          placeholder="Price"
                          type="number"
                        />
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingTimeliness"
                          placeholder="Time"
                          type="number"
                        />
                        <input
                          className="input"
                          max={5}
                          min={1}
                          name="ratingQuality"
                          placeholder="Quality"
                          type="number"
                        />
                      </div>
                      <textarea className="textarea" name="comment" placeholder="Feedback" />
                      <button className="btn" disabled={loading} type="submit">
                        Submit review
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
