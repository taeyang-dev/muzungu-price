import { notFound } from "next/navigation";
import Link from "next/link";
import { decimalToNumber } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { VendorQuickActions } from "@/components/VendorQuickActions";
import { VendorChatBox } from "@/components/VendorChatBox";
import { FallbackImage } from "@/components/FallbackImage";
import { getDefaultServiceImage } from "@/lib/default-images";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { Locale, localizeCopy, tr } from "@/lib/i18n";

interface ProviderDetailPageProps {
  params: Promise<{ id: string }>;
}

interface BreakdownLine {
  label: string;
  value: string;
  tone?: "normal" | "section" | "subtotal" | "total";
}

interface BillingStatusText {
  quotation: string;
  ebm: string;
}

function toRwf(amount: number | null, currency: string): number | null {
  if (amount === null || amount === undefined) {
    return null;
  }
  const conversionToRwf: Record<string, number> = {
    RWF: 1,
    USD: 1400,
    EUR: 1500,
    UGX: 0.37
  };
  return amount * (conversionToRwf[currency] ?? 1);
}

function formatRwf(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return "Price not available";
  }
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0
  }).format(amount);
}

function splitByWeights(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const raw = weights.map((weight) => (total * weight) / 100);
  const base = raw.map((value) => Math.floor(value));
  let remainder = total - base.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let pointer = 0;
  while (remainder > 0) {
    const target = order[pointer % order.length];
    base[target.index] += 1;
    remainder -= 1;
    pointer += 1;
  }

  return base;
}

function getBreakdown(
  baseRwf: number | null,
  locale: Locale
): BreakdownLine[] {
  if (!baseRwf) {
    return [];
  }

  const baseCostWeights = [34, 27, 11, 8, 6, 5, 5, 4];
  const [
    laborCost,
    materialsCost,
    equipmentCost,
    planningCost,
    qualityCost,
    safetyCost,
    coordinationCost,
    documentationCost
  ] = splitByWeights(Math.round(baseRwf), baseCostWeights);

  const logisticsCost = Math.max(5000, Math.round(baseRwf * 0.035));
  const sitePrepCost = Math.max(3500, Math.round(baseRwf * 0.02));
  const afterHoursSupportCost = Math.max(2500, Math.round(baseRwf * 0.015));
  const riskReserveCost = Math.max(3000, Math.round(baseRwf * 0.025));

  const subtotalBeforeTax =
    baseRwf + logisticsCost + sitePrepCost + afterHoursSupportCost + riskReserveCost;
  const vat = Math.round(subtotalBeforeTax * 0.18);
  const total = subtotalBeforeTax + vat;

  return [
    {
      label: tr(locale, "Base quote composition", "기본 견적 구성"),
      value: "",
      tone: "section"
    },
    {
      label: tr(locale, "On-site technical labor (34%)", "현장 기술 인건비 (34%)"),
      value: formatRwf(laborCost)
    },
    {
      label: tr(locale, "Core materials/components (27%)", "핵심 자재/부품비 (27%)"),
      value: formatRwf(materialsCost)
    },
    {
      label: tr(locale, "Equipment and tool utilization (11%)", "장비 및 공구 사용료 (11%)"),
      value: formatRwf(equipmentCost)
    },
    {
      label: tr(locale, "Planning & project supervision (8%)", "기획 및 프로젝트 관리 (8%)"),
      value: formatRwf(planningCost)
    },
    {
      label: tr(locale, "Quality assurance checks (6%)", "품질 검수 비용 (6%)"),
      value: formatRwf(qualityCost)
    },
    {
      label: tr(locale, "Safety compliance & PPE (5%)", "안전관리 및 보호장비 (5%)"),
      value: formatRwf(safetyCost)
    },
    {
      label: tr(locale, "Admin & coordination (5%)", "행정 및 커뮤니케이션 (5%)"),
      value: formatRwf(coordinationCost)
    },
    {
      label: tr(locale, "Documentation pack (quotation/EBM) (4%)", "문서 패키지(견적서/EBM) (4%)"),
      value: formatRwf(documentationCost)
    },
    {
      label: tr(locale, "Base quote subtotal", "기본 견적 소계"),
      value: formatRwf(baseRwf),
      tone: "subtotal"
    },
    {
      label: tr(locale, "Additional project charges", "추가 프로젝트 비용"),
      value: "",
      tone: "section"
    },
    {
      label: tr(locale, "Logistics & transportation", "물류 및 운송비"),
      value: formatRwf(logisticsCost)
    },
    {
      label: tr(locale, "Site preparation & setup", "현장 준비 및 세팅비"),
      value: formatRwf(sitePrepCost)
    },
    {
      label: tr(locale, "After-hours support buffer", "야간/추가 지원 버퍼"),
      value: formatRwf(afterHoursSupportCost)
    },
    {
      label: tr(locale, "Contingency reserve", "예비비"),
      value: formatRwf(riskReserveCost)
    },
    {
      label: tr(locale, "Subtotal before VAT", "부가세 전 소계"),
      value: formatRwf(subtotalBeforeTax),
      tone: "subtotal"
    },
    { label: tr(locale, "VAT (18%)", "부가세 (18%)"), value: formatRwf(vat) },
    {
      label: tr(locale, "Estimated payable total", "예상 결제 총액"),
      value: formatRwf(total),
      tone: "total"
    }
  ];
}

