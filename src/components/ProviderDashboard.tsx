"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface Service {
  id: string;
  title: string;
}

interface ProviderDashboardProps {
  categories: Category[];
  profile:
    | {
        id: string;
        businessName: string;
        providerType: "freelancer" | "company";
        city: string | null;
        country: string | null;
        bio: string | null;
        logoUrl: string | null;
        coverImageUrl: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        websiteUrl: string | null;
        yearsInBusiness: number | null;
      }
    | null;
  services: Service[];
  verificationCaseId: string | null;
  billing:
    | {
        quotationAvailable: boolean;
        ebmAvailable: boolean;
        quotationLeadTimeHours: number | null;
        ebmNotes: string | null;
      }
    | null;
}

interface ApiResult {
  error?: { message: string };
}

export function ProviderDashboard({
  categories,
  profile,
  services,
  verificationCaseId,
  billing
}: ProviderDashboardProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submitJson(
    event: FormEvent<HTMLFormElement>,
    url: string,
    method: "POST" | "PATCH" | "PUT"
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());

    if ("quotationAvailable" in payload) {
      payload.quotationAvailable = payload.quotationAvailable === "on";
    }
    if ("ebmAvailable" in payload) {
      payload.ebmAvailable = payload.ebmAvailable === "on";
    }
    if ("isPublic" in payload) {
      payload.isPublic = payload.isPublic === "on";
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

    setFeedback("Saved successfully");
    router.refresh();
    event.currentTarget.reset();
  }

  async function triggerVerification(): Promise<void> {
    setLoading(true);
    setError("");
    setFeedback("");
    const response = await fetch("/api/provider/verification-cases", {
      method: "POST"
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? "Failed to create verification case");
      return;
    }
    setFeedback("Verification case started.");
    router.refresh();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>Provider Hub</h1>
      <p className="muted">
        Publish transparent price cards, enable Quotation/EBM, and submit verification evidence.
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{profile ? "Update profile" : "Create provider profile"}</h2>
        <form
          className="grid grid-3"
          onSubmit={(event) =>
            submitJson(event, "/api/provider/profile", profile ? "PATCH" : "POST")
          }
        >
          <div>
            <label className="tiny">Business name</label>
            <input
              className="input"
              defaultValue={profile?.businessName ?? ""}
              name="businessName"
              required
            />
          </div>
          <div>
            <label className="tiny">Type</label>
            <select className="select" defaultValue={profile?.providerType ?? "freelancer"} name="providerType">
              <option value="freelancer">Freelancer</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label className="tiny">City</label>
            <input className="input" defaultValue={profile?.city ?? ""} name="city" />
          </div>
          <div>
            <label className="tiny">Country</label>
            <input className="input" defaultValue={profile?.country ?? ""} name="country" />
          </div>
          <div>
            <label className="tiny">Contact email</label>
            <input className="input" defaultValue={profile?.contactEmail ?? ""} name="contactEmail" />
          </div>
          <div>
            <label className="tiny">Contact phone</label>
            <input className="input" defaultValue={profile?.contactPhone ?? ""} name="contactPhone" />
          </div>
          <div>
            <label className="tiny">Website</label>
            <input className="input" defaultValue={profile?.websiteUrl ?? ""} name="websiteUrl" />
          </div>
          <div>
            <label className="tiny">Years in business</label>
            <input
              className="input"
              defaultValue={profile?.yearsInBusiness ?? ""}
              min={0}
              name="yearsInBusiness"
              type="number"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Logo image URL</label>
            <input className="input" defaultValue={profile?.logoUrl ?? ""} name="logoUrl" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Cover image URL</label>
            <input className="input" defaultValue={profile?.coverImageUrl ?? ""} name="coverImageUrl" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Bio</label>
            <textarea className="textarea" defaultValue={profile?.bio ?? ""} name="bio" />
          </div>
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Saving..." : "Save profile"}
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Quotation / EBM settings</h2>
        <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/provider/billing-capabilities", "PUT")}>
          <label className="tiny">
            <input defaultChecked={billing?.quotationAvailable ?? false} name="quotationAvailable" type="checkbox" />{" "}
            Quotation available
          </label>
          <label className="tiny">
            <input defaultChecked={billing?.ebmAvailable ?? false} name="ebmAvailable" type="checkbox" /> EBM available
          </label>
          <div>
            <label className="tiny">Quotation lead time (hours)</label>
            <input
              className="input"
              defaultValue={billing?.quotationLeadTimeHours ?? ""}
              name="quotationLeadTimeHours"
              type="number"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">EBM notes</label>
            <textarea className="textarea" defaultValue={billing?.ebmNotes ?? ""} name="ebmNotes" />
          </div>
          <button className="btn" disabled={loading} type="submit">
            Save billing settings
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Create service</h2>
        <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/provider/services", "POST")}>
          <div>
            <label className="tiny">Category</label>
            <select className="select" name="categoryId" required>
              <option value="">Choose category</option>
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
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Description</label>
            <textarea className="textarea" name="description" />
          </div>
          <button className="btn" disabled={loading} type="submit">
            Add service
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Add price card to a service</h2>
        <form
          className="grid grid-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const serviceId = formData.get("serviceId");
            if (!serviceId || typeof serviceId !== "string") {
              setError("Select a service first.");
              return;
            }
            void submitJson(
              event,
              `/api/provider/services/${serviceId}/price-cards`,
              "POST"
            );
          }}
        >
          <div>
            <label className="tiny">Service</label>
            <select className="select" name="serviceId" required>
              <option value="">Choose service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="tiny">Tier</label>
            <select className="select" defaultValue="standard" name="tier">
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="tiny">Currency</label>
            <input className="input" defaultValue="USD" maxLength={3} name="currency" required />
          </div>
          <div>
            <label className="tiny">Base price</label>
            <input className="input" min={1} name="basePrice" required type="number" />
          </div>
          <div>
            <label className="tiny">Unit</label>
            <select className="select" defaultValue="per_project" name="unit">
              <option value="per_hour">Per hour</option>
              <option value="per_day">Per day</option>
              <option value="per_project">Per project</option>
            </select>
          </div>
          <label className="tiny">
            <input defaultChecked name="isPublic" type="checkbox" /> Publicly visible
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Inclusions</label>
            <textarea className="textarea" name="inclusions" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Exclusions</label>
            <textarea className="textarea" name="exclusions" />
          </div>
          <button className="btn" disabled={loading} type="submit">
            Add price card
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Verification workflow</h2>
        <p className="tiny muted">
          Start a verification case, then upload your supporting documents.
        </p>
        <button className="btn" disabled={loading} onClick={() => void triggerVerification()} type="button">
          {verificationCaseId ? "Create another case (if current closed)" : "Start verification case"}
        </button>
        {verificationCaseId && (
          <form
            className="grid"
            style={{ marginTop: "16px" }}
            onSubmit={(event) =>
              submitJson(
                event,
                `/api/provider/verification-cases/${verificationCaseId}/documents`,
                "POST"
              )
            }
          >
            <div>
              <label className="tiny">Document type</label>
              <input className="input" name="docType" placeholder="business_license" required />
            </div>
            <div>
              <label className="tiny">File URL</label>
              <input className="input" name="fileUrl" placeholder="https://..." required />
            </div>
            <button className="btn" disabled={loading} type="submit">
              Add document metadata
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
