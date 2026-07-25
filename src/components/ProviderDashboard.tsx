"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";
import { normalizeCityInput, normalizeCountryInput } from "@/lib/location";
import { isMarketplaceCategorySlug } from "@/lib/service-categories";

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface ProviderDashboardProps {
  categories: Category[];
  locale: Locale;
  profile:
    | {
        id: string;
        businessName: string;
        providerType:
          | "freelancer"
          | "company"
          | "sole_proprietor"
          | "partnership"
          | "cooperative"
          | "ngo"
          | "other";
        providerTypeOther: string | null;
        businessActivitySector: string | null;
        businessActivityCode: string | null;
        businessActivityDetail: string | null;
        businessActivityOther: string | null;
        officialBusinessAddress: string | null;
        representativeName: string | null;
        representativeNationality: string | null;
        representativeIdType: string | null;
        representativeIdTypeOther: string | null;
        representativeIdNumber: string | null;
        representativeLocalAddress: string | null;
        representativeEmail: string | null;
        representativePhone: string | null;
        tagline: string | null;
        city: string | null;
        country: string | null;
        bio: string | null;
        logoUrl: string | null;
        coverImageUrl: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        websiteUrl: string | null;
        yearsInBusiness: number | null;
        categoryIds: string[];
      }
    | null;
  verificationCaseId: string | null;
  verificationDocumentCount: number;
  verificationStatus: "draft" | "pending" | "approved" | "rejected" | "on_hold" | null;
  billing:
    | {
        quotationAvailable: boolean;
        ebmAvailable: boolean;
        quotationLeadTimeHours: number | null;
        ebmNotes: string | null;
        vendorTinNumber: string | null;
        paymentTerms: string[];
        paymentMethods: string[];
        paymentMethodOtherDetail: string | null;
        momoAccountName: string | null;
        momoNumber: string | null;
        bankName: string | null;
        bankAccountName: string | null;
        bankAccountNumber: string | null;
        bankSwiftCode: string | null;
      }
    | null;
}

interface ApiResult {
  error?: { message: string };
}

type SaveAction = "profile" | "billing";

interface DocumentUploadRow {
  id: string;
  docType: string;
}

function createDocumentRow(docType = "rdb_certificate"): DocumentUploadRow {
  return { id: crypto.randomUUID(), docType };
}

