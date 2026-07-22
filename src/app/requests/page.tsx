import Link from "next/link";
import { decimalToNumber } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsPanel } from "@/components/RequestsPanel";

export default async function RequestsPage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    return (
      <section className="panel">
        <h1>Requests</h1>
        <p>Please sign in to create requests or submit offers.</p>
        <Link className="btn" href="/auth">
          Go to Sign in
        </Link>
      </section>
    );
  }

  const categories = await prisma.serviceCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  const where =
    session.role === "provider"
      ? { status: { in: ["open", "negotiating"] as const } }
      : { requesterUserId: session.userId };

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      category: true,
      offers: {
        include: {
          providerProfile: true
        },
        orderBy: { createdAt: "desc" }
      },
      booking: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <RequestsPanel
      categories={categories}
      requests={requests.map((item) => ({
        id: item.id,
        title: item.title,
        requirementText: item.requirementText,
        locationText: item.locationText,
        budgetMin: decimalToNumber(item.budgetMin),
        budgetMax: decimalToNumber(item.budgetMax),
        currency: item.currency,
        needsQuotation: item.needsQuotation,
        needsEbm: item.needsEbm,
        status: item.status,
        category: {
          name: item.category.name
        },
        offers: item.offers.map((offer) => ({
          id: offer.id,
          providerName: offer.providerProfile.businessName,
          quotedPrice: decimalToNumber(offer.quotedPrice) ?? 0,
          currency: offer.currency,
          status: offer.status,
          canIssueQuotation: offer.canIssueQuotation,
          canIssueEbm: offer.canIssueEbm
        })),
        booking: item.booking
          ? {
              id: item.booking.id,
              status: item.booking.status,
              finalPrice: decimalToNumber(item.booking.finalPrice) ?? 0,
              currency: item.booking.currency
            }
          : null
      }))}
      role={session.role}
    />
  );
}
