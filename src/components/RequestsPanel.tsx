"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, localizeCopy, tr } from "@/lib/i18n";
import {
  buildDefaultRequestedDocumentName,
  readRequestedDocuments,
  renameRequestedDocument,
  RequestedDocument,
  saveRequestedDocument
} from "@/lib/request-documents-storage";
import { getVendorStorageEventName } from "@/lib/vendor-storage";

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
  requestType: string;
  providerProfileId: string | null;
  providerName: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  organizationName: string | null;
  organizationTinNumber: string | null;
  purchaseCode: string | null;
  paymentTerm: string | null;
  paymentMethod: string | null;
  paymentNote: string | null;
  paymentDueAt: string | null;
  documentFileName: string | null;
  requestedAmount: number | null;
  status: string;
  category: { name: string };
  offers: Offer[];
  booking: Booking | null;
}

interface VendorContext {
  id: string;
  businessName: string;
  contactPhone: string | null;
  tinNumber: string | null;
  paymentTerms: string[];
  paymentMethods: string[];
  momoAccountName: string | null;
  momoNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
  services: Array<{
    id: string;
    title: string;
    categoryId: string;
    categoryName: string;
    baseAmount: number | null;
    baseCurrency: string;
  }>;
}

interface RequestsPanelProps {
  role: "customer" | "provider" | "org_buyer" | "admin";
  categories: Category[];
  requests: RequestItem[];
  locale: Locale;
  vendorContext: VendorContext | null;
}

interface ApiResult {
  error?: { message: string };
  data?: {
    id?: string;
  };
  id?: string;
}

type VendorRequestType = "quotation" | "purchase" | "ebm";

function toTermLabel(locale: Locale, value: string): string {
  const map: Record<string, { en: string; ko: string }> = {
    prepaid: { en: "Prepaid", ko: "선불" },
    postpaid: { en: "Postpaid", ko: "후불" },
    deposit: { en: "Deposit / partial prepay", ko: "계약금 선지급" },
    other: { en: "Other", ko: "기타" }
  };
  const found = map[value];
  if (!found) {
    return value;
  }
  return locale === "ko" ? found.ko : found.en;
}

function toMethodLabel(locale: Locale, value: string): string {
  const map: Record<string, { en: string; ko: string }> = {
    bank_transfer: { en: "Bank transfer", ko: "은행 이체" },
    momo: { en: "MoMo transfer", ko: "모모 이체" },
    cash: { en: "Cash", ko: "현금" },
    card: { en: "Card", ko: "카드" },
    other: { en: "Other", ko: "기타" }
  };
  const found = map[value];
  if (!found) {
    return value;
  }
  return locale === "ko" ? found.ko : found.en;
}

function toRequestTypeLabel(locale: Locale, value: string): string {
  const map: Record<string, { en: string; ko: string }> = {
    general: { en: "General", ko: "일반 요청" },
    quotation: { en: "Quotation", ko: "견적서 요청" },
    purchase: { en: "Purchase", ko: "구매/진행 요청" },
    ebm: { en: "EBM", ko: "EBM 요청" }
  };
  const found = map[value];
  if (!found) {
    return value;
  }
  return locale === "ko" ? found.ko : found.en;
}

