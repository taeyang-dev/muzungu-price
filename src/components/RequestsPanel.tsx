"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, localizeCopy, tr } from "@/lib/i18n";
import {
  buildDefaultRequestedDocumentName,
  readRequestedDocuments,
  renameRequestedDocument,
  RequestDocumentType,
  RequestedDocument
} from "@/lib/request-documents-storage";
import Link from "next/link";
import { QuotationTemplateEditor } from "@/components/QuotationTemplateEditor";
import type { QuotationTemplateDefaults } from "@/lib/quotation-template";
import type { VendorRequestContext } from "@/lib/vendor-request-context";
import { getVendorStorageEventName } from "@/lib/vendor-storage";

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

import type { MappedServiceRequestItem } from "@/lib/service-request-mapper";

type RequestItem = MappedServiceRequestItem;

interface RequestsPanelProps {
  role: "customer" | "provider" | "org_buyer" | "admin";
  requests: RequestItem[];
  locale: Locale;
  mode?: "manage" | "create";
  boxFilter?: "sent" | "received";
  typeFilter?: "all" | "quotation" | "ebm";
  vendorContext?: VendorRequestContext | null;
  providerSelf?: QuotationTemplateDefaults | null;
}

interface ApiResult {
  error?: { message: string; code?: string };
  data?: {
    id?: string;
  };
  id?: string;
}

type VendorRequestType = "quotation" | "ebm";
type RequestBoxFilter = "sent" | "received";
type RequestTypeFilter = "all" | "quotation" | "ebm";

function buildRequestsHref(box: RequestBoxFilter, type: RequestTypeFilter): string {
  const params = new URLSearchParams();
  if (box !== "sent") {
    params.set("box", box);
  }
  if (type !== "all") {
    params.set("type", type);
  }
  const query = params.toString();
  return query ? `/requests?${query}` : "/requests";
}

function buildRequestCardTitle(
  item: RequestItem,
  boxFilter: RequestBoxFilter,
  locale: Locale
): string {
  const counterparty =
    boxFilter === "sent"
      ? item.providerName ?? tr(locale, "Vendor", "업체")
      : item.requesterName ?? tr(locale, "Customer", "손님");

  if (item.requestType === "quotation") {
    return tr(locale, `Quotation request: ${counterparty}`, `견적서 요청: ${counterparty}`);
  }
  if (item.requestType === "ebm") {
    return tr(locale, `EBM request: ${counterparty}`, `EBM 요청: ${counterparty}`);
  }
  return item.title;
}

function vendorOpenedLabel(item: RequestItem, locale: Locale): string {
  if (item.status === "open") {
    return tr(locale, "Waiting for vendor to open", "업체 확인 대기");
  }
  return tr(locale, "Vendor opened your request", "업체가 요청을 확인했습니다");
}

function formatServicePrice(item: RequestItem, locale: Locale): string | null {
  if (item.requestedAmount !== null && item.requestedAmount !== undefined) {
    return `${item.currency ?? "RWF"} ${item.requestedAmount}`;
  }
  if (item.budgetMin && item.budgetMax) {
    return `${item.currency ?? "RWF"} ${item.budgetMin} - ${item.budgetMax}`;
  }
  if (item.serviceTitle) {
    return localizeCopy(locale, item.serviceTitle);
  }
  return null;
}

const ACTIVE_REQUEST_STATUSES = new Set(["open", "negotiating", "booked"]);

function hasDuplicateVendorRequest(
  requests: RequestItem[],
  input: {
    providerProfileId: string;
    serviceId?: string;
    requestType: VendorRequestType;
  }
): boolean {
  if (!input.serviceId) {
    return false;
  }

  return requests.some(
    (item) =>
      item.providerProfileId === input.providerProfileId &&
      item.serviceId === input.serviceId &&
      item.requestType === input.requestType &&
      ACTIVE_REQUEST_STATUSES.has(item.status)
  );
}

function notifyRequestsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("requests-updated"));
  }
}

