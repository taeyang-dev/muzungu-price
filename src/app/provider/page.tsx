import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProviderDashboard } from "@/components/ProviderDashboard";
import { BecomeProviderButton } from "@/components/BecomeProviderButton";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";

export default async function ProviderPage() {
  const session = await getSession();
  const locale = await getLocaleFromCookies();
  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Provider Hub", "업체 허브")}</h1>
        <p>{tr(locale, "Please sign in first.", "먼저 로그인해 주세요.")}</p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  if (session.role !== "provider") {
    return (
      <section className="panel">
        <h1>{tr(locale, "Provider Hub", "업체 허브")}</h1>
        <p className="muted">
          {tr(
            locale,
            "Use your existing account and switch to vendor mode to register your business.",
            "현재 계정 그대로 벤더 모드로 전환한 뒤 업체 정보를 등록할 수 있습니다."
          )}
        </p>
        <BecomeProviderButton locale={locale} />
      </section>
    );
  }

  await prisma.serviceCategory.upsert({
    where: { slug: "other" },
    update: { name: "Other Services" },
    create: { slug: "other", name: "Other Services" }
  });

  const [categories, profile] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.providerProfile.findUnique({
      where: { userId: session.userId },
      include: {
        services: {
          include: {
            category: true
          }
        },
        categories: true,
        billingCapability: true,
        verificationCases: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })
  ]);

  return (
    <ProviderDashboard
      billing={
        profile?.billingCapability
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
              momoAccountName: profile.billingCapability.momoAccountName,
              momoNumber: profile.billingCapability.momoNumber,
              bankName: profile.billingCapability.bankName,
              bankAccountName: profile.billingCapability.bankAccountName,
              bankAccountNumber: profile.billingCapability.bankAccountNumber,
              bankSwiftCode: profile.billingCapability.bankSwiftCode
            }
          : null
      }
      categories={categories}
      locale={locale}
      profile={
        profile
          ? {
              id: profile.id,
              businessName: profile.businessName,
              providerType: profile.providerType,
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
          : null
      }
      services={profile?.services ?? []}
      verificationCaseId={profile?.verificationCases[0]?.id ?? null}
    />
  );
}
