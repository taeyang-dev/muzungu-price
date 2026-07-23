import { notFound } from "next/navigation";
import Link from "next/link";
import { decimalToNumber } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { VendorQuickActions } from "@/components/VendorQuickActions";
import { VendorChatBox } from "@/components/VendorChatBox";
import { getDefaultServiceImage } from "@/lib/default-images";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { localizeCopy, tr } from "@/lib/i18n";

interface ProviderDetailPageProps {
  params: Promise<{ id: string }>;
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

function getBreakdown(
  baseRwf: number | null,
  locale: "en" | "ko"
): Array<{ label: string; value: string }> {
  if (!baseRwf) {
    return [];
  }
  const delivery = 5000;
  const vat = Math.round(baseRwf * 0.18);
  const total = baseRwf + delivery + vat;
  return [
    { label: tr(locale, "Service fee", "서비스 비용"), value: formatRwf(baseRwf) },
    { label: tr(locale, "Delivery fee", "배달비"), value: formatRwf(delivery) },
    { label: tr(locale, "VAT (18%)", "부가세 (18%)"), value: formatRwf(vat) },
    { label: tr(locale, "Estimated total", "예상 총액"), value: formatRwf(total) }
  ];
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

  return (
    <section className="grid provider-detail-page">
      <article className="panel provider-hero">
        <div className="provider-cover-wrap">
          {provider.coverImageUrl ? (
            <img
              alt={`${provider.businessName} cover`}
              className="provider-cover"
              src={provider.coverImageUrl}
            />
          ) : (
            <div className="provider-cover provider-cover-placeholder" />
          )}
        </div>
        <div className="provider-identity">
          {provider.logoUrl ? (
            <img alt={`${provider.businessName} logo`} className="provider-logo" src={provider.logoUrl} />
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
              {provider.billingCapability?.quotationAvailable && (
                <span className="badge">{tr(locale, "Quotation Ready", "견적서 가능")}</span>
              )}
              {provider.billingCapability?.ebmAvailable && <span className="badge">EBM Ready</span>}
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
              {provider.billingCapability?.quotationAvailable
                ? tr(locale, "Quotation", "견적서")
                : tr(locale, "No quotation", "견적서 불가")}{" "}
              /{" "}
              {provider.billingCapability?.ebmAvailable ? "EBM" : tr(locale, "No EBM", "EBM 불가")}
            </li>
          </ul>
          <VendorQuickActions vendorId={provider.id} vendorName={provider.businessName} />
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
          <Link className="btn provider-action-btn" href="/requests">
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
              <img
                alt={`${service.title} visual`}
                className="service-image"
                src={service.imageUrl ?? getDefaultServiceImage(service.category.slug)}
              />
              <h3 style={{ marginTop: 0 }}>{localizeCopy(locale, service.title)}</h3>
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
                      <strong>{price.tier.toUpperCase()}</strong>
                      <span>{formatRwf(toRwf(decimalToNumber(price.basePrice), price.currency))}</span>
                      <span>({price.unit.replace("per_", "per ")})</span>
                    </summary>
                    <ul>
                      {getBreakdown(toRwf(decimalToNumber(price.basePrice), price.currency), locale).map((item) => (
                        <li key={`${price.id}-${item.label}`}>
                          <span>{item.label}:</span>
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
          <div key={review.id} style={{ marginBottom: "12px" }}>
            <strong>{review.ratingOverall}/5</strong>
            <p className="tiny" style={{ margin: "4px 0" }}>
              {tr(locale, "Reviewed by", "작성자")}: {review.reviewer.name}
            </p>
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
