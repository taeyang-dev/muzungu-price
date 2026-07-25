import { prisma } from "@/lib/prisma";
import { ensureDefaultServiceCategories } from "@/lib/service-categories";

export interface ProviderPageCategory {
  id: string;
  slug: string;
  name: string;
}

export interface ProviderPageProfile {
  id: string;
  businessName: string;
  providerType:
    | "freelancer"
    | "company"
    | "sole_proprietor"
    | "partnership"
    | "cooperative"
    | "ngo"
    | "other";
  providerTypeOther: string | null;
  businessActivitySector: string | null;
  businessActivityCode: string | null;
  businessActivityDetail: string | null;
  businessActivityOther: string | null;
  officialBusinessAddress: string | null;
  representativeName: string | null;
  representativeNationality: string | null;
  representativeIdType: string | null;
  representativeIdTypeOther: string | null;
  representativeIdNumber: string | null;
  representativeLocalAddress: string | null;
  representativeEmail: string | null;
  representativePhone: string | null;
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

export interface ProviderPageBilling {
  quotationAvailable: boolean;
  ebmAvailable: boolean;
  quotationLeadTimeHours: number | null;
  ebmNotes: string | null;
  vendorTinNumber: string | null;
  paymentTerms: string[];
  paymentMethods: string[];
  paymentMethodOtherDetail: string | null;
  momoAccountName: string | null;
  momoNumber: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
}

export type ProviderVerificationStatus = "draft" | "pending" | "approved" | "rejected" | "on_hold";

export interface ProviderPageData {
  categories: ProviderPageCategory[];
  profile: ProviderPageProfile | null;
  billing: ProviderPageBilling | null;
  verificationCaseId: string | null;
  verificationDocumentCount: number;
  verificationStatus: ProviderVerificationStatus | null;
}

export async function loadProviderPageData(userId: string): Promise<ProviderPageData> {
  await ensureDefaultServiceCategories();

  const [categories, profile] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        categories: true,
        billingCapability: true,
        verificationCases: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { documents: true }
        }
      }
    })
  ]);

  const verificationCase = profile?.verificationCases[0] ?? null;

  return {
    categories,
    profile: profile
      ? {
          id: profile.id,
          businessName: profile.businessName,
          providerType: profile.providerType,
          providerTypeOther: profile.providerTypeOther,
          businessActivitySector: profile.businessActivitySector,
          businessActivityCode: profile.businessActivityCode,
          businessActivityDetail: profile.businessActivityDetail,
          businessActivityOther: profile.businessActivityOther,
          officialBusinessAddress: profile.officialBusinessAddress,
          representativeName: profile.representativeName,
          representativeNationality: profile.representativeNationality,
          representativeIdType: profile.representativeIdType,
          representativeIdTypeOther: profile.representativeIdTypeOther,
          representativeIdNumber: profile.representativeIdNumber,
          representativeLocalAddress: profile.representativeLocalAddress,
          representativeEmail: profile.representativeEmail,
          representativePhone: profile.representativePhone,
          tagline: profile.tagline,
          city: profile.city,
          country: profile.country,
          bio: profile.bio,
          logoUrl: profile.logoUrl,
          coverImageUrl: profile.coverImageUrl,
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone,
          websiteUrl: profile.websiteUrl,
          yearsInBusiness: profile.yearsInBusiness,
          categoryIds: profile.categories.map((entry) => entry.categoryId)
        }
      : null,
    billing: profile?.billingCapability
      ? {
          quotationAvailable: profile.billingCapability.quotationAvailable,
          ebmAvailable: profile.billingCapability.ebmAvailable,
          quotationLeadTimeHours: profile.billingCapability.quotationLeadTimeHours,
          ebmNotes: profile.billingCapability.ebmNotes,
          vendorTinNumber: profile.billingCapability.vendorTinNumber,
          paymentTerms: profile.billingCapability.paymentTermsCsv
            ? profile.billingCapability.paymentTermsCsv
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
          paymentMethods: profile.billingCapability.paymentMethodsCsv
            ? profile.billingCapability.paymentMethodsCsv
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
          paymentMethodOtherDetail: profile.billingCapability.paymentMethodOtherDetail,
          momoAccountName: profile.billingCapability.momoAccountName,
          momoNumber: profile.billingCapability.momoNumber,
          bankName: profile.billingCapability.bankName,
          bankAccountName: profile.billingCapability.bankAccountName,
          bankAccountNumber: profile.billingCapability.bankAccountNumber,
          bankSwiftCode: profile.billingCapability.bankSwiftCode
        }
      : null,
    verificationCaseId: verificationCase?.id ?? null,
    verificationDocumentCount: verificationCase?.documents.length ?? 0,
    verificationStatus: verificationCase?.status ?? null
  };
}
