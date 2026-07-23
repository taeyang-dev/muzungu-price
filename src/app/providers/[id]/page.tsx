import { notFound } from "next/navigation";
import Link from "next/link";
import { decimalToNumber } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { VendorQuickActions } from "@/components/VendorQuickActions";
import { VendorChatBox } from "@/components/VendorChatBox";
import { getDefaultServiceImage } from "@/lib/default-images";

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

function getBreakdown(baseRwf: number | null): Array<{ label: string; value: string }> {
  if (!baseRwf) {
    return [];
  }
  const delivery = 5000;
  const vat = Math.round(baseRwf * 0.18);
  const total = baseRwf + delivery + vat;
  return [
    { label: "Service fee", value: formatRwf(baseRwf) },
    { label: "Delivery fee", value: formatRwf(delivery) },
    { label: "VAT (18%)", value: formatRwf(vat) },
    { label: "Estimated total", value: formatRwf(total) }
  ];
}

export default async function ProviderDetailPage({
  params
}: ProviderDetailPageProps) {
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
      reviews: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  if (!provider) {
    notFound();
  }

  const verification = provider.verificationCases[0];
  const topServices = provider.services.slice(0, 3).map((service) => service.title);

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
            {provider.tagline && <p className="provider-tagline">{provider.tagline}</p>}
            <p className="muted provider-meta-line">
              {provider.city ?? "Unknown city"}, {provider.country ?? "Unknown country"}
              {provider.yearsInBusiness ? ` · ${provider.yearsInBusiness} years in business` : ""}
            </p>
            <div className="row">
              {verification ? (
                <span className="badge good">{verification.level?.replaceAll("_", " ") ?? "verified"}</span>
              ) : (
                <span className="badge">Verification pending</span>
              )}
              {provider.billingCapability?.quotationAvailable && <span className="badge">Quotation Ready</span>}
              {provider.billingCapability?.ebmAvailable && <span className="badge">EBM Ready</span>}
            </div>
          </div>
        </div>
        <p>{provider.bio ?? "No business overview provided yet."}</p>
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
          <h2 style={{ marginTop: 0 }}>Business snapshot</h2>
          <ul className="provider-list">
            <li>
              <strong>Top services:</strong>{" "}
              {topServices.length > 0 ? topServices.join(", ") : "No services listed yet"}
            </li>
            <li>
              <strong>Years in business:</strong> {provider.yearsInBusiness ?? "Not provided"}
            </li>
            <li>
              <strong>Vendor type:</strong> {provider.providerType}
            </li>
            <li>
              <strong>Documentation:</strong>{" "}
              {provider.billingCapability?.quotationAvailable ? "Quotation" : "No quotation"} /{" "}
              {provider.billingCapability?.ebmAvailable ? "EBM" : "No EBM"}
            </li>
          </ul>
          <VendorQuickActions vendorId={provider.id} vendorName={provider.businessName} />
        </article>

        <article className="panel">
          <h2 style={{ marginTop: 0 }}>Contact details</h2>
          <ul className="provider-list">
            <li>
              <strong>Email:</strong> {provider.contactEmail ?? "Not provided"}
            </li>
            <li>
              <strong>Phone:</strong> {provider.contactPhone ?? "Not provided"}
            </li>
            <li>
              <strong>Website:</strong>{" "}
              {provider.websiteUrl ? (
                <a href={provider.websiteUrl} rel="noreferrer" target="_blank">
                  {provider.websiteUrl}
                </a>
              ) : (
                "Not provided"
              )}
            </li>
            <li>
              <strong>Location:</strong>{" "}
              {provider.city && provider.country ? (
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    `${provider.city}, ${provider.country}`
                  )}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on map
                </a>
              ) : (
                "Not provided"
              )}
            </li>
          </ul>
          <Link className="btn provider-action-btn" href="/requests">
            Request this vendor
          </Link>
        </article>
      </section>

      <VendorChatBox vendorId={provider.id} vendorName={provider.businessName} />

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Services and pricing</h2>
        {provider.services.length === 0 && <p className="muted">No services published yet.</p>}
        <div className="cards">
          {provider.services.map((service) => (
            <div className="card service-detail-card" key={service.id}>
              <img
                alt={`${service.title} visual`}
                className="service-image"
                src={service.imageUrl ?? getDefaultServiceImage(service.category.slug)}
              />
              <h3 style={{ marginTop: 0 }}>{service.title}</h3>
              <p className="tiny muted">{service.description ?? "No service description"}</p>
              {service.priceCards.length === 0 && <p className="tiny muted">No price cards yet.</p>}
              {service.priceCards.map((price) => (
                <div className="price-row" key={price.id}>
                  <details className="price-breakdown">
                    <summary className="row tiny">
                      <strong>{price.tier.toUpperCase()}</strong>
                      <span>{formatRwf(toRwf(decimalToNumber(price.basePrice), price.currency))}</span>
                      <span>({price.unit.replace("per_", "per ")})</span>
                    </summary>
                    <ul>
                      {getBreakdown(toRwf(decimalToNumber(price.basePrice), price.currency)).map((item) => (
                        <li key={`${price.id}-${item.label}`}>
                          <span>{item.label}:</span>
                          <span>{item.value}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="tiny muted">
                    Includes: {price.inclusions ?? "Not specified"} | Excludes:{" "}
                    {price.exclusions ?? "Not specified"}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Recent Reviews</h2>
        {provider.reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {provider.reviews.map((review) => (
          <div key={review.id} style={{ marginBottom: "12px" }}>
            <strong>{review.ratingOverall}/5</strong>
            <p className="tiny muted" style={{ margin: "4px 0" }}>
              Price transparency {review.ratingPriceTransparency ?? "-"} · Timeliness{" "}
              {review.ratingTimeliness ?? "-"} · Quality {review.ratingQuality ?? "-"}
            </p>
            <p style={{ margin: 0 }}>{review.comment ?? "No comment."}</p>
          </div>
        ))}
      </article>
    </section>
  );
}
