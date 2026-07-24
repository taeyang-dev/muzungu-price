import { NextRequest, NextResponse } from "next/server";
import { decimalToNumber, fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      services: { include: { priceCards: true } },
      billingCapability: true,
      reviews: true,
      verificationCases: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  if (!provider) {
    return fail("Provider not found", 404, "NOT_FOUND");
  }

  type ProviderCategoryItem = (typeof provider.categories)[number];

  return ok({
    id: provider.id,
    business_name: provider.businessName,
    tagline: provider.tagline,
    bio: provider.bio,
    logo_url: provider.logoUrl,
    cover_image_url: provider.coverImageUrl,
    contact_email: provider.contactEmail,
    contact_phone: provider.contactPhone,
    website_url: provider.websiteUrl,
    years_in_business: provider.yearsInBusiness,
    city: provider.city,
    country: provider.country,
    categories: provider.categories.map((entry: ProviderCategoryItem) => ({
      slug: entry.category.slug,
      name: entry.category.name
    })),
    verification: provider.verificationCases[0]
      ? {
          status: provider.verificationCases[0].status,
          score: provider.verificationCases[0].score,
          level: provider.verificationCases[0].level
        }
      : null,
    billing: provider.billingCapability
      ? {
          quotation_available: provider.billingCapability.quotationAvailable,
          ebm_available: provider.billingCapability.ebmAvailable,
          quotation_lead_time_hours: provider.billingCapability.quotationLeadTimeHours,
          ebm_notes: provider.billingCapability.ebmNotes,
          vendor_tin_number: provider.billingCapability.vendorTinNumber,
          payment_terms_csv: provider.billingCapability.paymentTermsCsv,
          payment_methods_csv: provider.billingCapability.paymentMethodsCsv,
          payment_method_other_detail: provider.billingCapability.paymentMethodOtherDetail,
          momo_account_name: provider.billingCapability.momoAccountName,
          momo_number: provider.billingCapability.momoNumber,
          bank_name: provider.billingCapability.bankName,
          bank_account_name: provider.billingCapability.bankAccountName,
          bank_account_number: provider.billingCapability.bankAccountNumber,
          bank_swift_code: provider.billingCapability.bankSwiftCode
        }
      : null,
    services: provider.services.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      image_url: service.imageUrl,
      prices: service.priceCards.map((price) => ({
        id: price.id,
        tier: price.tier,
        currency: price.currency,
        amount: decimalToNumber(price.basePrice),
        unit: price.unit,
        inclusions: price.inclusions,
        exclusions: price.exclusions
      }))
    })),
    review_summary: {
      count: provider.reviews.length,
      average:
        provider.reviews.length > 0
          ? provider.reviews.reduce((sum, review) => sum + review.ratingOverall, 0) / provider.reviews.length
          : null
    }
  });
}
