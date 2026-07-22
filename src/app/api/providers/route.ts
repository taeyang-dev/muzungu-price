import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { decimalToNumber, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const search = request.nextUrl.searchParams;
  const verifiedOnly = search.get("verified_only") === "true";
  const quotationAvailable = search.get("quotation_available") === "true";
  const ebmAvailable = search.get("ebm_available") === "true";
  const category = search.get("category");
  const city = search.get("city");

  const where: Prisma.ProviderProfileWhereInput = {
    isActive: true,
    ...(city ? { city: { contains: city } } : {}),
    ...(category
      ? {
          categories: {
            some: {
              category: { slug: category }
            }
          }
        }
      : {}),
    ...(verifiedOnly
      ? {
          verificationCases: {
            some: { status: "approved" }
          }
        }
      : {}),
    ...(quotationAvailable || ebmAvailable
      ? {
          billingCapability: {
            ...(quotationAvailable ? { quotationAvailable: true } : {}),
            ...(ebmAvailable ? { ebmAvailable: true } : {})
          }
        }
      : {})
  };

  const providers = await prisma.providerProfile.findMany({
    where,
    include: {
      services: { include: { priceCards: true } },
      categories: { include: { category: true } },
      billingCapability: true,
      reviews: true,
      verificationCases: {
        where: { status: "approved" },
        orderBy: { reviewedAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const mapped = providers.map((provider) => {
    const allPrices = provider.services.flatMap((service) => service.priceCards);
    const representative = allPrices.sort((a, b) => a.basePrice.comparedTo(b.basePrice))[0];
    const rating =
      provider.reviews.length > 0
        ? provider.reviews.reduce((sum, review) => sum + review.ratingOverall, 0) / provider.reviews.length
        : null;

    return {
      id: provider.id,
      business_name: provider.businessName,
      city: provider.city,
      country: provider.country,
      categories: provider.categories.map((entry) => entry.category.name),
      representative_price: representative
        ? {
            currency: representative.currency,
            amount: decimalToNumber(representative.basePrice),
            unit: representative.unit
          }
        : null,
      rating_avg: rating,
      review_count: provider.reviews.length,
      verification: provider.verificationCases[0]
        ? {
            status: provider.verificationCases[0].status,
            level: provider.verificationCases[0].level,
            score: provider.verificationCases[0].score
          }
        : null,
      billing: provider.billingCapability
        ? {
            quotation_available: provider.billingCapability.quotationAvailable,
            ebm_available: provider.billingCapability.ebmAvailable,
            quotation_lead_time_hours: provider.billingCapability.quotationLeadTimeHours
          }
        : null
    };
  });

  return ok(mapped, { total: mapped.length });
}
