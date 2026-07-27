"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";
import { ProviderPageCategory, ProviderPageProfile } from "@/lib/provider-data";
import { formatCategoryDisplayName } from "@/lib/service-categories";

interface ApiResult {
  error?: { message: string };
}

type SaveAction = "publicProfile" | "servicePrice";

interface ProviderProfileServiceSetupProps {
  locale: Locale;
  categories: ProviderPageCategory[];
  profile: ProviderPageProfile;
  verificationApproved?: boolean;
  showIntro?: boolean;
}

export function ProviderProfileServiceSetup({
  locale,
  categories,
  profile,
  verificationApproved = false,
  showIntro = true
}: ProviderProfileServiceSetupProps) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedActions, setCompletedActions] = useState<Partial<Record<SaveAction, boolean>>>({});
  const router = useRouter();
  const otherCategory = categories.find((category) => category.slug === "other") ?? null;
  const selectableCategories = categories;
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(profile.categoryIds);
  const [categoryOtherDetail, setCategoryOtherDetail] = useState(profile.categoryOtherDetail ?? "");
  const includesOtherCategory = otherCategory ? selectedCategoryIds.includes(otherCategory.id) : false;
  const vendorCategories = useMemo(
    () => categories.filter((category) => selectedCategoryIds.includes(category.id)),
    [categories, selectedCategoryIds]
  );
  const usesVendorScope = selectedCategoryIds.length > 0;

  function toggleCategory(categoryId: string, checked: boolean): void {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }
      return Array.from(next);
    });
  }

  useEffect(() => {
    setSelectedCategoryIds(profile.categoryIds);
    setCategoryOtherDetail(profile.categoryOtherDetail ?? "");
  }, [profile.categoryIds, profile.categoryOtherDetail]);

  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function getSaveButtonLabel(
    action: SaveAction,
    isLoading: boolean,
    pendingEn: string,
    pendingKo: string
  ): string {
    if (isLoading) {
      return tr(locale, "Saving...", "저장 중...");
    }
    if (completedActions[action]) {
      return tr(locale, "Save complete", "저장 완료");
    }
    return tr(locale, pendingEn, pendingKo);
  }

  async function submitPublicProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(
      Array.from(formData.entries()).filter(([, value]) => !(value instanceof File))
    );

    payload.categoryIds = selectedCategoryIds;
    payload.categoryOtherDetail = includesOtherCategory ? categoryOtherDetail.trim() : "";

    if (selectedCategoryIds.length === 0) {
      setError(
        tr(locale, "Select at least one service category.", "서비스 카테고리를 1개 이상 선택해 주세요.")
      );
      return;
    }
    if (includesOtherCategory && !categoryOtherDetail.trim()) {
      setError(
        tr(locale, "Enter your service category for Other.", "기타를 선택한 경우 카테고리를 직접 입력해 주세요.")
      );
      return;
    }

    const logoFile = formData.get("logoFile");
    const coverFile = formData.get("coverFile");
    if (logoFile instanceof File && logoFile.size > 0) {
      payload.logoUrl = await fileToDataUrl(logoFile);
    }
    if (coverFile instanceof File && coverFile.size > 0) {
      payload.coverImageUrl = await fileToDataUrl(coverFile);
    }

    setLoading(true);
    setError("");
    setFeedback("");

    const response = await fetch("/api/provider/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as ApiResult;
    setLoading(false);

    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Request failed", "요청에 실패했습니다."));
      return;
    }

    setCompletedActions((current) => ({ ...current, publicProfile: true }));
    setFeedback(tr(locale, "Saved successfully", "저장되었습니다."));
    router.refresh();
  }

  async function submitServiceWithPriceCard(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const servicePayload: Record<string, unknown> = {
      categoryId: formData.get("categoryId"),
      title: formData.get("title"),
      description: formData.get("description") || undefined
    };

    const serviceImageFile = formData.get("serviceImageFile");
    if (serviceImageFile instanceof File && serviceImageFile.size > 0) {
      servicePayload.imageUrl = await fileToDataUrl(serviceImageFile);
    }

    const pricePayload = {
      tier: "standard" as const,
      currency: String(formData.get("currency") ?? "RWF"),
      basePrice: formData.get("basePrice"),
      unit: formData.get("unit"),
      inclusions: formData.get("inclusions") || undefined,
      exclusions: formData.get("exclusions") || undefined,
      isPublic: formData.get("isPublic") === "on"
    };

    setLoading(true);
    setError("");
    setFeedback("");

    const serviceResponse = await fetch("/api/provider/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload)
    });
    const serviceData = (await serviceResponse.json()) as ApiResult & { data?: { id: string } };
    if (!serviceResponse.ok) {
      setLoading(false);
      setError(serviceData.error?.message ?? tr(locale, "Failed to create service", "서비스 등록에 실패했습니다."));
      return;
    }

    const serviceId = serviceData.data?.id;
    if (!serviceId) {
      setLoading(false);
      setError(tr(locale, "Failed to create service", "서비스 등록에 실패했습니다."));
      return;
    }

    const priceResponse = await fetch(`/api/provider/services/${serviceId}/price-cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pricePayload)
    });
    const priceData = (await priceResponse.json()) as ApiResult;
    setLoading(false);

    if (!priceResponse.ok) {
      setError(
        priceData.error?.message ??
          tr(locale, "Service saved but price card failed", "서비스는 등록됐지만 가격 카드 추가에 실패했습니다.")
      );
      router.refresh();
      return;
    }

    setFeedback(tr(locale, "Service and price card saved", "서비스와 가격 카드가 저장되었습니다."));
    setCompletedActions((current) => ({ ...current, servicePrice: true }));
    router.refresh();
    event.currentTarget.reset();
  }

  return (
    <article className="panel">
      <h2 style={{ marginTop: 0 }}>{tr(locale, "Profile and service setup", "프로필 및 서비스 설정")}</h2>
      {showIntro && (
        <p className="tiny muted">
          {verificationApproved
            ? tr(
                locale,
                "Your business verification is approved and visible on the marketplace.",
                "업체 검증이 승인되었습니다. 홈 화면에 노출됩니다."
              )
            : tr(
                locale,
                "Complete your public profile and services while review is in progress.",
                "심사가 진행되는 동안 프로필을 완성하세요."
              )}
        </p>
      )}
      {error && <div className="flash error">{error}</div>}
      {feedback && <div className="flash success">{feedback}</div>}

      <div className="grid" style={{ gap: "24px" }}>
        <section>
          <h3 style={{ marginTop: 0 }}>{tr(locale, "Service categories", "서비스 카테고리")}</h3>
          <p className="tiny muted">
            {tr(
              locale,
              "Choose the marketplace categories that best describe your business. You can select more than one.",
              "업체가 제공하는 서비스 카테고리를 선택해 주세요. 여러 개 선택할 수 있습니다."
            )}
          </p>
          <div className="category-checkbox-grid">
            {selectableCategories.map((category) => (
              <label className="category-check" key={category.id}>
                <input
                  checked={selectedCategoryIds.includes(category.id)}
                  onChange={(event) => toggleCategory(category.id, event.target.checked)}
                  type="checkbox"
                />{" "}
                {category.slug === "other"
                  ? tr(locale, "Other", "기타")
                  : category.name}
              </label>
            ))}
          </div>
          {includesOtherCategory && (
            <div style={{ marginTop: "12px" }}>
              <label className="tiny">{tr(locale, "Other category (custom)", "기타 카테고리 (직접 입력)")}</label>
              <input
                className="input"
                onChange={(event) => setCategoryOtherDetail(event.target.value)}
                placeholder={tr(locale, "Describe your service category", "서비스 카테고리를 입력하세요")}
                required
                value={categoryOtherDetail}
              />
            </div>
          )}
        </section>

        <div className="hr" />

        <section>
          <h3 style={{ marginTop: 0 }}>{tr(locale, "Public profile", "사용자 노출 프로필")}</h3>
          <form className="grid grid-3" onSubmit={(event) => void submitPublicProfile(event)}>
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
              <input className="input" defaultValue={profile.websiteUrl ?? ""} name="websiteUrl" placeholder="https://" />
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
              {getSaveButtonLabel("publicProfile", loading, "Save public profile", "노출 프로필 저장")}
            </button>
          </form>
        </section>

        <div className="hr" />

        <section>
          <h3 style={{ marginTop: 0 }}>{tr(locale, "Service and price card", "서비스 및 가격 카드")}</h3>
          <p className="tiny muted">
            {usesVendorScope
              ? tr(
                  locale,
                  "Choose one of your selected service categories for this offering.",
                  "선택한 서비스 카테고리 중 이 서비스에 맞는 항목을 고르세요."
                )
              : tr(
                  locale,
                  "Save your service categories in the section above before adding services.",
                  "서비스를 등록하기 전에 위에서 서비스 카테고리를 먼저 저장해 주세요."
                )}
          </p>
          {vendorCategories.length === 0 ? (
            <div className="flash error">
              {tr(
                locale,
                "No categories selected yet. Choose at least one service category above and save your public profile.",
                "선택된 카테고리가 없습니다. 위에서 서비스 카테고리를 선택하고 노출 프로필을 저장해 주세요."
              )}
            </div>
          ) : (
          <form className="grid grid-3" onSubmit={(event) => void submitServiceWithPriceCard(event)}>
            <div>
              <label className="tiny">{tr(locale, "Category", "카테고리")}</label>
              <select className="select" name="categoryId" required>
                <option value="">{tr(locale, "Choose category", "카테고리 선택")}</option>
                {vendorCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {formatCategoryDisplayName(
                      category.name,
                      category.slug,
                      category.slug === "other" ? categoryOtherDetail : null
                    )}
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
              <input defaultChecked name="isPublic" type="checkbox" /> {tr(locale, "Publicly visible", "공개 노출")}
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
              {getSaveButtonLabel("servicePrice", loading, "Add service and price", "서비스·가격 등록")}
            </button>
          </form>
          )}
        </section>
      </div>
    </article>
  );
}