function extractMinimumOrder(locale: Locale, value: string | null): string | null {
  if (!value) {
    return null;
  }
  const localized = localizeCopy(locale, value);
  const match = localized.match(/(?:MOQ|Minimum order|최소 주문)\s*[:：]\s*([^;|]+)/i);
  if (!match) {
    return null;
  }
  return match[1]?.trim() ?? null;
}

function isCustomOrderService(locale: Locale, title: string): boolean {
  const normalized = localizeCopy(locale, title).toLowerCase();
  return normalized.includes("custom") || normalized.includes("맞춤");
}

function reviewerAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=1f2937&color=f8fafc&size=64&bold=true`;
}

function getBillingStatusText(
  locale: Locale,
  billingCapability:
    | {
        quotationAvailable: boolean;
        ebmAvailable: boolean;
      }
    | null
    | undefined
): BillingStatusText {
  return {
    quotation: billingCapability?.quotationAvailable
      ? tr(locale, "Quotation available", "견적서 가능")
      : tr(locale, "Quotation unavailable", "견적서 불가"),
    ebm: billingCapability?.ebmAvailable
      ? tr(locale, "EBM available", "EBM 가능")
      : tr(locale, "EBM unavailable", "EBM 불가")
  };
}

function unitLabel(locale: Locale, unit: string): string {
  const normalized = unit.replace("per_", "per ");
  if (locale === "fr") {
    return normalized
      .replace("per hour", "par heure")
      .replace("per day", "par jour")
      .replace("per project", "par projet")
      .replace("per person", "par personne");
  }
  if (locale === "rw") {
    return normalized
      .replace("per hour", "ku isaha")
      .replace("per day", "ku munsi")
      .replace("per project", "ku mushinga")
      .replace("per person", "ku muntu");
  }
  if (locale !== "ko") {
    return normalized;
  }
  return normalized
    .replace("per hour", "시간당")
    .replace("per day", "일당")
    .replace("per project", "프로젝트당")
    .replace("per person", "인당");
}

export default async function ProviderDetailPage({
  params
}: ProviderDetailPageProps) {
  const locale = await getLocaleFromCookies();
  const { id } = await params;
  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      services: {
        include: {
          category: true,
          priceCards: { orderBy: { basePrice: "asc" } }
        }
      },
      billingCapability: true,
      verificationCases: { where: { status: "approved" }, orderBy: { reviewedAt: "desc" }, take: 1 },
      reviews: {
        include: { reviewer: true },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  if (!provider) {
    notFound();
  }

  const verification = provider.verificationCases[0];
  const topServices = provider.services.slice(0, 3).map((service) => localizeCopy(locale, service.title));
  const billingStatus = getBillingStatusText(locale, provider.billingCapability);

  return (
    <section className="grid provider-detail-page">
      <article className="panel provider-hero">
        <div className="provider-cover-wrap">
          {provider.coverImageUrl ? (
            <FallbackImage
              alt={`${provider.businessName} cover`}
              className="provider-cover"
              fallbackSrc="/image-fallback.svg"
              src={provider.coverImageUrl}
            />
          ) : (
            <div className="provider-cover provider-cover-placeholder" />
          )}
        </div>
        <div className="provider-identity">
          {provider.logoUrl ? (
            <FallbackImage
              alt={`${provider.businessName} logo`}
              className="provider-logo"
              fallbackSrc="/image-fallback.svg"
              src={provider.logoUrl}
            />
          ) : (
            <div className="provider-logo provider-logo-placeholder">
              {provider.businessName
                .split(" ")
                .slice(0, 2)
                .map((item) => item[0]?.toUpperCase() ?? "")
                .join("")}
            </div>
          )}
          <div>
            <h1 style={{ marginTop: 0, marginBottom: "8px" }}>{provider.businessName}</h1>
            {provider.tagline && <p className="provider-tagline">{localizeCopy(locale, provider.tagline)}</p>}
            <p className="muted provider-meta-line">
              {provider.city ?? tr(locale, "Unknown city", "도시 정보 없음")},{" "}
              {provider.country ?? tr(locale, "Unknown country", "국가 정보 없음")}
              {provider.yearsInBusiness
                ? ` · ${provider.yearsInBusiness} ${tr(locale, "years in business", "년 업력")}`
                : ""}
            </p>
            <div className="row">
              {verification ? (
                <span className="badge good">{verification.level?.replaceAll("_", " ") ?? "verified"}</span>
              ) : (
                <span className="badge">{tr(locale, "Verification pending", "검증 대기중")}</span>
              )}
              <span className={`badge ${provider.billingCapability?.quotationAvailable ? "good" : ""}`}>
                {billingStatus.quotation}
              </span>
              <span className={`badge ${provider.billingCapability?.ebmAvailable ? "good" : ""}`}>
                {billingStatus.ebm}
              </span>
            </div>
          </div>
        </div>
        <p>
          {provider.bio
            ? localizeCopy(locale, provider.bio)
            : tr(locale, "No business overview provided yet.", "업체 소개가 아직 등록되지 않았습니다.")}
        </p>
        <div className="provider-chip-row">
          {provider.categories.map((entry) => (
            <span className="badge" key={entry.id}>
              {entry.category.name}
            </span>
          ))}
        </div>
      </article>

      <section className="provider-summary-grid">
        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Business snapshot", "업체 요약")}</h2>
          <ul className="provider-list">
            <li>
              <strong>{tr(locale, "Top services", "주요 서비스")}:</strong>{" "}
              {topServices.length > 0 ? topServices.join(", ") : tr(locale, "No services listed yet", "서비스 정보 없음")}
            </li>
            <li>
              <strong>{tr(locale, "Years in business", "업력")}:</strong>{" "}
              {provider.yearsInBusiness ?? tr(locale, "Not provided", "미입력")}
            </li>
            <li>
              <strong>{tr(locale, "Vendor type", "업체 유형")}:</strong> {provider.providerType}
            </li>
            <li>
              <strong>{tr(locale, "Documentation", "증빙 문서")}:</strong>{" "}
              {billingStatus.quotation} / {billingStatus.ebm}
            </li>
          </ul>
          <VendorQuickActions locale={locale} vendorId={provider.id} vendorName={provider.businessName} />
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>{tr(locale, "Contact details", "연락처 정보")}</h2>
          <ul className="provider-list">
            <li>
              <strong>{tr(locale, "Email", "이메일")}:</strong>{" "}
              {provider.contactEmail ?? tr(locale, "Not provided", "미입력")}
            </li>
            <li>
              <strong>{tr(locale, "Phone", "전화번호")}:</strong>{" "}
              {provider.contactPhone ?? tr(locale, "Not provided", "미입력")}
            </li>
            <li>
              <strong>{tr(locale, "Website", "웹사이트")}:</strong>{" "}
              {provider.websiteUrl ? (
                <a href={provider.websiteUrl} rel="noreferrer" target="_blank">
                  {provider.websiteUrl}
                </a>
              ) : (
                tr(locale, "Not provided", "미입력")
              )}
            </li>
            <li>
              <strong>{tr(locale, "Location", "위치")}:</strong>{" "}
              {provider.city && provider.country ? (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    `${provider.city}, ${provider.country}`
                  )}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {tr(locale, "View on map", "지도에서 보기")}
                </a>
              ) : (
                tr(locale, "Not provided", "미입력")
              )}
            </li>
          </ul>
          <Link className="btn provider-action-btn" href={`/requests?vendorId=${provider.id}#vendor-request`}>
            {tr(locale, "Request this vendor", "이 업체에 요청 보내기")}
          </Link>
        </article>
      </section>

      <div id="vendor-chat">
        <VendorChatBox locale={locale} vendorId={provider.id} vendorName={provider.businessName} />
      </div>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Services and pricing", "서비스 및 가격")}</h2>
        {provider.services.length === 0 && (
          <p className="muted">{tr(locale, "No services published yet.", "등록된 서비스가 없습니다.")}</p>
        )}
        <div className="cards">
          {provider.services.map((service) => (
            <div className="card service-detail-card" key={service.id}>
              <FallbackImage
                alt={`${localizeCopy(locale, service.title)} visual`}
                className="service-image"
                fallbackSrc={getDefaultServiceImage(service.category.slug)}
                src={service.imageUrl ?? getDefaultServiceImage(service.category.slug)}
              />
              <h3 style={{ marginTop: 0 }}>{localizeCopy(locale, service.title)}</h3>
              {isCustomOrderService(locale, service.title) && service.priceCards[0] && (
                <p className="tiny service-starting-price">
                  {tr(locale, "Starting from", "기본 시작가")}:{" "}
                  {formatRwf(toRwf(decimalToNumber(service.priceCards[0].basePrice), service.priceCards[0].currency))}
                </p>
              )}
              <p className="tiny muted">
                {service.description
                  ? localizeCopy(locale, service.description)
                  : tr(locale, "No service description", "서비스 설명이 없습니다.")}
              </p>
              {service.priceCards.length === 0 && (
                <p className="tiny muted">{tr(locale, "No price cards yet.", "가격 카드가 없습니다.")}</p>
              )}
              {service.priceCards.map((price) => (
                <div className="price-row" key={price.id}>
                  <details className="price-breakdown">
                    <summary className="row tiny">
                      <strong>{tr(locale, "Price", "가격")}</strong>
                      <span>{formatRwf(toRwf(decimalToNumber(price.basePrice), price.currency))}</span>
                      <span>({unitLabel(locale, price.unit)})</span>
                    </summary>
                    <p className="price-breakdown-hint">
                      {tr(
                        locale,
                        "Detailed quote breakdown (click to expand)",
                        "상세 견적 내역 (클릭해서 펼치기)"
                      )}
                    </p>
                    <ul>
                      {getBreakdown(toRwf(decimalToNumber(price.basePrice), price.currency), locale).map((item) => (
                        <li
                          className={`price-breakdown-item ${item.tone ?? "normal"}`}
                          key={`${price.id}-${item.label}`}
                        >
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="tiny muted">
                    {tr(locale, "Includes", "포함")}:{" "}
                    {price.inclusions ? localizeCopy(locale, price.inclusions) : tr(locale, "Not specified", "미기재")} |{" "}
                    {tr(locale, "Excludes", "미포함")}:{" "}
                    {price.exclusions ? localizeCopy(locale, price.exclusions) : tr(locale, "Not specified", "미기재")}
                  </div>
                  {extractMinimumOrder(locale, price.inclusions) && (
                    <p className="tiny service-min-order-line">
                      <strong>{tr(locale, "Minimum order unit", "최소 주문 단위")}:</strong>{" "}
                      {extractMinimumOrder(locale, price.inclusions)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>{tr(locale, "Recent Reviews", "최근 리뷰")}</h2>
        {provider.reviews.length === 0 && (
          <p className="muted">{tr(locale, "No reviews yet.", "아직 리뷰가 없습니다.")}</p>
        )}
        {provider.reviews.map((review) => (
          <div className="review-item" key={review.id} style={{ marginBottom: "12px" }}>
            <strong>{review.ratingOverall}/5</strong>
            <div className="reviewer-line">
              <FallbackImage
                alt={`${review.reviewer.name} avatar`}
                className="reviewer-avatar"
                fallbackSrc="/image-fallback.svg"
                src={reviewerAvatarUrl(review.reviewer.name)}
              />
              <p className="tiny" style={{ margin: 0 }}>
                {tr(locale, "Reviewed by", "작성자")}: {review.reviewer.name}
              </p>
            </div>
            <p className="tiny muted" style={{ margin: "4px 0" }}>
              {tr(locale, "Price transparency", "가격 투명성")} {review.ratingPriceTransparency ?? "-"} ·{" "}
              {tr(locale, "Timeliness", "시간 준수")} {review.ratingTimeliness ?? "-"} ·{" "}
              {tr(locale, "Quality", "품질")} {review.ratingQuality ?? "-"}
            </p>
            <p style={{ margin: 0 }}>
              {review.comment ? localizeCopy(locale, review.comment) : tr(locale, "No comment.", "코멘트 없음")}
            </p>
          </div>
        ))}
      </article>
    </section>
  );
}