function mergeRequestedDocuments(
  serverDocs: RequestedDocument[],
  localDocs: RequestedDocument[]
): RequestedDocument[] {
  const merged = new Map<string, RequestedDocument>();
  for (const document of serverDocs) {
    merged.set(document.id, document);
  }
  for (const document of localDocs) {
    if (!merged.has(document.id)) {
      merged.set(document.id, document);
    }
  }
  return [...merged.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function fetchServerDocuments(requestIds: string[]): Promise<RequestedDocument[]> {
  const localDocs = readRequestedDocuments();
  if (requestIds.length === 0) {
    return localDocs;
  }

  try {
    const response = await fetch(`/api/requests/documents?ids=${encodeURIComponent(requestIds.join(","))}`);
    const payload = (await response.json()) as { data?: RequestedDocument[] };
    if (!response.ok || !Array.isArray(payload.data)) {
      return localDocs;
    }
    return mergeRequestedDocuments(payload.data, localDocs);
  } catch {
    return localDocs;
  }
}

function getActionButtonLabel(
  locale: Locale,
  state: { loading: boolean; completed: boolean },
  labels: {
    pending: { en: string; ko: string };
    loading: { en: string; ko: string };
    done: { en: string; ko: string };
  }
): string {
  if (state.loading) {
    return tr(locale, labels.loading.en, labels.loading.ko);
  }
  if (state.completed) {
    return tr(locale, labels.done.en, labels.done.ko);
  }
  return tr(locale, labels.pending.en, labels.pending.ko);
}

function toTermLabel(locale: Locale, value: string): string {
  const map: Record<string, { en: string; ko: string; fr: string; rw: string }> = {
    prepaid: { en: "Prepaid", ko: "선불", fr: "Prépayé", rw: "Yishyurwa mbere" },
    postpaid: { en: "Postpaid", ko: "후불", fr: "Postpayé", rw: "Yishyurwa nyuma" },
    deposit: {
      en: "Deposit / partial prepay",
      ko: "부분 선지급",
      fr: "Acompte / prépaiement partiel",
      rw: "Avansi / kwishyura igice mbere"
    }
  };
  const found = map[value];
  if (!found) {
    return value;
  }
  if (locale === "ko") {
    return found.ko;
  }
  if (locale === "fr") {
    return found.fr;
  }
  if (locale === "rw") {
    return found.rw;
  }
  return found.en;
}

function toMethodLabel(locale: Locale, value: string): string {
  const map: Record<string, { en: string; ko: string; fr: string; rw: string }> = {
    bank_transfer: { en: "Bank transfer", ko: "은행 이체", fr: "Virement bancaire", rw: "Kohereza kuri banki" },
    momo: { en: "MoMo transfer", ko: "모모 이체", fr: "Transfert MoMo", rw: "Kohereza kuri MoMo" },
    cash: { en: "Cash", ko: "현금", fr: "Espèces", rw: "Amafaranga mu ntoki" },
    card: { en: "Card", ko: "카드", fr: "Carte", rw: "Ikarita" },
    other: { en: "Other", ko: "기타", fr: "Autre", rw: "Ibindi" }
  };
  const found = map[value];
  if (!found) {
    return value;
  }
  if (locale === "ko") {
    return found.ko;
  }
  if (locale === "fr") {
    return found.fr;
  }
  if (locale === "rw") {
    return found.rw;
  }
  return found.en;
}

function toRequestTypeLabel(locale: Locale, value: string): string {
  const map: Record<string, { en: string; ko: string; fr: string; rw: string }> = {
    general: { en: "General", ko: "일반 요청", fr: "Général", rw: "Rusange" },
    quotation: { en: "Quotation", ko: "견적서 요청", fr: "Devis", rw: "Quotation" },
    purchase: { en: "Purchase", ko: "구매/진행 요청", fr: "Achat", rw: "Kugura" },
    ebm: { en: "EBM", ko: "EBM 요청", fr: "EBM", rw: "EBM" }
  };
  const found = map[value];
  if (!found) {
    return value;
  }
  if (locale === "ko") {
    return found.ko;
  }
  if (locale === "fr") {
    return found.fr;
  }
  if (locale === "rw") {
    return found.rw;
  }
  return found.en;
}

export function RequestsPanel({
  role,
  requests,
  locale,
  mode = "manage",
  boxFilter = "sent",
  typeFilter = "all",
  vendorContext = null,
  providerSelf = null
}: RequestsPanelProps) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [vendorRequestType, setVendorRequestType] = useState<VendorRequestType>("quotation");
  const [requestedDocs, setRequestedDocs] = useState<RequestedDocument[]>([]);
  const [requestAlerts, setRequestAlerts] = useState<
    Array<{ id: string; message: string; createdAt: string; docId: string }>
  >([]);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [ebmPurchaseCodeTiming, setEbmPurchaseCodeTiming] = useState<"now" | "later">("later");
  const [purchaseCodeDrafts, setPurchaseCodeDrafts] = useState<Record<string, string>>({});
  const router = useRouter();
  const canCreateRequest = role !== "provider";
  const isReceivedView = boxFilter === "received";
  const isSentView = boxFilter === "sent";

  const defaultServiceId = vendorContext?.services[0]?.id ?? "";
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceId);
  const [uploadingByRequestId, setUploadingByRequestId] = useState<Record<string, boolean>>({});
  const [notifyingByRequestId, setNotifyingByRequestId] = useState<Record<string, boolean>>({});
  const [quotationModeByRequestId, setQuotationModeByRequestId] = useState<Record<string, "template" | "file">>({});
  const submittingVendorRequestRef = useRef(false);
  const effectiveServiceId = selectedServiceId || vendorContext?.services[0]?.id || "__other__";

  const typeCounts = useMemo(
    () => ({
      all: requests.length,
      quotation: requests.filter((item) => item.requestType === "quotation").length,
      ebm: requests.filter((item) => item.requestType === "ebm").length
    }),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    if (typeFilter === "all") {
      return requests;
    }
    return requests.filter((item) => item.requestType === typeFilter);
  }, [requests, typeFilter]);

  const documentsByRequestId = useMemo(() => {
    const grouped = new Map<string, RequestedDocument[]>();
    for (const document of requestedDocs) {
      const current = grouped.get(document.requestId) ?? [];
      current.push(document);
      grouped.set(document.requestId, current);
    }
    return grouped;
  }, [requestedDocs]);

  function hasUploadedDocument(requestId: string, type: RequestDocumentType): boolean {
    return (documentsByRequestId.get(requestId) ?? []).some((doc) => doc.type === type);
  }

  function hasNotifiedRequester(requestItem: RequestItem): boolean {
    return Boolean(requestItem.documentNotifiedAt);
  }

  useEffect(() => {
    const alertsKey = "muzungu_request_alerts";
    const seenKey = "muzungu_seen_request_docs";
    let cancelled = false;

    function readAlerts(): Array<{ id: string; message: string; createdAt: string; docId: string }> {
      const raw = window.localStorage.getItem(alertsKey);
      if (!raw) {
        return [];
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return [];
        }
        return parsed.filter(
          (item): item is { id: string; message: string; createdAt: string; docId: string } =>
            typeof item === "object" &&
            item !== null &&
            typeof item.id === "string" &&
            typeof item.message === "string" &&
            typeof item.createdAt === "string" &&
            typeof item.docId === "string"
        );
      } catch {
        return [];
      }
    }

    function applyCustomerAlerts(docs: RequestedDocument[]): void {
      if (role === "provider") {
        setRequestAlerts(readAlerts());
        return;
      }

      const seenRaw = window.localStorage.getItem(seenKey);
      const seenIds = new Set<string>(seenRaw ? (JSON.parse(seenRaw) as string[]) : []);
      const newDocs = docs.filter((doc) => !seenIds.has(doc.id));

      if (newDocs.length > 0) {
        const nextAlerts = newDocs.map((doc) => ({
          id: `alert-${doc.id}`,
          docId: doc.id,
          createdAt: new Date().toISOString(),
          message: tr(
            locale,
            `${doc.vendorName} uploaded ${doc.type === "quotation" ? "a quotation" : "an EBM"} document.`,
            `${doc.vendorName} 업체가 ${doc.type === "quotation" ? "견적서" : "EBM"} 등록을 완료했습니다.`
          )
        }));
        const mergedAlerts = [...nextAlerts, ...readAlerts()].slice(0, 200);
        window.localStorage.setItem(alertsKey, JSON.stringify(mergedAlerts));
        window.localStorage.setItem(seenKey, JSON.stringify([...seenIds, ...newDocs.map((doc) => doc.id)]));
        setRequestAlerts(mergedAlerts);
      } else {
        setRequestAlerts(readAlerts());
      }
    }

    async function refreshRequestedDocs(): Promise<void> {
      const docs = await fetchServerDocuments(requests.map((item) => item.id));
      if (cancelled) {
        return;
      }
      setRequestedDocs(docs);
      applyCustomerAlerts(docs);
    }

    void refreshRequestedDocs();
    const eventName = getVendorStorageEventName();
    const handleRefresh = () => {
      void refreshRequestedDocs();
    };
    window.addEventListener(eventName, handleRefresh);
    window.addEventListener("storage", handleRefresh);
    window.addEventListener("focus", handleRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(eventName, handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [locale, requests, role]);

  const selectedService = useMemo(() => {
    if (!vendorContext || effectiveServiceId === "__other__") {
      return null;
    }
    return vendorContext.services.find((item) => item.id === effectiveServiceId) ?? null;
  }, [vendorContext, effectiveServiceId]);

  async function submitJson(
    event: FormEvent<HTMLFormElement>,
    url: string,
    method: "POST" | "PATCH",
    options: {
      successMessage: { en: string; ko: string };
    } = {
      successMessage: { en: "Saved successfully.", ko: "저장되었습니다." }
    }
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
    const { successMessage } = options;
    setFeedback(tr(locale, successMessage.en, successMessage.ko));
    notifyRequestsUpdated();
    router.refresh();
    event.currentTarget.reset();
  }

  async function submitVendorRequest(
    event: FormEvent<HTMLFormElement>,
    type: VendorRequestType
  ): Promise<void> {
    event.preventDefault();
    if (!vendorContext || loading) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const serviceId = String(formData.get("serviceId") ?? effectiveServiceId);
    const customServiceName = String(formData.get("customServiceName") ?? "").trim();
    const useOtherService = serviceId === "__other__";
    const service = useOtherService
      ? null
      : vendorContext.services.find((item) => item.id === serviceId) ?? null;

    if (useOtherService && customServiceName.length < 2) {
      setError(tr(locale, "Please enter a custom service name.", "기타 서비스명을 입력해 주세요."));
      return;
    }

    if (!useOtherService && !service) {
      setError(tr(locale, "Please select a service.", "서비스를 선택해 주세요."));
      return;
    }

    const organizationName = String(formData.get("organizationName") ?? "").trim();
    const organizationTinNumber = String(formData.get("organizationTinNumber") ?? "").trim();
    const purchaseCode = String(formData.get("purchaseCode") ?? "").trim();
    const requirementText = String(formData.get("requirementText") ?? "").trim();
    const fallbackCategoryId = vendorContext.services[0]?.categoryId ?? "";
    const resolvedCategoryId = service?.categoryId ?? fallbackCategoryId;

    if (!resolvedCategoryId) {
      setError(
        tr(
          locale,
          "No service category is configured for this vendor yet.",
          "이 업체에 서비스 카테고리가 아직 등록되지 않았습니다."
        )
      );
      return;
    }

    const serviceTitleForRequest = service ? localizeCopy(locale, service.title) : customServiceName;

    if (
      service?.id &&
      hasDuplicateVendorRequest(requests, {
        providerProfileId: vendorContext.id,
        serviceId: service.id,
        requestType: type
      })
    ) {
      setError(tr(locale, "This request already exists.", "이미 요청한 건 입니다."));
      return;
    }

    if (submittingVendorRequestRef.current) {
      setError(tr(locale, "This request already exists.", "이미 요청한 건 입니다."));
      return;
    }

    submittingVendorRequestRef.current = true;

    const titleByType: Record<VendorRequestType, string> = {
      quotation: `${vendorContext.businessName} ${serviceTitleForRequest} quotation request`,
      ebm: `${vendorContext.businessName} ${serviceTitleForRequest} EBM issuance request`
    };

    const payload = {
      requestType: type,
      providerProfileId: vendorContext.id,
      serviceId: service?.id,
      categoryId: resolvedCategoryId,
      title: titleByType[type],
      requirementText,
      currency: service?.baseCurrency || "RWF",
      needsQuotation: type === "quotation",
      needsEbm: type === "ebm",
      organizationName: organizationName || undefined,
      organizationTinNumber: organizationTinNumber || undefined,
      purchaseCode: type === "ebm" && ebmPurchaseCodeTiming === "now" ? purchaseCode || undefined : undefined
    };

    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        if (result.error?.code === "REQ_409") {
          setError(tr(locale, "This request already exists.", "이미 요청한 건 입니다."));
          return;
        }
        setError(result.error?.message ?? tr(locale, "Request failed", "요청에 실패했습니다."));
        return;
      }

      const successMessageByType: Record<VendorRequestType, { en: string; ko: string }> = {
        quotation: {
          en: "Quotation request complete.",
          ko: "견적서 요청 완료"
        },
        ebm: {
          en: "EBM request complete.",
          ko: "EBM 요청 완료"
        }
      };
      const successMessage = successMessageByType[type];

      setFeedback(tr(locale, successMessage.en, successMessage.ko));
      notifyRequestsUpdated();
      router.refresh();
      event.currentTarget.reset();
    } finally {
      setLoading(false);
      submittingVendorRequestRef.current = false;
    }
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

  async function updatePurchaseCode(requestId: string): Promise<void> {
    const purchaseCode = purchaseCodeDrafts[requestId]?.trim();
    if (!purchaseCode) {
      setError(tr(locale, "Please enter purchase code.", "Purchase code를 입력해 주세요."));
      return;
    }

    setLoading(true);
    setError("");
    const response = await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseCode })
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to update purchase code.", "Purchase code 업데이트에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Purchase code updated.", "Purchase code가 업데이트되었습니다."));
    setPurchaseCodeDrafts((current) => ({ ...current, [requestId]: "" }));
    router.refresh();
  }

  async function uploadDocumentToServer(
    requestItem: RequestItem,
    input: { type: RequestDocumentType; fileName: string; dataUrl: string }
  ): Promise<RequestedDocument> {
    const response = await fetch(`/api/requests/${requestItem.id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as {
      data?: RequestedDocument;
      error?: { message: string };
    };
    if (!response.ok || !payload.data) {
      throw new Error(payload.error?.message ?? tr(locale, "Failed to upload document.", "문서 업로드에 실패했습니다."));
    }
    return payload.data;
  }

  function upsertRequestedDocument(document: RequestedDocument): void {
    setRequestedDocs((current) => {
      const withoutSameType = current.filter(
        (item) => !(item.requestId === document.requestId && item.type === document.type)
      );
      return [document, ...withoutSameType].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }

  async function providerUploadDocumentOnly(
    requestItem: RequestItem,
    type: RequestDocumentType,
    form: HTMLFormElement
  ): Promise<void> {
    const formData = new FormData(form);
    const file = formData.get("vendorDocument");
    if (!(file instanceof File) || file.size === 0) {
      setError(tr(locale, "Please select a file.", "파일을 선택해 주세요."));
      return;
    }

    setUploadingByRequestId((current) => ({ ...current, [requestItem.id]: true }));
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const vendorName = requestItem.providerName ?? providerSelf?.businessName ?? tr(locale, "Vendor", "업체");
      const saved = await uploadDocumentToServer(requestItem, {
        type,
        dataUrl,
        fileName: buildDefaultRequestedDocumentName(vendorName, type)
      });
      upsertRequestedDocument(saved);
      setFeedback(tr(locale, "Upload complete.", "업로드 완료"));
      notifyRequestsUpdated();
      form.reset();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : tr(locale, "Failed to upload document.", "문서 업로드에 실패했습니다.")
      );
    } finally {
      setUploadingByRequestId((current) => ({ ...current, [requestItem.id]: false }));
    }
  }

  async function providerUploadTemplateDocument(
    requestItem: RequestItem,
    input: { fileName: string; dataUrl: string }
  ): Promise<void> {
    setUploadingByRequestId((current) => ({ ...current, [requestItem.id]: true }));
    setError("");
    try {
      const saved = await uploadDocumentToServer(requestItem, {
        type: "quotation",
        dataUrl: input.dataUrl,
        fileName: input.fileName
      });
      upsertRequestedDocument(saved);
      setFeedback(tr(locale, "Upload complete.", "업로드 완료"));
      notifyRequestsUpdated();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : tr(locale, "Failed to upload document.", "문서 업로드에 실패했습니다.")
      );
    } finally {
      setUploadingByRequestId((current) => ({ ...current, [requestItem.id]: false }));
    }
  }

  async function providerNotifyRequester(
    requestItem: RequestItem,
    type: RequestDocumentType
  ): Promise<void> {
    if (!hasUploadedDocument(requestItem.id, type)) {
      setError(tr(locale, "Upload a document first.", "먼저 문서를 업로드해 주세요."));
      return;
    }

    const doc = (documentsByRequestId.get(requestItem.id) ?? []).find((item) => item.type === type);
    setNotifyingByRequestId((current) => ({ ...current, [requestItem.id]: true }));
    setError("");
    try {
      const response = await fetch(`/api/requests/${requestItem.id}/notify-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          fileName: doc?.fileName
        })
      });
      const data = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(data.error?.message ?? tr(locale, "Failed to notify requester.", "알림 전송에 실패했습니다."));
        return;
      }
      setFeedback(tr(locale, "Notification sent.", "알림 전송 완료"));
      router.refresh();
    } catch {
      setError(tr(locale, "Failed to notify requester.", "알림 전송에 실패했습니다."));
    } finally {
      setNotifyingByRequestId((current) => ({ ...current, [requestItem.id]: false }));
    }
  }

  function buildQuotationDefaults(requestItem: RequestItem): QuotationTemplateDefaults {
    return {
      businessName: providerSelf?.businessName ?? requestItem.providerName ?? "",
      email: providerSelf?.email ?? "",
      phone: providerSelf?.phone ?? "",
      address: providerSelf?.address ?? "",
      paymentMethod: providerSelf?.paymentMethod,
      bankName: providerSelf?.bankName ?? "",
      bankAccountName: providerSelf?.bankAccountName ?? "",
      bankAccountNumber: providerSelf?.bankAccountNumber ?? "",
      bankSwiftCode: providerSelf?.bankSwiftCode ?? "",
      momoAccountName: providerSelf?.momoAccountName ?? "",
      momoNumber: providerSelf?.momoNumber ?? "",
      projectName: requestItem.serviceTitle ? localizeCopy(locale, requestItem.serviceTitle) : requestItem.title
    };
  }

  const vendorRequestForm = vendorContext ? (
    <article className="panel" id="vendor-request">
      <h2 style={{ marginTop: 0 }}>
        {tr(locale, "Request this vendor", "이 업체에 요청 보내기")}: {vendorContext.businessName}
      </h2>
          <div>
            <label className="tiny">{tr(locale, "Request type", "요청 유형")}</label>
            <select
              className="select"
              onChange={(event) => setVendorRequestType(event.target.value as VendorRequestType)}
              value={vendorRequestType}
            >
              <option value="quotation">{tr(locale, "Quotation request", "견적서 요청")}</option>
              <option value="ebm">{tr(locale, "EBM request", "EBM 요청")}</option>
            </select>
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
                  value={effectiveServiceId}
                >
                  {vendorContext.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {localizeCopy(locale, service.title)}
                    </option>
                  ))}
                  <option value="__other__">{tr(locale, "Other (manual input)", "기타 (직접 입력)")}</option>
                </select>
              </div>
              {selectedServiceId === "__other__" && (
                <div>
                  <label className="tiny">{tr(locale, "Other service name", "기타 서비스명")}</label>
                  <input className="input" name="customServiceName" required />
                </div>
              )}
              <div>
                <label className="tiny">{tr(locale, "Organization name", "소속 기관명")}</label>
                <input className="input" name="organizationName" required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tiny">{tr(locale, "Request details", "요청 상세")}</label>
                <textarea className="textarea" name="requirementText" />
              </div>
              <button className="btn" disabled={loading} type="submit">
                {tr(locale, "Send quotation request", "견적서 요청 보내기")}
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
                  value={effectiveServiceId}
                >
                  {vendorContext.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {localizeCopy(locale, service.title)}
                    </option>
                  ))}
                  <option value="__other__">{tr(locale, "Other (manual input)", "기타 (직접 입력)")}</option>
                </select>
              </div>
              {selectedServiceId === "__other__" && (
                <div>
                  <label className="tiny">{tr(locale, "Other service name", "기타 서비스명")}</label>
                  <input className="input" name="customServiceName" required />
                </div>
              )}
              <div>
                <label className="tiny">{tr(locale, "Organization TIN number", "소속 기관 TIN 번호")}</label>
                <input className="input" name="organizationTinNumber" required />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Purchase code", "Purchase code")}</label>
                <select
                  className="select"
                  onChange={(event) => setEbmPurchaseCodeTiming(event.target.value as "now" | "later")}
                  value={ebmPurchaseCodeTiming}
                >
                  <option value="later">{tr(locale, "Enter later", "나중에 입력")}</option>
                  <option value="now">{tr(locale, "Enter now", "지금 입력")}</option>
                </select>
              </div>
              {ebmPurchaseCodeTiming === "now" && (
                <div>
                  <label className="tiny">{tr(locale, "Purchase code", "Purchase code")}</label>
                  <input className="input" name="purchaseCode" required />
                </div>
              )}
              {ebmPurchaseCodeTiming === "later" && (
                <p className="tiny muted" style={{ gridColumn: "1 / -1", margin: 0 }}>
                  {tr(
                    locale,
                    "If the vendor requires purchase code, you can add it later from your request list.",
                    "업체가 Purchase code를 요구하면 요청 목록에서 나중에 입력할 수 있습니다."
                  )}
                </p>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tiny">{tr(locale, "Request details", "요청 상세")}</label>
                <textarea className="textarea" name="requirementText" />
              </div>
              <button className="btn" disabled={loading} type="submit">
                {tr(locale, "Send EBM request", "EBM 요청 보내기")}
              </button>
            </form>
          )}
    </article>
  ) : null;

  if (mode === "create") {
    return (
      <section className="grid">
        {error && <div className="flash error">{error}</div>}
        {feedback && <div className="flash success">{feedback}</div>}
        {canCreateRequest ? (
          vendorRequestForm
        ) : (
          <article className="panel">
            <p className="muted" style={{ margin: 0 }}>
              {tr(locale, "Providers manage incoming requests from the Requests page.", "업체는 요청서 페이지에서 들어온 요청을 관리합니다.")}
            </p>
          </article>
        )}
      </section>
    );
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Requests", "요청서")}</h1>
      <p className="muted" style={{ marginTop: "6px" }}>
        {tr(
          locale,
          "Review request history, upload files, and download documents. To create a new request, open a vendor page and tap Request this vendor.",
          "요청 내역을 확인하고 파일을 업로드·다운로드할 수 있습니다. 새 요청은 업체 상세 페이지에서 '이 업체에 요청 보내기'로만 보낼 수 있습니다."
        )}
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      {requestAlerts.length > 0 && (
        <article className="panel" id="request-alerts">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Notifications", "알림")}</h2>
          <ul className="doc-list">
            {requestAlerts.slice(0, 5).map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.message}</strong>
                  <p className="tiny muted">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="panel">
        <nav className="row tiny" style={{ flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
          <Link
            className={`doc-filter-tab ${boxFilter === "sent" ? "active" : ""}`}
            href={buildRequestsHref("sent", typeFilter)}
          >
            {tr(locale, "Sent", "발신")}
          </Link>
          <Link
            className={`doc-filter-tab ${boxFilter === "received" ? "active" : ""}`}
            href={buildRequestsHref("received", typeFilter)}
          >
            {tr(locale, "Received", "수신")}
          </Link>
        </nav>
        <nav className="row tiny" style={{ flexWrap: "wrap", gap: "8px" }}>
          <Link
            className={`doc-filter-tab ${typeFilter === "all" ? "active" : ""}`}
            href={buildRequestsHref(boxFilter, "all")}
          >
            {tr(locale, "All requests", "전체 요청")} ({typeCounts.all})
          </Link>
          <Link
            className={`doc-filter-tab ${typeFilter === "quotation" ? "active" : ""}`}
            href={buildRequestsHref(boxFilter, "quotation")}
          >
            {tr(locale, "Quotation requests", "견적서 요청")} ({typeCounts.quotation})
          </Link>
          <Link
            className={`doc-filter-tab ${typeFilter === "ebm" ? "active" : ""}`}
            href={buildRequestsHref(boxFilter, "ebm")}
          >
            {tr(locale, "EBM requests", "EBM 요청")} ({typeCounts.ebm})
          </Link>
        </nav>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>
          {isReceivedView
            ? tr(locale, "Received requests", "수신 요청")
            : tr(locale, "Sent requests", "발신 요청")}
        </h2>
        {filteredRequests.length === 0 && (
          <p className="muted">{tr(locale, "No requests yet.", "요청서가 없습니다.")}</p>
        )}
        <div className="grid">
          {filteredRequests.map((item) => {
            const requestDocuments = documentsByRequestId.get(item.id) ?? [];
            const servicePriceLabel = formatServicePrice(item, locale);

            return (
            <div className="card request-card" key={item.id}>
              <div className="request-card-header">
                <h3>{buildRequestCardTitle(item, boxFilter, locale)}</h3>
                {isReceivedView &&
                  item.requesterUserId &&
                  (item.requestType === "quotation" || item.requestType === "ebm") && (
                    <Link
                      className="request-customer-chat-btn"
                      href={`/messages/customers/${item.requesterUserId}?requestId=${item.id}`}
                    >
                      <span aria-hidden="true">💬</span>
                      <span className="request-customer-chat-tooltip">
                        {tr(locale, "Message this customer", "이 손님에게 메시지 보내기")}
                      </span>
                    </Link>
                  )}
              </div>
              <div className="request-card-body">
                <p className="tiny muted">
                  <strong>{tr(locale, "Requested at", "요청 일시")}:</strong>{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                {servicePriceLabel && (
                  <p className="tiny">
                    <strong>{tr(locale, "Service / price", "서비스 / 가격")}:</strong> {servicePriceLabel}
                  </p>
                )}
                {item.requirementText && (
                  <p className="tiny muted">{item.requirementText}</p>
                )}
                {isSentView && (item.requestType === "quotation" || item.requestType === "ebm") && (
                  <p className="tiny">
                    <strong>{tr(locale, "Status", "상태")}:</strong> {vendorOpenedLabel(item, locale)}
                  </p>
                )}
                {item.organizationName && (
                  <p className="tiny muted">
                    {tr(locale, "Organization", "소속 기관")}: {item.organizationName}
                  </p>
                )}
                {item.organizationTinNumber && (
                  <p className="tiny muted">
                    {tr(locale, "Organization TIN", "기관 TIN")}: {item.organizationTinNumber}
                  </p>
                )}
                {isReceivedView && item.purchaseCode && (
                  <p className="tiny">
                    <strong>{tr(locale, "Purchase code", "Purchase code")}:</strong> {item.purchaseCode}
                    {item.purchaseCodeUpdatedAt && (
                      <span className="badge" style={{ marginLeft: "8px" }}>
                        {tr(locale, "Updated", "업데이트됨")}{" "}
                        {new Date(item.purchaseCodeUpdatedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {isSentView && requestDocuments.length > 0 && (
                <div className="panel" style={{ marginTop: "10px", padding: "10px" }}>
                  <h4 style={{ marginTop: 0 }}>{tr(locale, "Documents", "첨부 문서")}</h4>
                  <ul className="doc-list">
                    {requestDocuments.map((doc) => (
                      <li key={doc.id}>
                        <div>
                          <strong>{doc.fileName}</strong>
                          <p className="tiny muted">
                            {doc.vendorName} · {toRequestTypeLabel(locale, doc.type)} ·{" "}
                            {new Date(doc.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <a className="btn" download={doc.fileName} href={doc.dataUrl}>
                          {tr(locale, "Download", "다운로드")}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isReceivedView && item.requestType === "quotation" && (
                <div className="grid request-card-actions" style={{ marginTop: "8px" }}>
                  <div className="row tiny">
                    <label>
                      <input
                        checked={(quotationModeByRequestId[item.id] ?? "file") === "template"}
                        name={`quotation-mode-${item.id}`}
                        onChange={() =>
                          setQuotationModeByRequestId((current) => ({ ...current, [item.id]: "template" }))
                        }
                        type="radio"
                      />{" "}
                      {tr(locale, "Use app template (optional)", "앱 양식 사용 (선택)")}
                    </label>
                    <label>
                      <input
                        checked={(quotationModeByRequestId[item.id] ?? "file") === "file"}
                        name={`quotation-mode-${item.id}`}
                        onChange={() =>
                          setQuotationModeByRequestId((current) => ({ ...current, [item.id]: "file" }))
                        }
                        type="radio"
                      />{" "}
                      {tr(locale, "Upload file", "파일 업로드")}
                    </label>
                  </div>

                  {(quotationModeByRequestId[item.id] ?? "file") === "template" ? (
                    <>
                      <QuotationTemplateEditor
                        completed={hasUploadedDocument(item.id, "quotation")}
                        defaults={buildQuotationDefaults(item)}
                        disabled={
                          uploadingByRequestId[item.id] ||
                          hasUploadedDocument(item.id, "quotation")
                        }
                        locale={locale}
                        onSubmit={(input) => providerUploadTemplateDocument(item, input)}
                        submitting={Boolean(uploadingByRequestId[item.id])}
                      />
                      <div className="request-action-row">
                        <button
                          className="btn secondary"
                          disabled={
                            !hasUploadedDocument(item.id, "quotation") ||
                            notifyingByRequestId[item.id] ||
                            hasNotifiedRequester(item)
                          }
                          onClick={() => void providerNotifyRequester(item, "quotation")}
                          type="button"
                        >
                          {getActionButtonLabel(
                            locale,
                            {
                              loading: Boolean(notifyingByRequestId[item.id]),
                              completed: hasNotifiedRequester(item)
                            },
                            {
                              pending: { en: "Notify requester", ko: "요청자에게 알림 보내기" },
                              loading: { en: "Sending notification...", ko: "알림 전송 중..." },
                              done: { en: "Notification sent", ko: "알림 전송 완료" }
                            }
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <form className="grid" onSubmit={(event) => event.preventDefault()}>
                      <label className="tiny">
                        {tr(locale, "Upload quotation document", "견적서 문서 업로드")}
                      </label>
                      <input className="input" name="vendorDocument" type="file" />
                      <div className="request-action-row">
                        <button
                          className="btn"
                          disabled={
                            uploadingByRequestId[item.id] ||
                            hasUploadedDocument(item.id, "quotation")
                          }
                          onClick={(event) => {
                            const form = event.currentTarget.form;
                            if (form) {
                              void providerUploadDocumentOnly(item, "quotation", form);
                            }
                          }}
                          type="button"
                        >
                          {getActionButtonLabel(
                            locale,
                            {
                              loading: Boolean(uploadingByRequestId[item.id]),
                              completed: hasUploadedDocument(item.id, "quotation")
                            },
                            {
                              pending: { en: "Upload", ko: "업로드" },
                              loading: { en: "Uploading...", ko: "업로드 중..." },
                              done: { en: "Upload complete", ko: "업로드 완료" }
                            }
                          )}
                        </button>
                        <button
                          className="btn secondary"
                          disabled={
                            !hasUploadedDocument(item.id, "quotation") ||
                            notifyingByRequestId[item.id] ||
                            hasNotifiedRequester(item)
                          }
                          onClick={() => void providerNotifyRequester(item, "quotation")}
                          type="button"
                        >
                          {getActionButtonLabel(
                            locale,
                            {
                              loading: Boolean(notifyingByRequestId[item.id]),
                              completed: hasNotifiedRequester(item)
                            },
                            {
                              pending: { en: "Notify requester", ko: "요청자에게 알림 보내기" },
                              loading: { en: "Sending notification...", ko: "알림 전송 중..." },
                              done: { en: "Notification sent", ko: "알림 전송 완료" }
                            }
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {isReceivedView && item.requestType === "ebm" && (
                <form
                  className="grid request-card-actions"
                  style={{ marginTop: "8px" }}
                  onSubmit={(event) => event.preventDefault()}
                >
                  <label className="tiny">{tr(locale, "Upload EBM document", "EBM 문서 업로드")}</label>
                  <p className="tiny muted" style={{ margin: 0 }}>
                    {tr(
                      locale,
                      "EBM is issued after the transaction. Upload the official receipt file only.",
                      "EBM은 거래 완료 후 발행되는 영수증입니다. 공식 EBM 파일만 업로드해 주세요."
                    )}
                  </p>
                  <input className="input" name="vendorDocument" type="file" />
                  <div className="request-action-row">
                    <button
                      className="btn"
                      disabled={
                        uploadingByRequestId[item.id] ||
                        hasUploadedDocument(item.id, "ebm")
                      }
                      onClick={(event) => {
                        const form = event.currentTarget.form;
                        if (form) {
                          void providerUploadDocumentOnly(item, "ebm", form);
                        }
                      }}
                      type="button"
                    >
                      {getActionButtonLabel(
                        locale,
                        {
                          loading: Boolean(uploadingByRequestId[item.id]),
                          completed: hasUploadedDocument(item.id, "ebm")
                        },
                        {
                          pending: { en: "Upload", ko: "업로드" },
                          loading: { en: "Uploading...", ko: "업로드 중..." },
                          done: { en: "Upload complete", ko: "업로드 완료" }
                        }
                      )}
                    </button>
                    <button
                      className="btn secondary"
                      disabled={
                        !hasUploadedDocument(item.id, "ebm") ||
                        notifyingByRequestId[item.id] ||
                        hasNotifiedRequester(item)
                      }
                      onClick={() => void providerNotifyRequester(item, "ebm")}
                      type="button"
                    >
                      {getActionButtonLabel(
                        locale,
                        {
                          loading: Boolean(notifyingByRequestId[item.id]),
                          completed: hasNotifiedRequester(item)
                        },
                        {
                          pending: { en: "Notify requester", ko: "요청자에게 알림 보내기" },
                          loading: { en: "Sending notification...", ko: "알림 전송 중..." },
                          done: { en: "Notification sent", ko: "알림 전송 완료" }
                        }
                      )}
                    </button>
                  </div>
                </form>
              )}

              {isSentView &&
                canCreateRequest &&
                item.requestType === "ebm" &&
                !item.purchaseCode && (
                  <div className="panel" style={{ marginTop: "10px", padding: "10px" }}>
                    <p className="tiny" style={{ marginTop: 0 }}>
                      {tr(
                        locale,
                        "Purchase code is not entered yet. Add it when your organization confirms it.",
                        "Purchase code가 아직 없습니다. 기관 승인 후 입력해 주세요."
                      )}
                    </p>
                    <div className="row">
                      <input
                        className="input"
                        onChange={(event) =>
                          setPurchaseCodeDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder="Purchase code"
                        value={purchaseCodeDrafts[item.id] ?? ""}
                      />
                      <button
                        className="btn secondary"
                        disabled={loading}
                        onClick={() => void updatePurchaseCode(item.id)}
                        type="button"
                      >
                        {tr(locale, "Save purchase code", "Purchase code 저장")}
                      </button>
                    </div>
                  </div>
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
            );
          })}
        </div>
      </article>
    </section>
  );
}
