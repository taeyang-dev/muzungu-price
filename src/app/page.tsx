import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/api";

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q.trim() : "";
  const verifiedOnly = params.verified === "1";
  const quotationOnly = params.quotation === "1";
  const ebmOnly = params.ebm === "1";
  const category = typeof params.category === "string" ? params.category : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;

  const where: Prisma.ProviderProfileWhereInput = {
    isActive: true,
    ...(q ? { businessName: { contains: q } } : {}),
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
            priceCards: true
          }
        },
        billingCapability: true,
        verificationCases: {
          where: { status: "approved" },
          orderBy: { reviewedAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <>
      <section className="hero">
        <h1>Find trusted local vendors with clear fixed pricing.</h1>
        <p>
          Browse verified vendors quickly, compare public prices, and contact the right provider
          without guesswork.
        </p>
      </section>

      <section className="panel section">
        <form className="grid grid-3" method="GET">
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="tiny">Search vendor</label>
            <input
              className="input"
              defaultValue={q}
              name="q"
              placeholder="Search by vendor name"
            />
          </div>
          <div>
            <label className="tiny">Category</label>
            <select className="select" name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option value={item.slug} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="tiny">City</label>
            <input className="input" name="city" defaultValue={city} placeholder="Kampala" />
          </div>
          <div>
            <label className="tiny">Filters</label>
            <div className="row tiny" style={{ marginTop: "8px" }}>
              <label>
                <input defaultChecked={verifiedOnly} name="verified" type="checkbox" value="1" />{" "}
                Verified only
              </label>
              <label>
                <input
                  defaultChecked={quotationOnly}
                  name="quotation"
                  type="checkbox"
                  value="1"
                />{" "}
                Quotation
              </label>
              <label>
                <input defaultChecked={ebmOnly} name="ebm" type="checkbox" value="1" /> EBM
              </label>
            </div>
          </div>
          <button className="btn" type="submit">
            Apply filters
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

          return (
            <article className="card" key={provider.id}>
              <div className="vendor-head">
                <div className="vendor-visual" style={{ background: visual.background }}>
                  <span className="vendor-initials">{getInitials(provider.businessName)}</span>
                  <span className="vendor-emoji">{visual.emoji}</span>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 6px 0" }}>{provider.businessName}</h3>
                  <p className="muted tiny" style={{ marginTop: 0 }}>
                    {provider.city ?? "City not listed"}, {provider.country ?? "Country not listed"}
                  </p>
                </div>
              </div>
              {approved && <span className="badge good">{approved.level?.replaceAll("_", " ") ?? "verified"}</span>}
              {!approved && <span className="badge">Verification pending</span>}
              {provider.billingCapability?.quotationAvailable && <span className="badge">Quotation</span>}
              {provider.billingCapability?.ebmAvailable && <span className="badge">EBM</span>}

              <div className="hr" />
              <p className="tiny" style={{ margin: 0 }}>
                {representative
                  ? `From ${representative.currency} ${decimalToNumber(
                      representative.basePrice
                    )?.toFixed(2)} (${representative.unit.replace("per_", "per ")})`
                  : "No public price card yet"}
              </p>
              <p className="tiny">
                Categories: {provider.categories.map((entry) => entry.category.name).join(", ")}
              </p>
              <Link className="btn" href={`/providers/${provider.id}`}>
                View profile
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
