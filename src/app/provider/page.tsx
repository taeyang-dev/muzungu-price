import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProviderDashboard } from "@/components/ProviderDashboard";

export default async function ProviderPage() {
  const session = await getSession();
  if (!session) {
    return (
      <section className="panel">
        <h1>Provider Hub</h1>
        <p>Please sign in first.</p>
        <Link className="btn" href="/auth">
          Go to Sign in
        </Link>
      </section>
    );
  }

  if (session.role !== "provider") {
    return (
      <section className="panel">
        <h1>Provider Hub</h1>
        <p className="muted">This section is only available to provider accounts.</p>
      </section>
    );
  }

  const [categories, profile] = await Promise.all([
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.providerProfile.findUnique({
      where: { userId: session.userId },
      include: {
        services: true,
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
      billing={profile?.billingCapability ?? null}
      categories={categories}
      profile={
        profile
          ? {
              id: profile.id,
              businessName: profile.businessName,
              providerType: profile.providerType,
              city: profile.city,
              country: profile.country,
              bio: profile.bio,
              logoUrl: profile.logoUrl,
              coverImageUrl: profile.coverImageUrl,
              contactEmail: profile.contactEmail,
              contactPhone: profile.contactPhone,
              websiteUrl: profile.websiteUrl,
              yearsInBusiness: profile.yearsInBusiness
            }
          : null
      }
      services={profile?.services ?? []}
      verificationCaseId={profile?.verificationCases[0]?.id ?? null}
    />
  );
}
