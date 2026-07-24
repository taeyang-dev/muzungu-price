"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface Service {
  id: string;
  title: string;
  imageUrl?: string | null;
  category?: {
    name: string;
  };
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
  services: Service[];
  verificationCaseId: string | null;
  verificationStatus: "pending" | "approved" | "rejected" | "on_hold" | null;
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

export function ProviderDashboard({
  locale,
  categories,
  profile,
  services,
  verificationCaseId,
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
  const hasActiveReview = verificationStatus === "pending" || verificationStatus === "on_hold";
  const [selectedProviderType, setSelectedProviderType] = useState(
    profile?.providerType ?? "company"
  );
  const [selectedBusinessSector, setSelectedBusinessSector] = useState(
    profile?.businessActivitySector ?? "services"
  );
  const [selectedBusinessDetail, setSelectedBusinessDetail] = useState(
    profile?.businessActivityDetail ?? "general_services"
  );
  const [selectedRepresentativeIdType, setSelectedRepresentativeIdType] = useState(
    profile?.representativeIdType ?? "national_id"
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState("rdb_certificate");

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

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function submitJson(
    event: FormEvent<HTMLFormElement>,
    url: string,
    method: "POST" | "PATCH" | "PUT"
  ): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payloadEntries = Array.from(formData.entries()).filter(([, value]) => !(value instanceof File));
    const payload: Record<string, unknown> = Object.fromEntries(payloadEntries);

    const logoFile = formData.get("logoFile");
    const coverFile = formData.get("coverFile");
    const serviceImageFile = formData.get("serviceImageFile");
    const verificationDocumentFile = formData.get("verificationDocumentFile");
    if (logoFile instanceof File && logoFile.size > 0) {
      payload.logoUrl = await fileToDataUrl(logoFile);
    }
    if (coverFile instanceof File && coverFile.size > 0) {
      payload.coverImageUrl = await fileToDataUrl(coverFile);
    }
    if (serviceImageFile instanceof File && serviceImageFile.size > 0) {
      payload.imageUrl = await fileToDataUrl(serviceImageFile);
    }
    if (verificationDocumentFile instanceof File && verificationDocumentFile.size > 0) {
      payload.fileUrl = await fileToDataUrl(verificationDocumentFile);
    }
    if (formData.has("categoryIds")) {
      payload.categoryIds = formData
        .getAll("categoryIds")
        .filter((item): item is string => typeof item === "string" && item.length > 0);
    }
    if (typeof payload.providerType === "string" && payload.providerType !== "other") {
      payload.providerTypeOther = "";
    }
    if (
      typeof payload.businessActivitySector === "string" &&
      payload.businessActivitySector !== "other" &&
      typeof payload.businessActivityDetail === "string" &&
      payload.businessActivityDetail !== "other"
    ) {
      payload.businessActivityOther = "";
    }
    if (typeof payload.representativeIdType === "string" && payload.representativeIdType !== "other") {
      payload.representativeIdTypeOther = "";
    }
    if (typeof payload.docType === "string" && payload.docType === "other") {
      const customDocType = String(payload.docTypeOther ?? "").trim();
      if (customDocType.length > 0) {
        payload.docType = customDocType;
      }
    }
    if (typeof payload.docTypeOther === "string") {
      delete payload.docTypeOther;
    }

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
    if (formData.has("paymentTerms")) {
      payload.paymentTerms = formData
        .getAll("paymentTerms")
        .filter((item): item is string => typeof item === "string" && item.length > 0);
    } else {
      payload.paymentTerms = [];
    }
    if (formData.has("paymentMethods")) {
      payload.paymentMethods = formData
        .getAll("paymentMethods")
        .filter((item): item is string => typeof item === "string" && item.length > 0);
    } else {
      payload.paymentMethods = [];
    }
    if (!selectedPaymentMethods.includes("other")) {
      payload.paymentMethodOtherDetail = "";
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

    setFeedback(tr(locale, "Saved successfully", "저장되었습니다."));
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
      setError(data.error?.message ?? tr(locale, "Failed to start document review", "서류 검토 시작에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Document review started.", "서류 검토가 시작되었습니다."));
    router.refresh();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Vendor registration", "벤더 등록")}</h1>
      <p className="muted">
        {tr(
          locale,
          "Publish transparent price cards, enable Quotation/EBM, and submit verification evidence.",
          "투명한 가격카드를 공개하고, Quotation/EBM 설정 및 검증 자료를 제출하세요."
        )}
      </p>
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>
          {profile
            ? tr(locale, "Update profile", "프로필 수정")
            : tr(locale, "Create provider profile", "업체 프로필 만들기")}
        </h2>
        <p className="tiny muted">
          {tr(
            locale,
            "Complete only required fields first. Optional sections can be completed later from this page.",
            "먼저 필수 항목만 입력하고, 선택 항목은 나중에 이 페이지에서 수정할 수 있습니다."
          )}
        </p>
        <form
          className="grid grid-3"
          onSubmit={(event) =>
            submitJson(event, "/api/provider/profile", profile ? "PATCH" : "POST")
          }
        >
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
            <label className="tiny">{tr(locale, "Business activity ISIC code", "주요 사업 ISIC 코드")}</label>
            <input
              className="input"
              defaultValue={profile?.businessActivityCode ?? ""}
              name="businessActivityCode"
              placeholder="e.g. J6201"
              required
            />
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
            <label className="tiny">{tr(locale, "Marketplace categories", "마켓플레이스 카테고리")}</label>
            <div className="category-checkbox-grid">
              <input name="categoryIds" type="hidden" value="" />
              {categories.map((category) => (
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
          <button className="btn" disabled={loading} type="submit">
            {loading ? tr(locale, "Saving...", "저장 중...") : tr(locale, "Save profile", "프로필 저장")}
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Quotation / EBM settings", "Quotation / EBM 설정")}</h2>
        <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/provider/billing-capabilities", "PUT")}>
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
          <div>
            <label className="tiny">{tr(locale, "Quotation lead time (hours)", "견적서 발행 리드타임(시간)")}</label>
            <input
              className="input"
              defaultValue={billing?.quotationLeadTimeHours ?? ""}
              name="quotationLeadTimeHours"
              type="number"
            />
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
          <button className="btn" disabled={loading} type="submit">
            {tr(locale, "Save billing settings", "발행 설정 저장")}
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Optional sections (you can fill later)", "선택 사항 (나중에 입력 가능)")}</h2>
        <p className="tiny muted">
          {tr(
            locale,
            "These sections are optional for onboarding and can be updated later from vendor registration.",
            "아래 항목은 초기 등록 시 필수가 아니며, 추후 프로필에서 언제든 수정할 수 있습니다."
          )}
        </p>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Optional public profile", "선택: 사용자 노출 프로필")}</h2>
        {!profile && (
          <p className="tiny muted">
            {tr(
              locale,
              "Save the required profile section first to enable this form.",
              "먼저 필수 프로필을 저장하면 이 선택 폼을 사용할 수 있습니다."
            )}
          </p>
        )}
        {profile && (
          <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/provider/profile", "PATCH")}>
            <div>
              <label className="tiny">{tr(locale, "One-line intro", "한줄 소개")}</label>
              <input
                className="input"
                defaultValue={profile.tagline ?? ""}
                name="tagline"
                placeholder={tr(
                  locale,
                  "Example: Fast and trusted office electrical support.",
                  "예시: 사무공간 전기 문제를 빠르고 정확하게 해결합니다."
                )}
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Website", "웹사이트 주소")}</label>
              <input
                className="input"
                defaultValue={profile.websiteUrl ?? ""}
                name="websiteUrl"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Years in business", "업력(년)")}</label>
              <input
                className="input"
                defaultValue={profile.yearsInBusiness ?? ""}
                min={0}
                name="yearsInBusiness"
                type="number"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="tiny">{tr(locale, "Detailed description", "상세 소개")}</label>
              <textarea
                className="textarea"
                defaultValue={profile.bio ?? ""}
                name="bio"
                placeholder={tr(
                  locale,
                  "Example: We provide fixed-price installation, maintenance, and emergency support with verified technicians.",
                  "예시: 검증된 기술진이 정찰제 설치/정비/긴급출동 서비스를 제공합니다."
                )}
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Logo image attachment", "로고 이미지 첨부")}</label>
              <input className="input" accept="image/*" name="logoFile" type="file" />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Cover image attachment", "커버 이미지 첨부")}</label>
              <input className="input" accept="image/*" name="coverFile" type="file" />
            </div>
            <button className="btn" disabled={loading} type="submit">
              {tr(locale, "Save optional profile", "선택 프로필 저장")}
            </button>
          </form>
        )}
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Create service", "서비스 등록")}</h2>
        <p className="tiny muted">
          {tr(
            locale,
            "Optional section — you can register services later and edit them anytime.",
            "선택 항목입니다. 서비스 등록은 나중에 해도 되며, 추후 언제든 수정할 수 있습니다."
          )}
        </p>
        <form className="grid grid-3" onSubmit={(event) => submitJson(event, "/api/provider/services", "POST")}>
          <div style={{ gridColumn: "1 / -1" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>{tr(locale, "Required", "필수")}</h3>
          </div>
          <div>
            <label className="tiny">{tr(locale, "Category", "카테고리")}</label>
            <select className="select" name="categoryId" required>
              <option value="">{tr(locale, "Choose category", "카테고리 선택")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="tiny">{tr(locale, "Title", "서비스명")}</label>
            <input className="input" name="title" required />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Description (optional)", "상세 설명 (선택)")}</label>
            <textarea
              className="textarea"
              name="description"
              placeholder={tr(
                locale,
                "Example: Includes on-site setup, safety checklist, and post-service support.",
                "예시: 현장 설치, 안전 점검표, 서비스 이후 지원이 포함됩니다."
              )}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Service image attachment", "서비스 이미지 첨부")}</label>
            <input className="input" accept="image/*" name="serviceImageFile" type="file" />
          </div>
          <button className="btn" disabled={loading} type="submit">
            {tr(locale, "Add service", "서비스 추가")}
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Add price card to a service", "서비스 가격 카드 추가")}</h2>
        <p className="tiny muted">
          {tr(
            locale,
            "Optional section — you can add pricing later from your profile.",
            "선택 항목입니다. 가격은 나중에 프로필에서 추가해도 됩니다."
          )}
        </p>
        <form
          className="grid grid-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const serviceId = formData.get("serviceId");
            if (!serviceId || typeof serviceId !== "string") {
              setError(tr(locale, "Select a service first.", "먼저 서비스를 선택해 주세요."));
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
            <label className="tiny">{tr(locale, "Service", "서비스")}</label>
            <select className="select" name="serviceId" required>
              <option value="">{tr(locale, "Choose service", "서비스 선택")}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </div>
          <input name="tier" type="hidden" value="standard" />
          <div>
            <label className="tiny">{tr(locale, "Currency", "통화")}</label>
            <input className="input" defaultValue="RWF" maxLength={3} name="currency" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Price", "가격")}</label>
            <input className="input" min={1} name="basePrice" required type="number" />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Unit", "단위")}</label>
            <select className="select" defaultValue="per_project" name="unit">
              <option value="per_hour">{tr(locale, "Per hour", "시간당")}</option>
              <option value="per_day">{tr(locale, "Per day", "일당")}</option>
              <option value="per_project">{tr(locale, "Per project", "프로젝트당")}</option>
              <option value="per_person">{tr(locale, "Per person", "인당")}</option>
            </select>
          </div>
          <label className="tiny">
            <input defaultChecked name="isPublic" type="checkbox" />{" "}
            {tr(locale, "Publicly visible", "공개 노출")}
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Inclusions", "포함 항목")}</label>
            <textarea className="textarea" name="inclusions" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Exclusions", "미포함 항목")}</label>
            <textarea className="textarea" name="exclusions" />
          </div>
          <button className="btn" disabled={loading} type="submit">
            {tr(locale, "Add price card", "가격 카드 추가")}
          </button>
        </form>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Business verification documents", "업체 확인 서류")}</h2>
        <p className="tiny muted">
          {tr(
            locale,
            "Start document review and upload supporting files here.",
            "서류 검토를 시작하고 증빙 파일을 여기서 업로드하세요."
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
        {hasActiveReview && (
          <p className="tiny muted" style={{ marginBottom: "8px" }}>
            {tr(
              locale,
              "Your document review is in progress. You can upload more files below.",
              "서류 검토가 진행 중입니다. 아래에서 추가 파일을 업로드할 수 있습니다."
            )}
          </p>
        )}
        <button className="btn" disabled={loading || hasActiveReview} onClick={() => void triggerVerification()} type="button">
          {verificationCaseId
            ? tr(locale, "Start new review request", "새 서류 검토 시작")
            : tr(locale, "Start document review", "서류 검토 시작")}
        </button>
        {verificationCaseId && hasActiveReview && (
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
              <label className="tiny">{tr(locale, "Document type", "서류 종류")}</label>
              <select
                className="select"
                defaultValue="rdb_certificate"
                name="docType"
                onChange={(event) => setSelectedDocumentType(event.target.value)}
                required
              >
                <option value="rdb_certificate">{tr(locale, "RDB business registration certificate", "RDB 사업자등록증")}</option>
                <option value="tin_certificate">{tr(locale, "TIN registration certificate", "TIN 등록증")}</option>
                <option value="owner_id">{tr(locale, "Representative ID document", "대표자 신분증")}</option>
                <option value="quotation_sample">{tr(locale, "Past quotation sample", "기존 견적서 샘플")}</option>
                <option value="ebm_sample">{tr(locale, "EBM sample format", "EBM 발행 샘플")}</option>
                <option value="tax_clearance">{tr(locale, "RRA tax clearance certificate", "RRA 세금 완납 증명서")}</option>
                <option value="vat_certificate">{tr(locale, "VAT registration certificate", "VAT 등록증")}</option>
                <option value="other">{tr(locale, "Other", "기타")}</option>
              </select>
              {selectedDocumentType === "other" && (
                <input
                  className="input"
                  name="docTypeOther"
                  placeholder={tr(locale, "Enter document type", "서류 종류를 직접 입력")}
                  required
                  style={{ marginTop: "8px" }}
                />
              )}
            </div>
            <div>
              <label className="tiny">{tr(locale, "File attachment", "파일 첨부")}</label>
              <input className="input" accept=".pdf,.png,.jpg,.jpeg,.webp" name="verificationDocumentFile" required type="file" />
              <p className="tiny muted" style={{ marginTop: "6px", marginBottom: 0 }}>
                {tr(
                  locale,
                  "Accepted: PDF, PNG, JPG, WEBP",
                  "업로드 가능 형식: PDF, PNG, JPG, WEBP"
                )}
              </p>
            </div>
            <button className="btn" disabled={loading} type="submit">
              {tr(locale, "Upload document", "서류 업로드")}
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