export function ProviderDashboard({
  locale,
  categories,
  profile,
  verificationCaseId,
  verificationDocumentCount,
  verificationStatus,
  billing
}: ProviderDashboardProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(
    billing?.paymentMethods ?? []
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isDraftReview = verificationStatus === "draft" || verificationStatus === null;
  const canUploadDocuments = verificationStatus !== "approved";
  const profileSectionComplete = Boolean(
    profile?.businessName &&
      profile.businessName !== "임시 저장" &&
      profile.city &&
      profile.country &&
      profile.representativeName &&
      (profile.categoryIds.length ?? 0) > 0
  );
  const billingSectionComplete = Boolean(
    billing && (billing.quotationAvailable || billing.ebmAvailable || billing.vendorTinNumber)
  );
  const [selectedProviderType, setSelectedProviderType] = useState<string>(
    profile?.providerType ?? "company"
  );
  const [selectedBusinessSector, setSelectedBusinessSector] = useState<string>(
    profile?.businessActivitySector ?? "services"
  );
  const [selectedBusinessDetail, setSelectedBusinessDetail] = useState<string>(
    profile?.businessActivityDetail ?? "general_services"
  );
  const [selectedRepresentativeIdType, setSelectedRepresentativeIdType] = useState<string>(
    profile?.representativeIdType ?? "national_id"
  );
  const [cityInput, setCityInput] = useState(profile?.city ?? "");
  const [countryInput, setCountryInput] = useState(profile?.country ?? "Rwanda");
  const [completedActions, setCompletedActions] = useState<Partial<Record<SaveAction, boolean>>>({});
  const [documentRows, setDocumentRows] = useState<DocumentUploadRow[]>([createDocumentRow()]);
  const [uploadedDocumentRowIds, setUploadedDocumentRowIds] = useState<Set<string>>(new Set());
  const [uploadingDocumentRowId, setUploadingDocumentRowId] = useState<string | null>(null);
  const documentsSectionComplete = verificationDocumentCount > 0 || uploadedDocumentRowIds.size > 0;
  const allSectionsComplete = profileSectionComplete && billingSectionComplete && documentsSectionComplete;

  const providerTypeOptions = [
    { value: "company", labelEn: "Company", labelKo: "법인 업체" },
    { value: "sole_proprietor", labelEn: "Sole proprietor", labelKo: "개인사업자" },
    { value: "partnership", labelEn: "Partnership", labelKo: "합자/파트너십" },
    { value: "cooperative", labelEn: "Cooperative", labelKo: "협동조합" },
    { value: "ngo", labelEn: "NGO / Institution", labelKo: "NGO / 기관" },
    { value: "freelancer", labelEn: "Freelancer", labelKo: "프리랜서" },
    { value: "other", labelEn: "Other", labelKo: "기타" }
  ] as const;

  const businessSectorOptions = [
    { value: "ict", labelEn: "ICT (ISIC J62/J63)", labelKo: "ICT (ISIC J62/J63)" },
    { value: "trade", labelEn: "Trade (ISIC G46/G47)", labelKo: "무역 (ISIC G46/G47)" },
    { value: "services", labelEn: "Services (ISIC N)", labelKo: "서비스업 (ISIC N)" },
    { value: "construction", labelEn: "Construction (ISIC F)", labelKo: "건설업 (ISIC F)" },
    { value: "manufacturing", labelEn: "Manufacturing (ISIC C)", labelKo: "제조업 (ISIC C)" },
    { value: "tourism", labelEn: "Tourism & Hospitality (ISIC I)", labelKo: "관광/숙박 (ISIC I)" },
    { value: "agriculture", labelEn: "Agriculture (ISIC A)", labelKo: "농업 (ISIC A)" },
    { value: "logistics", labelEn: "Transport/Logistics (ISIC H)", labelKo: "운송/물류 (ISIC H)" },
    { value: "education", labelEn: "Education (ISIC P)", labelKo: "교육업 (ISIC P)" },
    { value: "health", labelEn: "Health (ISIC Q)", labelKo: "보건업 (ISIC Q)" },
    { value: "other", labelEn: "Other", labelKo: "기타" }
  ] as const;

  const businessDetailOptions = [
    { value: "software_services", labelEn: "Software services", labelKo: "소프트웨어 서비스" },
    { value: "general_trading", labelEn: "General trading", labelKo: "일반 무역" },
    { value: "facility_services", labelEn: "Facility services", labelKo: "시설/운영 서비스" },
    { value: "engineering_works", labelEn: "Engineering works", labelKo: "엔지니어링 공사" },
    { value: "equipment_supply", labelEn: "Equipment supply", labelKo: "장비 공급" },
    { value: "tour_operations", labelEn: "Tour operations", labelKo: "투어 운영" },
    { value: "other", labelEn: "Other", labelKo: "기타" }
  ] as const;
  const marketplaceCategories = categories.filter((category) => isMarketplaceCategorySlug(category.slug));

  function getUploadButtonLabel(rowId: string): string {
    if (uploadingDocumentRowId === rowId) {
      return tr(locale, "Uploading...", "업로드 중...");
    }
    if (uploadedDocumentRowIds.has(rowId)) {
      return tr(locale, "Upload complete", "업로드 완료");
    }
    return tr(locale, "Upload document", "서류 업로드");
  }

  function updateDocumentRowDocType(rowId: string, docType: string): void {
    setDocumentRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, docType } : row)));
  }

  function addDocumentRow(): void {
    setDocumentRows((rows) => [...rows, createDocumentRow()]);
  }

  function togglePaymentMethod(method: string, checked: boolean): void {
    setSelectedPaymentMethods((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(method);
      } else {
        next.delete(method);
      }
      return Array.from(next);
    });
  }

  async function buildRegistrationPayload(
    form: HTMLFormElement,
    draft: boolean
  ): Promise<{ profilePayload: Record<string, unknown>; billingPayload: Record<string, unknown> }> {
    const formData = new FormData(form);
    const profilePayload: Record<string, unknown> = Object.fromEntries(
      Array.from(formData.entries()).filter(([, value]) => !(value instanceof File))
    );

    if (formData.has("categoryIds")) {
      profilePayload.categoryIds = formData
        .getAll("categoryIds")
        .filter((item): item is string => typeof item === "string" && item.length > 0);
    }

    if (typeof profilePayload.providerType === "string" && profilePayload.providerType !== "other") {
      profilePayload.providerTypeOther = "";
    }
    if (
      typeof profilePayload.businessActivitySector === "string" &&
      profilePayload.businessActivitySector !== "other" &&
      typeof profilePayload.businessActivityDetail === "string" &&
      profilePayload.businessActivityDetail !== "other"
    ) {
      profilePayload.businessActivityOther = "";
    }
    if (typeof profilePayload.representativeIdType === "string" && profilePayload.representativeIdType !== "other") {
      profilePayload.representativeIdTypeOther = "";
    }
    if (typeof profilePayload.city === "string") {
      profilePayload.city = normalizeCityInput(profilePayload.city) ?? "";
    }
    if (typeof profilePayload.country === "string") {
      profilePayload.country = normalizeCountryInput(profilePayload.country) ?? "";
    }

    profilePayload.quotationAvailable = profilePayload.quotationAvailable === "on";
    profilePayload.ebmAvailable = profilePayload.ebmAvailable === "on";

    const billingPayload: Record<string, unknown> = {
      quotationAvailable: profilePayload.quotationAvailable === true,
      ebmAvailable: profilePayload.ebmAvailable === true,
      vendorTinNumber: profilePayload.vendorTinNumber,
      ebmNotes: profilePayload.ebmNotes,
      paymentTerms: formData.has("paymentTerms")
        ? formData
            .getAll("paymentTerms")
            .filter((item): item is string => typeof item === "string" && item.length > 0)
        : [],
      paymentMethods: formData.has("paymentMethods")
        ? formData
            .getAll("paymentMethods")
            .filter((item): item is string => typeof item === "string" && item.length > 0)
        : [],
      paymentMethodOtherDetail: selectedPaymentMethods.includes("other") ? profilePayload.paymentMethodOtherDetail : "",
      momoAccountName: profilePayload.momoAccountName,
      momoNumber: profilePayload.momoNumber,
      bankName: profilePayload.bankName,
      bankAccountName: profilePayload.bankAccountName,
      bankAccountNumber: profilePayload.bankAccountNumber,
      bankSwiftCode: profilePayload.bankSwiftCode
    };

    delete profilePayload.quotationAvailable;
    delete profilePayload.ebmAvailable;
    delete profilePayload.vendorTinNumber;
    delete profilePayload.ebmNotes;
    delete profilePayload.paymentTerms;
    delete profilePayload.paymentMethods;
    delete profilePayload.paymentMethodOtherDetail;
    delete profilePayload.momoAccountName;
    delete profilePayload.momoNumber;
    delete profilePayload.bankName;
    delete profilePayload.bankAccountName;
    delete profilePayload.bankAccountNumber;
    delete profilePayload.bankSwiftCode;

    if (draft) {
      profilePayload.draft = true;
    }

    return { profilePayload, billingPayload };
  }

  async function saveRegistration(draft: boolean): Promise<boolean> {
    const form = formRef.current;
    if (!form) {
      setError(tr(locale, "Form not found", "양식을 찾을 수 없습니다."));
      return false;
    }

    if (!draft && !form.reportValidity()) {
      return false;
    }

    const { profilePayload, billingPayload } = await buildRegistrationPayload(form, draft);

    setLoading(true);
    setError("");
    setFeedback("");

    const profileResponse = await fetch("/api/provider/profile", {
      method: profile ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profilePayload)
    });
    const profileData = (await profileResponse.json()) as ApiResult;
    if (!profileResponse.ok) {
      setLoading(false);
      setError(profileData.error?.message ?? tr(locale, "Request failed", "요청에 실패했습니다."));
      return false;
    }

    const billingResponse = await fetch("/api/provider/billing-capabilities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billingPayload)
    });
    const billingData = (await billingResponse.json()) as ApiResult;
    setLoading(false);

    if (!billingResponse.ok) {
      setError(billingData.error?.message ?? tr(locale, "Failed to save billing settings", "발행 설정 저장에 실패했습니다."));
      router.refresh();
      return false;
    }

    setCompletedActions((current) => ({ ...current, profile: true, billing: true }));
    setFeedback(
      draft
        ? tr(locale, "Draft saved.", "임시 저장되었습니다.")
        : tr(locale, "Saved successfully", "저장되었습니다.")
    );
    router.refresh();
    return true;
  }

  async function submitForReview(): Promise<void> {
    if (!allSectionsComplete) {
      setError(
        tr(
          locale,
          "Complete all three sections (profile, billing, documents) before requesting review.",
          "프로필, Quotation/EBM 설정, 업체 확인 서류를 모두 완료한 뒤 심사를 요청해 주세요."
        )
      );
      return;
    }

    const saved = await saveRegistration(false);
    if (!saved) {
      return;
    }

    let caseId = verificationCaseId;
    if (!caseId) {
      const ensureResponse = await fetch("/api/provider/verification-cases", { method: "POST" });
      const ensureData = (await ensureResponse.json()) as ApiResult & { data?: { id: string } };
      if (!ensureResponse.ok || !ensureData.data?.id) {
        setError(ensureData.error?.message ?? tr(locale, "Failed to prepare review case", "심사 케이스 준비에 실패했습니다."));
        return;
      }
      caseId = ensureData.data.id;
    }

    setLoading(true);
    setError("");
    setFeedback("");

    const response = await fetch(`/api/provider/verification-cases/${caseId}/submit`, {
      method: "POST"
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);

    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to submit review request", "심사 요청에 실패했습니다."));
      return;
    }

    router.push("/provider/setup");
    router.refresh();
  }

  function renderSectionBadge(complete: boolean): string {
    return complete
      ? tr(locale, "Complete", "완료")
      : tr(locale, "Incomplete", "미완료");
  }

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadVerificationDocument(
    event: FormEvent<HTMLFormElement>,
    rowId: string
  ): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const row = documentRows.find((entry) => entry.id === rowId);
    if (!row) {
      return;
    }

    let caseId = verificationCaseId;
    if (!caseId || verificationStatus === "rejected" || verificationStatus === "approved") {
      const ensureResponse = await fetch("/api/provider/verification-cases", { method: "POST" });
      const ensureData = (await ensureResponse.json()) as ApiResult & { data?: { id: string } };
      if (!ensureResponse.ok || !ensureData.data?.id) {
        setError(
          ensureData.error?.message ??
            tr(locale, "Save your profile before uploading documents.", "서류 업로드 전에 프로필을 저장해 주세요.")
        );
        return;
      }
      caseId = ensureData.data.id;
    }

    const payload: Record<string, unknown> = {
      docType: row.docType
    };

    if (row.docType === "other") {
      const customDocType = String(formData.get("docTypeOther") ?? "").trim();
      if (!customDocType) {
        setError(tr(locale, "Enter document type", "서류 종류를 직접 입력해 주세요."));
        return;
      }
      payload.docType = customDocType;
    }

    const verificationDocumentFile = formData.get("verificationDocumentFile");
    if (!(verificationDocumentFile instanceof File) || verificationDocumentFile.size === 0) {
      setError(tr(locale, "Please attach a file.", "파일을 첨부해 주세요."));
      return;
    }
    payload.fileUrl = await fileToDataUrl(verificationDocumentFile);

    setUploadingDocumentRowId(rowId);
    setError("");
    setFeedback("");

    const response = await fetch(`/api/provider/verification-cases/${caseId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as ApiResult;
    setUploadingDocumentRowId(null);

    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Request failed", "요청에 실패했습니다."));
      return;
    }

    setUploadedDocumentRowIds((current) => new Set(current).add(rowId));
    setFeedback(tr(locale, "Document uploaded successfully.", "서류 업로드가 완료되었습니다."));
    router.refresh();
    form.reset();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Vendor registration", "벤더 등록")}</h1>
      <p className="muted">
        {tr(
          locale,
          "Complete all three sections below, then save a draft or request review.",
          "아래 세 가지 섹션을 완료한 뒤 임시 저장 또는 심사 요청을 해 주세요."
        )}
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      <form className="grid" ref={formRef}>
      <article className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>
            {profile
              ? tr(locale, "Update profile", "프로필 수정")
              : tr(locale, "Create provider profile", "업체 프로필 만들기")}
          </h2>
          <span className={`badge ${profileSectionComplete ? "good" : ""}`}>
            {renderSectionBadge(profileSectionComplete)}
          </span>
        </div>
        <p className="tiny muted">
          {tr(
            locale,
            "Fill in your business and representative details for verification.",
            "검증에 필요한 업체 및 대표자 정보를 입력하세요."
          )}
        </p>
        <div className="grid grid-3">
          <div style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>{tr(locale, "Required for verification", "검증용 필수 항목")}</h3>
          </div>
          <div>
            <label className="tiny">{tr(locale, "Company name (as registered in RDB)", "회사명 (RDB 등록명)")}</label>
            <input
              className="input"
              defaultValue={profile?.businessName ?? ""}
              name="businessName"
              required
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Business type", "사업 유형")}</label>
            <select
              className="select"
              defaultValue={profile?.providerType ?? "company"}
              name="providerType"
              onChange={(event) => setSelectedProviderType(event.target.value)}
            >
              {providerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {tr(locale, option.labelEn, option.labelKo)}
                </option>
              ))}
            </select>
          </div>
          {selectedProviderType === "other" && (
            <div>
              <label className="tiny">{tr(locale, "Business type detail (Other)", "사업 유형 상세 (기타)")}</label>
              <input className="input" defaultValue={profile?.providerTypeOther ?? ""} name="providerTypeOther" required />
            </div>
          )}
          <div>
            <label className="tiny">{tr(locale, "Business activity sector (ISIC)", "주요 사업 업종 (ISIC)")}</label>
            <select
              className="select"
              defaultValue={profile?.businessActivitySector ?? "services"}
              name="businessActivitySector"
              onChange={(event) => setSelectedBusinessSector(event.target.value)}
            >
              {businessSectorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {tr(locale, option.labelEn, option.labelKo)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="tiny">{tr(locale, "Business activity detail", "주요 사업 상세")}</label>
            <select
              className="select"
              defaultValue={profile?.businessActivityDetail ?? "general_services"}
              name="businessActivityDetail"
              onChange={(event) => setSelectedBusinessDetail(event.target.value)}
            >
              {businessDetailOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {tr(locale, option.labelEn, option.labelKo)}
                </option>
              ))}
            </select>
          </div>
          {(selectedBusinessSector === "other" || selectedBusinessDetail === "other") && (
            <div>
              <label className="tiny">{tr(locale, "Business activity detail (Other)", "주요 사업 상세 (기타)")}</label>
              <input className="input" defaultValue={profile?.businessActivityOther ?? ""} name="businessActivityOther" required />
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Official business address", "공식 사업 주소지")}</label>
            <textarea
              className="textarea"
              defaultValue={profile?.officialBusinessAddress ?? ""}
              name="officialBusinessAddress"
              required
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "City", "도시")}</label>
            <input
              className="input"
              name="city"
              onBlur={() => setCityInput(normalizeCityInput(cityInput) ?? cityInput)}
              onChange={(event) => setCityInput(event.target.value)}
              placeholder={tr(locale, "Kigali", "키갈리")}
              required
              value={cityInput}
            />
            <p className="tiny muted" style={{ marginTop: "6px", marginBottom: 0 }}>
              {tr(
                locale,
                "You can type Korean names (e.g. 키갈리) and we will match them to English (Kigali).",
                "한글로 입력해도 됩니다. 예: 키갈리 → Kigali"
              )}
            </p>
          </div>
          <div>
            <label className="tiny">{tr(locale, "Country", "국가")}</label>
            <input
              className="input"
              name="country"
              onBlur={() => setCountryInput(normalizeCountryInput(countryInput) ?? countryInput)}
              onChange={(event) => setCountryInput(event.target.value)}
              placeholder={tr(locale, "Rwanda", "르완다")}
              required
              value={countryInput}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Representative full name", "대표자 성명")}</label>
            <input className="input" defaultValue={profile?.representativeName ?? ""} name="representativeName" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Representative nationality", "대표자 국적")}</label>
            <input className="input" defaultValue={profile?.representativeNationality ?? ""} name="representativeNationality" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "ID type", "신분증 유형")}</label>
            <select
              className="select"
              defaultValue={profile?.representativeIdType ?? "national_id"}
              name="representativeIdType"
              onChange={(event) => setSelectedRepresentativeIdType(event.target.value)}
            >
              <option value="passport">{tr(locale, "Passport (for foreign representative)", "여권 (외국인)")}</option>
              <option value="national_id">{tr(locale, "National ID", "국가 신분증")}</option>
              <option value="other">{tr(locale, "Other", "기타")}</option>
            </select>
          </div>
          {selectedRepresentativeIdType === "other" && (
            <div>
              <label className="tiny">{tr(locale, "ID type detail (Other)", "신분증 유형 상세 (기타)")}</label>
              <input
                className="input"
                defaultValue={profile?.representativeIdTypeOther ?? ""}
                name="representativeIdTypeOther"
                required
              />
            </div>
          )}
          <div>
            <label className="tiny">{tr(locale, "Passport / National ID number", "여권번호 / National ID")}</label>
            <input className="input" defaultValue={profile?.representativeIdNumber ?? ""} name="representativeIdNumber" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Representative local address", "대표자 현지 주소")}</label>
            <input className="input" defaultValue={profile?.representativeLocalAddress ?? ""} name="representativeLocalAddress" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Representative email", "대표자 이메일")}</label>
            <input
              className="input"
              defaultValue={profile?.representativeEmail ?? profile?.contactEmail ?? ""}
              name="representativeEmail"
              required
              type="email"
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Representative phone", "대표자 전화번호")}</label>
            <input
              className="input"
              defaultValue={profile?.representativePhone ?? profile?.contactPhone ?? ""}
              name="representativePhone"
              required
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="category-checkbox-grid">
              <input name="categoryIds" type="hidden" value="" />
              {marketplaceCategories.map((category) => (
                <label className="category-check" key={category.id}>
                  <input
                    defaultChecked={profile?.categoryIds.includes(category.id) ?? false}
                    name="categoryIds"
                    type="checkbox"
                    value={category.id}
                  />{" "}
                  {category.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>{tr(locale, "Quotation / EBM settings", "Quotation / EBM 설정")}</h2>
          <span className={`badge ${billingSectionComplete ? "good" : ""}`}>
            {renderSectionBadge(billingSectionComplete)}
          </span>
        </div>
        <div className="grid grid-3">
          <label className="tiny">
            <input defaultChecked={billing?.quotationAvailable ?? false} name="quotationAvailable" type="checkbox" />{" "}
            {tr(locale, "Quotation available", "견적서 발행 가능")}
          </label>
          <label className="tiny">
            <input defaultChecked={billing?.ebmAvailable ?? false} name="ebmAvailable" type="checkbox" />{" "}
            {tr(locale, "EBM available", "EBM 발행 가능")}
          </label>
          <div>
            <label className="tiny">{tr(locale, "Vendor TIN number", "업체 TIN 번호")}</label>
            <input className="input" defaultValue={billing?.vendorTinNumber ?? ""} name="vendorTinNumber" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Available payment terms", "가능한 결제 조건")}</label>
            <div className="category-checkbox-grid">
              <label className="category-check">
                <input
                  defaultChecked={billing?.paymentTerms.includes("prepaid") ?? false}
                  name="paymentTerms"
                  type="checkbox"
                  value="prepaid"
                />{" "}
                {tr(locale, "Prepaid", "선불")}
              </label>
              <label className="category-check">
                <input
                  defaultChecked={billing?.paymentTerms.includes("postpaid") ?? false}
                  name="paymentTerms"
                  type="checkbox"
                  value="postpaid"
                />{" "}
                {tr(locale, "Postpaid", "후불")}
              </label>
              <label className="category-check">
                <input
                  defaultChecked={billing?.paymentTerms.includes("deposit") ?? false}
                  name="paymentTerms"
                  type="checkbox"
                  value="deposit"
                />{" "}
                {tr(locale, "Deposit / partial prepay", "부분 선지급")}
              </label>
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Available payment methods", "가능한 결제 수단")}</label>
            <div className="category-checkbox-grid">
              <label className="category-check">
                <input
                  checked={selectedPaymentMethods.includes("bank_transfer")}
                  name="paymentMethods"
                  onChange={(event) => togglePaymentMethod("bank_transfer", event.target.checked)}
                  type="checkbox"
                  value="bank_transfer"
                />{" "}
                {tr(locale, "Bank transfer", "은행 이체")}
              </label>
              <label className="category-check">
                <input
                  checked={selectedPaymentMethods.includes("momo")}
                  name="paymentMethods"
                  onChange={(event) => togglePaymentMethod("momo", event.target.checked)}
                  type="checkbox"
                  value="momo"
                />{" "}
                {tr(locale, "MoMo transfer", "모모 이체")}
              </label>
              <label className="category-check">
                <input
                  checked={selectedPaymentMethods.includes("cash")}
                  name="paymentMethods"
                  onChange={(event) => togglePaymentMethod("cash", event.target.checked)}
                  type="checkbox"
                  value="cash"
                />{" "}
                {tr(locale, "Cash", "현금")}
              </label>
              <label className="category-check">
                <input
                  checked={selectedPaymentMethods.includes("card")}
                  name="paymentMethods"
                  onChange={(event) => togglePaymentMethod("card", event.target.checked)}
                  type="checkbox"
                  value="card"
                />{" "}
                {tr(locale, "Card", "카드")}
              </label>
              <label className="category-check">
                <input
                  checked={selectedPaymentMethods.includes("other")}
                  name="paymentMethods"
                  onChange={(event) => togglePaymentMethod("other", event.target.checked)}
                  type="checkbox"
                  value="other"
                />{" "}
                {tr(locale, "Other", "기타")}
              </label>
            </div>
          </div>
          {selectedPaymentMethods.includes("momo") && (
            <>
              <div>
                <label className="tiny">{tr(locale, "MoMo account name", "모모 계정 이름")}</label>
                <input className="input" defaultValue={billing?.momoAccountName ?? ""} name="momoAccountName" />
              </div>
              <div>
                <label className="tiny">{tr(locale, "MoMo number", "모모 번호")}</label>
                <input
                  className="input"
                  defaultValue={billing?.momoNumber ?? ""}
                  name="momoNumber"
                  placeholder="*182*8*1*123456#"
                />
              </div>
            </>
          )}
          {selectedPaymentMethods.includes("other") && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="tiny">{tr(locale, "Other payment method detail", "기타 결제 수단 상세")}</label>
              <input
                className="input"
                defaultValue={billing?.paymentMethodOtherDetail ?? ""}
                name="paymentMethodOtherDetail"
                placeholder={tr(locale, "Describe the method", "결제 방식을 직접 입력")}
                required
              />
            </div>
          )}
          {selectedPaymentMethods.includes("bank_transfer") && (
            <>
              <div>
                <label className="tiny">{tr(locale, "Bank name", "은행명")}</label>
                <input className="input" defaultValue={billing?.bankName ?? ""} name="bankName" />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Bank account name", "은행 계좌명")}</label>
                <input className="input" defaultValue={billing?.bankAccountName ?? ""} name="bankAccountName" />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Bank account number", "은행 계좌번호")}</label>
                <input className="input" defaultValue={billing?.bankAccountNumber ?? ""} name="bankAccountNumber" />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Bank SWIFT code (optional)", "은행 SWIFT 코드 (선택)")}</label>
                <input className="input" defaultValue={billing?.bankSwiftCode ?? ""} name="bankSwiftCode" />
                <p className="tiny muted" style={{ marginTop: "6px", marginBottom: 0 }}>
                  {tr(
                    locale,
                    "Optional: leave blank for domestic transfers.",
                    "선택 입력: 국내 이체만 하시면 비워두셔도 됩니다."
                  )}
                </p>
              </div>
            </>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "EBM notes", "EBM 메모")}</label>
            <textarea className="textarea" defaultValue={billing?.ebmNotes ?? ""} name="ebmNotes" />
          </div>
        </div>
      </article>
      </form>

      <article className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>{tr(locale, "Business verification documents", "업체 확인 서류")}</h2>
          <span className={`badge ${documentsSectionComplete ? "good" : ""}`}>
            {renderSectionBadge(documentsSectionComplete)}
          </span>
        </div>
        <p className="tiny muted">
          {tr(
            locale,
            "Upload your documents first. When ready, request review to start the approval process.",
            "먼저 서류를 업로드하세요. 준비가 끝나면 심사 시작 요청을 눌러 주세요."
          )}
        </p>
        <div className="grid grid-3">
          <div className="panel" style={{ padding: "12px" }}>
            <h3 style={{ marginTop: 0 }}>{tr(locale, "Required documents", "필수 서류")}</h3>
            <ul className="tiny" style={{ margin: 0, paddingLeft: "18px" }}>
              <li>{tr(locale, "RDB business registration certificate", "RDB 사업자등록증")}</li>
              <li>{tr(locale, "TIN registration certificate", "TIN 등록증")}</li>
              <li>{tr(locale, "Representative ID document", "대표자 신분증")}</li>
            </ul>
          </div>
          <div className="panel" style={{ padding: "12px" }}>
            <h3 style={{ marginTop: 0 }}>{tr(locale, "Optional additional documents", "추가(선택) 서류")}</h3>
            <p className="tiny muted" style={{ marginTop: 0 }}>
              {tr(
                locale,
                "Additional documents proving business legitimacy",
                "Additional documents proving business legitimacy"
              )}
            </p>
            <ul className="tiny" style={{ margin: 0, paddingLeft: "18px" }}>
              <li>{tr(locale, "Past quotation sample", "기존 견적서 샘플")}</li>
              <li>{tr(locale, "EBM sample format", "EBM 발행 샘플")}</li>
              <li>{tr(locale, "Client references", "고객 추천서/레퍼런스")}</li>
              <li>{tr(locale, "Insurance or compliance certificate", "보험/컴플라이언스 증빙")}</li>
              <li>{tr(locale, "RRA tax clearance certificate", "RRA 세금 완납 증명서")}</li>
              <li>{tr(locale, "VAT registration certificate", "VAT 등록증")}</li>
            </ul>
          </div>
        </div>
        {!profile && (
          <p className="tiny muted">
            {tr(
              locale,
              "Save your registration draft first, then upload documents.",
              "먼저 아래에서 임시 저장한 뒤 서류를 업로드해 주세요."
            )}
          </p>
        )}
        {profile && canUploadDocuments && (
          <div className="grid" style={{ gap: "16px", marginTop: "16px" }}>
            {documentRows.map((row) => {
              const rowUploaded = uploadedDocumentRowIds.has(row.id);
              const rowUploading = uploadingDocumentRowId === row.id;
              return (
                <form
                  className="grid"
                  key={row.id}
                  onSubmit={(event) => void uploadVerificationDocument(event, row.id)}
                >
                  <div>
                    <label className="tiny">{tr(locale, "Document type", "서류 종류")}</label>
                    <select
                      className="select"
                      disabled={rowUploaded}
                      name="docType"
                      onChange={(event) => updateDocumentRowDocType(row.id, event.target.value)}
                      required
                      value={row.docType}
                    >
                      <option value="rdb_certificate">
                        {tr(locale, "RDB business registration certificate", "RDB 사업자등록증")}
                      </option>
                      <option value="tin_certificate">
                        {tr(locale, "TIN registration certificate", "TIN 등록증")}
                      </option>
                      <option value="owner_id">{tr(locale, "Representative ID document", "대표자 신분증")}</option>
                      <option value="quotation_sample">{tr(locale, "Past quotation sample", "기존 견적서 샘플")}</option>
                      <option value="ebm_sample">{tr(locale, "EBM sample format", "EBM 발행 샘플")}</option>
                      <option value="tax_clearance">
                        {tr(locale, "RRA tax clearance certificate", "RRA 세금 완납 증명서")}
                      </option>
                      <option value="vat_certificate">{tr(locale, "VAT registration certificate", "VAT 등록증")}</option>
                      <option value="other">{tr(locale, "Other", "기타")}</option>
                    </select>
                    {row.docType === "other" && (
                      <input
                        className="input"
                        disabled={rowUploaded}
                        name="docTypeOther"
                        placeholder={tr(locale, "Enter document type", "서류 종류를 직접 입력")}
                        required
                        style={{ marginTop: "8px" }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="tiny">{tr(locale, "File attachment", "파일 첨부")}</label>
                    <input
                      className="input"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      disabled={rowUploaded}
                      name="verificationDocumentFile"
                      required={!rowUploaded}
                      type="file"
                    />
                    <p className="tiny muted" style={{ marginTop: "6px", marginBottom: 0 }}>
                      {tr(
                        locale,
                        "Accepted: PDF, PNG, JPG, WEBP",
                        "업로드 가능 형식: PDF, PNG, JPG, WEBP"
                      )}
                    </p>
                  </div>
                  <button className="btn" disabled={rowUploaded || rowUploading} type="submit">
                    {getUploadButtonLabel(row.id)}
                  </button>
                </form>
              );
            })}
            <button className="btn secondary" onClick={addDocumentRow} type="button">
              + {tr(locale, "Add document", "서류 추가")}
            </button>
          </div>
        )}
        {verificationStatus === "rejected" && (
          <p className="tiny muted" style={{ marginTop: "12px", marginBottom: 0 }}>
            {tr(
              locale,
              "Your review was rejected. Update your documents and request review again.",
              "심사가 반려되었습니다. 서류를 다시 업로드한 뒤 심사를 재요청해 주세요."
            )}
          </p>
        )}
      </article>

      {isDraftReview && (
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Submit registration", "등록 제출")}</h2>
          <p className="tiny muted">
            {tr(
              locale,
              "When all three sections are complete, you can save a draft or request review.",
              "세 가지 섹션이 모두 완료되면 임시 저장 또는 심사 요청을 할 수 있습니다."
            )}
          </p>
          <div className="row">
            <button
              className="btn secondary"
              disabled={loading}
              onClick={() => void saveRegistration(true)}
              type="button"
            >
              {loading ? tr(locale, "Saving...", "저장 중...") : tr(locale, "Save draft", "임시 저장")}
            </button>
            <button
              className="btn"
              disabled={loading || !allSectionsComplete}
              onClick={() => void submitForReview()}
              type="button"
            >
              {loading
                ? tr(locale, "Submitting review request...", "심사 요청 중...")
                : tr(locale, "Request review", "심사 요청")}
            </button>
          </div>
          {!allSectionsComplete && (
            <p className="tiny muted" style={{ marginTop: "12px", marginBottom: 0 }}>
              {tr(
                locale,
                "Complete profile, Quotation/EBM settings, and upload at least one document.",
                "프로필, Quotation/EBM 설정, 서류 업로드를 모두 완료해 주세요."
              )}
            </p>
          )}
        </article>
      )}
    </section>
  );
}