export function RequestsPanel({
  role,
  categories,
  requests,
  locale,
  vendorContext
}: RequestsPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [vendorRequestType, setVendorRequestType] = useState<VendorRequestType>("quotation");
  const [requestedDocs, setRequestedDocs] = useState<RequestedDocument[]>([]);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const router = useRouter();

  const defaultServiceId = vendorContext?.services[0]?.id ?? "";
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceId);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState(
    vendorContext?.paymentTerms[0] ?? "prepaid"
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    vendorContext?.paymentMethods[0] ?? "bank_transfer"
  );
  const [quotationFileName, setQuotationFileName] = useState(
    vendorContext ? buildDefaultRequestedDocumentName(vendorContext.businessName, "quotation") : ""
  );
  const [ebmFileName, setEbmFileName] = useState(
    vendorContext ? buildDefaultRequestedDocumentName(vendorContext.businessName, "ebm") : ""
  );
  const availablePaymentTerms =
    vendorContext && vendorContext.paymentTerms.length > 0
      ? vendorContext.paymentTerms
      : ["prepaid", "postpaid", "deposit", "other"];
  const availablePaymentMethods =
    vendorContext && vendorContext.paymentMethods.length > 0
      ? vendorContext.paymentMethods
      : ["bank_transfer", "momo", "cash", "card", "other"];

  useEffect(() => {
    function refreshRequestedDocs(): void {
      setRequestedDocs(readRequestedDocuments());
    }
    refreshRequestedDocs();
    const eventName = getVendorStorageEventName();
    window.addEventListener(eventName, refreshRequestedDocs);
    window.addEventListener("storage", refreshRequestedDocs);
    return () => {
      window.removeEventListener(eventName, refreshRequestedDocs);
      window.removeEventListener("storage", refreshRequestedDocs);
    };
  }, []);

  const selectedService = useMemo(
    () => vendorContext?.services.find((item) => item.id === selectedServiceId) ?? null,
    [vendorContext, selectedServiceId]
  );

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

  async function submitVendorRequest(
    event: FormEvent<HTMLFormElement>,
    type: VendorRequestType
  ): Promise<void> {
    event.preventDefault();
    if (!vendorContext) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const serviceId = String(formData.get("serviceId") ?? selectedServiceId);
    const service = vendorContext.services.find((item) => item.id === serviceId);
    if (!service) {
      setError(tr(locale, "Please select a service.", "서비스를 선택해 주세요."));
      return;
    }

    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const organizationTinNumber = String(formData.get("organizationTinNumber") ?? "").trim();
    const purchaseCode = String(formData.get("purchaseCode") ?? "").trim();
    const requirementText = String(formData.get("requirementText") ?? "").trim();
    const paymentTerm = String(formData.get("paymentTerm") ?? selectedPaymentTerm);
    const paymentMethod = String(formData.get("paymentMethod") ?? selectedPaymentMethod);
    const paymentNote = String(formData.get("paymentNote") ?? "").trim();
    const documentFileName = String(formData.get("documentFileName") ?? "").trim();
    const amountRaw = String(formData.get("requestedAmount") ?? "").trim();
    const requestedAmount =
      amountRaw.length > 0 ? Number.parseFloat(amountRaw) : service.baseAmount ?? undefined;

    const titleByType: Record<VendorRequestType, string> = {
      quotation: `${vendorContext.businessName} quotation request`,
      purchase: `${vendorContext.businessName} purchase request`,
      ebm: `${vendorContext.businessName} EBM issuance request`
    };

    const payload = {
      requestType: type,
      providerProfileId: vendorContext.id,
      serviceId: service.id,
      categoryId: service.categoryId,
      title: titleByType[type],
      requirementText:
        requirementText ||
        (type === "quotation"
          ? "Please issue an official quotation for this service."
          : type === "purchase"
            ? "Please proceed with purchase and payment details."
            : "Please issue EBM document for this transaction."),
      locationText: null as string | null,
      currency: service.baseCurrency || "RWF",
      needsQuotation: type === "quotation",
      needsEbm: type === "ebm",
      organizationName: organizationName || undefined,
      organizationTinNumber: organizationTinNumber || undefined,
      purchaseCode: purchaseCode || undefined,
      paymentTerm: type === "purchase" ? paymentTerm : undefined,
      paymentMethod: type === "purchase" ? paymentMethod : undefined,
      paymentNote: type === "purchase" ? paymentNote || undefined : undefined,
      requestedAmount: type === "purchase" ? requestedAmount : undefined,
      documentFileName: type === "quotation" || type === "ebm" ? documentFileName || undefined : undefined
    };

    setLoading(true);
    setError("");
    setFeedback("");
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = (await response.json()) as ApiResult;
    setLoading(false);

    if (!response.ok) {
      setError(result.error?.message ?? tr(locale, "Request failed", "요청에 실패했습니다."));
      return;
    }

    const requestId = result.data?.id ?? result.id ?? `local-${Date.now()}`;
    if (type === "quotation" || type === "ebm") {
      saveRequestedDocument({
        requestId,
        vendorId: vendorContext.id,
        vendorName: vendorContext.businessName,
        type,
        fileName: documentFileName || undefined,
        content: [
          `Vendor: ${vendorContext.businessName}`,
          `Service: ${localizeCopy(locale, service.title)}`,
          `Request type: ${type}`,
          `Organization: ${organizationName || "-"}`,
          `Organization TIN: ${organizationTinNumber || "-"}`,
          `Purchase code: ${purchaseCode || "-"}`,
          `Requested at: ${new Date().toISOString()}`
        ].join("\n")
      });
    }

    setFeedback(
      tr(
        locale,
        "Request submitted. You can check generated documents in Requests.",
        "요청이 접수되었습니다. 요청 문서는 요청서 페이지에서 바로 확인할 수 있습니다."
      )
    );
    router.refresh();
    event.currentTarget.reset();
  }

  function saveRenamedDocument(id: string): void {
    const nextName = renameDrafts[id]?.trim();
    if (!nextName) {
      return;
    }
    renameRequestedDocument(id, nextName);
    setFeedback(tr(locale, "Document name updated.", "문서 이름이 변경되었습니다."));
    setRenameDrafts((current) => {
      const clone = { ...current };
      delete clone[id];
      return clone;
    });
    setRequestedDocs(readRequestedDocuments());
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

      {(role === "customer" || role === "org_buyer") && vendorContext && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>
            {tr(locale, "Request this vendor", "이 업체에 요청 보내기")}: {vendorContext.businessName}
          </h2>
          <div className="doc-filter-tabs">
            {(["quotation", "purchase", "ebm"] as VendorRequestType[]).map((type) => (
              <button
                className={`doc-filter-tab ${vendorRequestType === type ? "active" : ""}`}
                key={type}
                onClick={() => setVendorRequestType(type)}
                type="button"
              >
                {toRequestTypeLabel(locale, type)}
              </button>
            ))}
          </div>

          {vendorRequestType === "quotation" && (
            <form className="grid grid-3" onSubmit={(event) => void submitVendorRequest(event, "quotation")}>
              <div>
                <label className="tiny">{tr(locale, "Service", "서비스")}</label>
                <select
                  className="select"
                  name="serviceId"
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  required
                  value={selectedServiceId}
                >
                  {vendorContext.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {localizeCopy(locale, service.title)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="tiny">{tr(locale, "Organization name", "소속 기관명")}</label>
                <input className="input" name="organizationName" required />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Document file name", "문서 파일명")}</label>
                <input
                  className="input"
                  name="documentFileName"
                  onChange={(event) => setQuotationFileName(event.target.value)}
                  value={quotationFileName}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tiny">{tr(locale, "Request details", "요청 상세")}</label>
                <textarea className="textarea" name="requirementText" required />
              </div>
              <button className="btn" disabled={loading} type="submit">
                {tr(locale, "Send quotation request", "견적서 요청 보내기")}
              </button>
            </form>
          )}

          {vendorRequestType === "purchase" && (
            <form className="grid grid-3" onSubmit={(event) => void submitVendorRequest(event, "purchase")}>
              <div>
                <label className="tiny">{tr(locale, "Service", "서비스")}</label>
                <select
                  className="select"
                  name="serviceId"
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  required
                  value={selectedServiceId}
                >
                  {vendorContext.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {localizeCopy(locale, service.title)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="tiny">{tr(locale, "Payment term", "결제 조건")}</label>
                <select
                  className="select"
                  name="paymentTerm"
                  onChange={(event) => setSelectedPaymentTerm(event.target.value)}
                  required
                  value={selectedPaymentTerm}
                >
                  {availablePaymentTerms.map((term) => (
                    <option key={term} value={term}>
                      {toTermLabel(locale, term)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="tiny">{tr(locale, "Payment method", "결제 수단")}</label>
                <select
                  className="select"
                  name="paymentMethod"
                  onChange={(event) => setSelectedPaymentMethod(event.target.value)}
                  required
                  value={selectedPaymentMethod}
                >
                  {availablePaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {toMethodLabel(locale, method)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="tiny">{tr(locale, "Amount", "결제 금액")}</label>
                <input
                  className="input"
                  defaultValue={selectedService?.baseAmount ?? ""}
                  name="requestedAmount"
                  required
                  type="number"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tiny">{tr(locale, "Purchase notes", "구매 요청 메모")}</label>
                <textarea className="textarea" name="paymentNote" />
              </div>
              {(selectedPaymentTerm === "prepaid" || selectedPaymentTerm === "deposit") && (
                <p className="tiny muted" style={{ gridColumn: "1 / -1", margin: 0 }}>
                  {tr(
                    locale,
                    "For prepaid or deposit terms, payment should be completed within 2 hours.",
                    "선불/계약금 선지급의 경우 결제는 2시간 내 완료되어야 합니다."
                  )}
                </p>
              )}
              <div className="panel" style={{ gridColumn: "1 / -1", padding: "12px" }}>
                <p className="tiny" style={{ marginTop: 0 }}>
                  <strong>{tr(locale, "Vendor", "업체")}:</strong> {vendorContext.businessName}
                </p>
                <p className="tiny">
                  <strong>{tr(locale, "Phone", "휴대폰")}:</strong>{" "}
                  {vendorContext.contactPhone ?? tr(locale, "Not provided", "미입력")}
                </p>
                <p className="tiny">
                  <strong>TIN:</strong> {vendorContext.tinNumber ?? tr(locale, "Not provided", "미입력")}
                </p>
                {selectedPaymentMethod === "momo" && (
                  <p className="tiny">
                    <strong>MoMo:</strong> {vendorContext.momoNumber ?? "-"}{" "}
                    {vendorContext.momoAccountName ? `(${vendorContext.momoAccountName})` : ""}
                  </p>
                )}
                {selectedPaymentMethod === "bank_transfer" && (
                  <div className="tiny">
                    <p>
                      <strong>{tr(locale, "Bank", "은행")}:</strong> {vendorContext.bankName ?? "-"}
                    </p>
                    <p>
                      <strong>{tr(locale, "Account name", "예금주")}:</strong>{" "}
                      {vendorContext.bankAccountName ?? "-"}
                    </p>
                    <p>
                      <strong>{tr(locale, "Account number", "계좌번호")}:</strong>{" "}
                      {vendorContext.bankAccountNumber ?? "-"}
                    </p>
                    <p>
                      <strong>SWIFT:</strong> {vendorContext.bankSwiftCode ?? "-"}
                    </p>
                  </div>
                )}
              </div>
              <button className="btn" disabled={loading} type="submit">
                {tr(locale, "Send purchase request", "구매/진행 요청 보내기")}
              </button>
            </form>
          )}

          {vendorRequestType === "ebm" && (
            <form className="grid grid-3" onSubmit={(event) => void submitVendorRequest(event, "ebm")}>
              <div>
                <label className="tiny">{tr(locale, "Service", "서비스")}</label>
                <select
                  className="select"
                  name="serviceId"
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  required
                  value={selectedServiceId}
                >
                  {vendorContext.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {localizeCopy(locale, service.title)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="tiny">{tr(locale, "Organization TIN number", "소속 기관 TIN 번호")}</label>
                <input className="input" name="organizationTinNumber" required />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Purchase code", "Purchase code")}</label>
                <input className="input" name="purchaseCode" placeholder={tr(locale, "Can be filled now or later", "지금 또는 추후 입력 가능")} />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Document file name", "문서 파일명")}</label>
                <input
                  className="input"
                  name="documentFileName"
                  onChange={(event) => setEbmFileName(event.target.value)}
                  value={ebmFileName}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tiny">{tr(locale, "Request details", "요청 상세")}</label>
                <textarea className="textarea" name="requirementText" required />
              </div>
              <button className="btn" disabled={loading} type="submit">
                {tr(locale, "Send EBM request", "EBM 요청 보내기")}
              </button>
            </form>
          )}
        </article>
      )}

      {(role === "customer" || role === "org_buyer") && !vendorContext && (
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
              <input className="input" name="locationText" placeholder={tr(locale, "Kigali", "키갈리")} />
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

      {(role === "customer" || role === "org_buyer") && (
        <article className="panel" id="requested-documents">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Requested documents", "요청한 문서")}</h2>
          {requestedDocs.length === 0 ? (
            <p className="muted">{tr(locale, "No requested documents yet.", "요청한 문서가 없습니다.")}</p>
          ) : (
            <ul className="doc-list">
              {requestedDocs.map((doc) => (
                <li key={doc.id}>
                  <div>
                    <strong>{doc.fileName}</strong>
                    <p className="tiny muted">
                      {doc.vendorName} · {toRequestTypeLabel(locale, doc.type)} ·{" "}
                      {new Date(doc.createdAt).toLocaleString()}
                    </p>
                    <div className="row">
                      <input
                        className="input"
                        onChange={(event) =>
                          setRenameDrafts((current) => ({ ...current, [doc.id]: event.target.value }))
                        }
                        placeholder={tr(locale, "Rename file name", "파일명 변경")}
                        value={renameDrafts[doc.id] ?? ""}
                      />
                      <button className="btn secondary" onClick={() => saveRenamedDocument(doc.id)} type="button">
                        {tr(locale, "Rename", "이름 변경")}
                      </button>
                    </div>
                  </div>
                  <a className="btn" download={doc.fileName} href={doc.dataUrl}>
                    {tr(locale, "Download", "다운로드")}
                  </a>
                </li>
              ))}
            </ul>
          )}
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
              <div className="row tiny">
                <span className="badge">{toRequestTypeLabel(locale, item.requestType)}</span>
                {item.providerName && <span>{tr(locale, "Vendor", "업체")}: {item.providerName}</span>}
                {item.serviceTitle && <span>{tr(locale, "Service", "서비스")}: {localizeCopy(locale, item.serviceTitle)}</span>}
              </div>
              {item.documentFileName && (
                <p className="tiny muted" style={{ marginBottom: "6px" }}>
                  {tr(locale, "Document file", "문서 파일")}: {item.documentFileName}
                </p>
              )}
              {item.organizationName && (
                <p className="tiny muted" style={{ marginBottom: "6px" }}>
                  {tr(locale, "Organization", "소속 기관")}: {item.organizationName}
                </p>
              )}
              {item.organizationTinNumber && (
                <p className="tiny muted" style={{ marginBottom: "6px" }}>
                  {tr(locale, "Organization TIN", "기관 TIN")}: {item.organizationTinNumber}
                </p>
              )}
              {item.paymentTerm && (
                <p className="tiny muted" style={{ marginBottom: "6px" }}>
                  {tr(locale, "Payment", "결제")}: {toTermLabel(locale, item.paymentTerm)} /{" "}
                  {item.paymentMethod ? toMethodLabel(locale, item.paymentMethod) : "-"}
                </p>
              )}
              {item.requestedAmount !== null && item.requestedAmount !== undefined && (
                <p className="tiny muted" style={{ marginBottom: "6px" }}>
                  {tr(locale, "Amount", "금액")}: {item.currency ?? "RWF"} {item.requestedAmount}
                </p>
              )}
              {item.paymentDueAt && (
                <p className="tiny muted" style={{ marginBottom: "6px" }}>
                  {tr(locale, "Payment due by", "결제 마감")}: {new Date(item.paymentDueAt).toLocaleString()}
                </p>
              )}
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
                    <input
                      className="input"
                      name="quotedPrice"
                      placeholder={tr(locale, "Quoted price", "제안 가격")}
                      required
                      type="number"
                    />
                    <input className="input" defaultValue="RWF" maxLength={3} name="currency" />
                  </div>
                  <textarea
                    className="textarea"
                    name="scopeText"
                    placeholder={tr(locale, "Scope and assumptions", "작업 범위 및 가정")}
                  />
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
