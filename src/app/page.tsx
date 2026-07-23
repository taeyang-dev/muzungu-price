import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/api";
import { getDefaultServiceImage } from "@/lib/default-images";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const visualByCategory: Record<string, { emoji: string; background: string }> = {
  electrical: { emoji: "⚡", background: "linear-gradient(140deg, #fff7ed, #fde68a)" },
  events: { emoji: "🎉", background: "linear-gradient(140deg, #f5f3ff, #ddd6fe)" },
  "language-lessons": { emoji: "🗣️", background: "linear-gradient(140deg, #eff6ff, #bfdbfe)" },
  "real-estate": { emoji: "🏠", background: "linear-gradient(140deg, #ecfeff, #bae6fd)" },
  safari: { emoji: "🦁", background: "linear-gradient(140deg, #ecfccb, #d9f99d)" }
};

const searchKeywordGroups: Record<string, string[]> = {
  electrical: ["electrical", "electric", "electricity", "electrician", "power"],
  events: ["event", "events", "wedding", "conference", "planner"],
  "language-lessons": ["language", "lessons", "teacher", "translator", "english"],
  "real-estate": ["real estate", "property", "housing", "rent", "apartment", "broker"],
  safari: ["safari", "tour", "travel", "guide", "trip"]
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPrice(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) {
    return "Price not available";
  }

  const conversionToRwf: Record<string, number> = {
    RWF: 1,
    USD: 1400,
    EUR: 1500,
    UGX: 0.37
  };
  const multiplier = conversionToRwf[currency ?? "RWF"] ?? 1;
  const rwfValue = amount * multiplier;

  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0
  }).format(rwfValue);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const locale = await getLocaleFromCookies();

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQ = q.toLowerCase();
  const derivedTerms = Object.entries(searchKeywordGroups)
    .filter(([, keywords]) => keywords.some((keyword) => normalizedQ.includes(keyword)))
    .flatMap(([slug, keywords]) => [slug, ...keywords]);
  const searchTerms = Array.from(new Set([q, ...derivedTerms])).filter(Boolean);
  const verifiedOnly = params.verified === "1";
  const quotationOnly = params.quotation === "1";
  const ebmOnly = params.ebm === "1";
  const category = typeof params.category === "string" ? params.category : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;

  const where: Prisma.ProviderProfileWhereInput = {
    isActive: true,
    ...(searchTerms.length > 0
      ? {
          OR: searchTerms.flatMap((term) => [
            { businessName: { contains: term } },
            { bio: { contains: term } },
            { services: { some: { title: { contains: term } } } },
            {
              categories: {
                some: {
                  category: {
                    name: { contains: term }
                  }
                }
              }
            },
            {
              categories: {
                some: {
                  category: {
                    slug: { contains: term }
                  }
                }
              }
            }
          ])
        }
      : {}),
    ...(city ? { city: { contains: city } } : {}),
    ...(category
      ? {
          categories: {
            some: {
              category: {
                slug: category
              }
            }
          }
        }
      : {}),
    ...(verifiedOnly
      ? {
          verificationCases: {
            some: {
              status: "approved"
            }
          }
        }
      : {}),
    ...(quotationOnly || ebmOnly
      ? {
          billingCapability: {
            ...(quotationOnly ? { quotationAvailable: true } : {}),
            ...(ebmOnly ? { ebmAvailable: true } : {})
          }
        }
      : {})
  };

  const [providers, categories] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      include: {
        categories: {
          include: { category: true }
        },
        services: {
          include: {
            priceCards: true,
            category: true
          }
        },
        billingCapability: true,
        verificationCases: {
          where: { status: "approved" },
          orderBy: { reviewedAt: "desc" },
          take: 1
        },
        reviews: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <>
      <section className="panel section">
        <form className="grid grid-3" method="GET">
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">{tr(locale, "Search vendor", "업체 검색")}</label>
            <input
              className="input"
              defaultValue={q}
              name="q"
              placeholder={tr(
                locale,
                "Search by vendor or category (e.g. electricity)",
                "업체명 또는 카테고리로 검색 (예: electricity)"
              )}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Category", "카테고리")}</label>
            <select className="select" name="category" defaultValue={category}>
              <option value="">{tr(locale, "All categories", "전체 카테고리")}</option>
              {categories.map((item) => (
                <option value={item.slug} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="tiny">{tr(locale, "City", "도시")}</label>
            <input className="input" name="city" defaultValue={city} placeholder={tr(locale, "Kampala", "키갈리")} />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Filters", "필터")}</label>
            <div className="row tiny" style={{ marginTop: "8px" }}>
              <label>
                <input defaultChecked={verifiedOnly} name="verified" type="checkbox" value="1" />{" "}
                {tr(locale, "Verified only", "검증된 업체만")}
              </label>
              <label>
                <input
                  defaultChecked={quotationOnly}
                  name="quotation"
                  type="checkbox"
                  value="1"
                />{" "}
                {tr(locale, "Quotation", "견적서")}
              </label>
              <label>
                <input defaultChecked={ebmOnly} name="ebm" type="checkbox" value="1" />{" "}
                {tr(locale, "EBM", "EBM")}
              </label>
            </div>
          </div>
          <button className="btn" type="submit">
            {tr(locale, "Apply filters", "필터 적용")}
          </button>
        </form>
      </section>

      <section className="cards section">
        {providers.map((provider) => {
          const approved = provider.verificationCases[0];
          const primaryCategory = provider.categories[0]?.category;
          const visual = primaryCategory
            ? visualByCategory[primaryCategory.slug] ?? {
                emoji: "🧰",
                background: "linear-gradient(140deg, #f1f5f9, #e2e8f0)"
              }
            : { emoji: "🧰", background: "linear-gradient(140deg, #f1f5f9, #e2e8f0)" };
          const representative = provider.services
            .flatMap((service) => service.priceCards)
            .sort((a, b) => a.basePrice.comparedTo(b.basePrice))[0];
          const serviceWithImage = provider.services.find((service) => service.imageUrl);
          const serviceImage = serviceWithImage?.imageUrl
            ? serviceWithImage.imageUrl
            : getDefaultServiceImage(provider.services[0]?.category.slug);
          const averageRating =
            provider.reviews.length > 0
              ? provider.reviews.reduce((sum, review) => sum + review.ratingOverall, 0) /
                provider.reviews.length
              : null;

          return (
            <article className="card vendor-card" key={provider.id}>
              <img
                alt={`${provider.businessName} service`}
                className="vendor-service-thumb"
                src={serviceImage}
              />
              <div className="vendor-head">
                <div className="vendor-visual" style={{ background: visual.background }}>
                  {provider.logoUrl ? (
                    <img
                      alt={`${provider.businessName} logo`}
                      className="vendor-logo-image"
                      src={provider.logoUrl}
                    />
                  ) : (
                    <>
                      <span className="vendor-initials">{getInitials(provider.businessName)}</span>
                      <span className="vendor-emoji">{visual.emoji}</span>
                    </>
                  )}
                </div>
                <div>
                  <div className="vendor-title-row">
                    <h3 className="vendor-name">{provider.businessName}</h3>
                    <div className="vendor-inline-badges">
                      {approved && (
                        <span className="badge good compact">
                          {approved.level?.replaceAll("_", " ") ?? "verified"}
                        </span>
                      )}
                      {!approved && <span className="badge compact">Verification pending</span>}
                      {provider.billingCapability?.quotationAvailable && (
                        <span className="badge compact">Quotation</span>
                      )}
                      {provider.billingCapability?.ebmAvailable && (
                        <span className="badge compact">EBM</span>
                      )}
                    </div>
                  </div>
                  {provider.tagline && <p className="vendor-tagline">{provider.tagline}</p>}
                  <p className="muted tiny vendor-location">
                    📍 {provider.city ?? tr(locale, "City not listed", "도시 미등록")},{" "}
                    {provider.country ?? tr(locale, "Country not listed", "국가 미등록")}
                  </p>
                </div>
              </div>
              <div className="row tiny vendor-rating-row">
                <span className="vendor-rating">
                  {averageRating ? `★ ${averageRating.toFixed(1)}` : tr(locale, "No ratings yet", "아직 평점 없음")}
                </span>
                <span className="muted">
                  ({provider.reviews.length} {tr(locale, "reviews", "리뷰")})
                </span>
              </div>
              <div className="hr" />
              <p className="tiny vendor-price-line">
                {representative
                  ? `From ${formatPrice(
                      decimalToNumber(representative.basePrice),
                      representative.currency
                    )} (${representative.unit.replace("per_", "per ")})`
                  : tr(locale, "No public price card yet", "공개된 가격 카드가 없습니다.")}
              </p>
              <p className="tiny vendor-category-line">
                {tr(locale, "Categories", "카테고리")}:{" "}
                {provider.categories.map((entry) => entry.category.name).join(", ")}
              </p>
              <Link className="btn" href={`/providers/${provider.id}`}>
                {tr(locale, "View profile", "업체 상세 보기")}
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
