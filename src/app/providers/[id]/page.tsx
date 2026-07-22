import { notFound } from "next/navigation";
import Link from "next/link";
import { decimalToNumber } from "@/lib/api";
import { prisma } from "@/lib/prisma";

interface ProviderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderDetailPage({
  params
}: ProviderDetailPageProps) {
  const { id } = await params;
  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      services: { include: { priceCards: { orderBy: { basePrice: "asc" } } } },
      billingCapability: true,
      verificationCases: { where: { status: "approved" }, orderBy: { reviewedAt: "desc" }, take: 1 },
      reviews: { orderBy: { createdAt: "desc" }, take: 20 }
    }
  });

  if (!provider) {
    notFound();
  }

  const verification = provider.verificationCases[0];
  const average =
    provider.reviews.length > 0
      ? provider.reviews.reduce((sum, review) => sum + review.ratingOverall, 0) / provider.reviews.length
      : null;

  return (
    <section className="grid">
      <article className="panel">
        <h1 style={{ marginTop: 0 }}>{provider.businessName}</h1>
        <p className="muted">
          {provider.bio ?? "No description yet"} · {provider.city ?? "Unknown city"},{" "}
          {provider.country ?? "Unknown country"}
        </p>
        <div className="row">
          {verification ? (
            <span className="badge good">
              {verification.level?.replaceAll("_", " ") ?? "verified"} (score {verification.score})
            </span>
          ) : (
            <span className="badge">Verification pending</span>
          )}
          {provider.billingCapability?.quotationAvailable && <span className="badge">Quotation Ready</span>}
          {provider.billingCapability?.ebmAvailable && <span className="badge">EBM Ready</span>}
        </div>
        <p className="tiny muted">
          Categories: {provider.categories.map((entry) => entry.category.name).join(", ")}
        </p>
        <p className="tiny">Average rating: {average ? average.toFixed(1) : "No reviews yet"}</p>
        <Link className="btn" href="/requests">
          Create request to contact this provider
        </Link>
      </article>

      <article className="panel">
        <h2 style={{ marginTop: 0 }}>Public Price Cards</h2>
        {provider.services.length === 0 && <p className="muted">No services published yet.</p>}
        <div className="cards">
          {provider.services.map((service) => (
            <div className="card" key={service.id}>
              <h3 style={{ marginTop: 0 }}>{service.title}</h3>
              <p className="tiny muted">{service.description ?? "No service description"}</p>
              {service.priceCards.map((price) => (
                <div key={price.id} style={{ marginBottom: "8px" }}>
                  <div className="row tiny">
                    <strong>{price.tier.toUpperCase()}</strong>
                    <span>
                      {price.currency} {decimalToNumber(price.basePrice)?.toFixed(2)}
                    </span>
                    <span>({price.unit.replace("per_", "per ")})</span>
                  </div>
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
