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
        providerType: "freelancer" | "company";
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
  billing:
    | {
        quotationAvailable: boolean;
        ebmAvailable: boolean;
        quotationLeadTimeHours: number | null;
        ebmNotes: string | null;
        vendorTinNumber: string | null;
        paymentTerms: string[];
        paymentMethods: string[];
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
  billing
}: ProviderDashboardProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>(
    billing?.paymentMethods ?? []
  );
  const router = useRouter();

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
    if (logoFile instanceof File && logoFile.size > 0) {
      payload.logoUrl = await fileToDataUrl(logoFile);
    }
    if (coverFile instanceof File && coverFile.size > 0) {
      payload.coverImageUrl = await fileToDataUrl(coverFile);
    }
    if (serviceImageFile instanceof File && serviceImageFile.size > 0) {
      payload.imageUrl = await fileToDataUrl(serviceImageFile);
    }
    if (formData.has("categoryIds")) {
      payload.categoryIds = formData
        .getAll("categoryIds")
        .filter((item): item is string => typeof item === "string" && item.length > 0);
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
      setError(data.error?.message ?? tr(locale, "Failed to create verification case", "검증 케이스 생성에 실패했습니다."));
      return;
    }
    setFeedback(tr(locale, "Verification case started.", "검증 케이스가 시작되었습니다."));
    router.refresh();
  }

  return (
    <section className="grid">
      <h1 style={{ marginBottom: 0 }}>{tr(locale, "Provider Hub", "업체 허브")}</h1>
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
            <label className="tiny">{tr(locale, "Business name", "업체명")}</label>
            <input
              className="input"
              defaultValue={profile?.businessName ?? ""}
              name="businessName"
              required
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Type", "유형")}</label>
            <select className="select" defaultValue={profile?.providerType ?? "freelancer"} name="providerType">
              <option value="freelancer">{tr(locale, "Freelancer", "프리랜서")}</option>
              <option value="company">{tr(locale, "Company", "업체")}</option>
            </select>
          </div>
          <div>
            <label className="tiny">{tr(locale, "City", "도시")}</label>
            <input className="input" defaultValue={profile?.city ?? ""} name="city" />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Country", "국가")} *</label>
            <input className="input" defaultValue={profile?.country ?? ""} name="country" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Contact email", "연락 이메일")} *</label>
            <input className="input" defaultValue={profile?.contactEmail ?? ""} name="contactEmail" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Contact phone", "연락처")}</label>
            <input className="input" defaultValue={profile?.contactPhone ?? ""} name="contactPhone" />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Website", "웹사이트")} *</label>
            <input className="input" defaultValue={profile?.websiteUrl ?? ""} name="websiteUrl" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Years in business", "업력(년)")} *</label>
            <input
              className="input"
              defaultValue={profile?.yearsInBusiness ?? ""}
              min={0}
              name="yearsInBusiness"
              required
              type="number"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Industry / categories", "업종 / 카테고리")}</label>
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
                <input className="input" defaultValue={billing?.momoNumber ?? ""} name="momoNumber" />
              </div>
            </>
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
            "These sections are optional for onboarding and can be updated later from Provider Hub.",
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
          <div>
            <label className="tiny">{tr(locale, "Pricing mode", "가격 모드")}</label>
            <input
              className="input"
              disabled
              value={tr(locale, "Single price (no tier split)", "단일 가격 (티어 구분 없음)")}
            />
            <input name="tier" type="hidden" value="standard" />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Currency", "통화")}</label>
            <input className="input" defaultValue="RWF" maxLength={3} name="currency" required />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Base price", "기본 가격")}</label>
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
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Verification workflow", "검증 워크플로우")}</h2>
        <p className="tiny muted">
          {tr(
            locale,
            "Start a verification case, then upload your supporting documents.",
            "검증 케이스를 시작하고 증빙 서류를 업로드하세요."
          )}
        </p>
        <div className="grid grid-3">
          <div className="panel" style={{ padding: "12px" }}>
            <h3 style={{ marginTop: 0 }}>{tr(locale, "Required documents", "필수 서류")}</h3>
            <ul className="tiny" style={{ margin: 0, paddingLeft: "18px" }}>
              <li>{tr(locale, "Business registration certificate", "사업자 등록증")}</li>
              <li>{tr(locale, "Tax/TIN certificate", "세무/TIN 증빙 서류")}</li>
              <li>{tr(locale, "Owner/representative ID", "대표자 신분증")}</li>
              <li>{tr(locale, "Bank account ownership proof", "계좌 소유 증빙")}</li>
            </ul>
          </div>
          <div className="panel" style={{ padding: "12px" }}>
            <h3 style={{ marginTop: 0 }}>{tr(locale, "Optional additional documents", "추가(선택) 서류")}</h3>
            <ul className="tiny" style={{ margin: 0, paddingLeft: "18px" }}>
              <li>{tr(locale, "Past quotation sample", "기존 견적서 샘플")}</li>
              <li>{tr(locale, "EBM sample format", "EBM 발행 샘플")}</li>
              <li>{tr(locale, "Client references", "고객 추천서/레퍼런스")}</li>
              <li>{tr(locale, "Insurance or compliance certificate", "보험/컴플라이언스 증빙")}</li>
            </ul>
          </div>
        </div>
        <button className="btn" disabled={loading} onClick={() => void triggerVerification()} type="button">
          {verificationCaseId
            ? tr(locale, "Create another case (if current closed)", "새 검증 케이스 만들기(현재 케이스 종료 시)")
            : tr(locale, "Start verification case", "검증 케이스 시작")}
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
              <label className="tiny">{tr(locale, "Document type", "문서 유형")}</label>
              <input className="input" name="docType" placeholder={tr(locale, "business_license", "사업자등록증")} required />
            </div>
            <div>
              <label className="tiny">{tr(locale, "File URL", "파일 URL")}</label>
              <input className="input" name="fileUrl" placeholder="https://..." required />
            </div>
            <button className="btn" disabled={loading} type="submit">
              {tr(locale, "Add document metadata", "문서 메타데이터 추가")}
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
