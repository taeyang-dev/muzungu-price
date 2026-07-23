import bcrypt from "bcryptjs";
import prismaClientPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const { PrismaClient } = prismaClientPkg;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db"
  })
});

async function main() {
  const categories = [
    { slug: "language-lessons", name: "Language Lessons" },
    { slug: "events", name: "Event Services" },
    { slug: "electrical", name: "Electrical Services" },
    { slug: "real-estate", name: "Real Estate" },
    { slug: "safari", name: "Safari Tours" },
    { slug: "other", name: "Other Services" }
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category
    });
  }

  const adminPasswordHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@muzunguprice.com" },
    update: { name: "Muzungu Admin", role: "admin", passwordHash: adminPasswordHash },
    create: {
      email: "admin@muzunguprice.com",
      name: "Muzungu Admin",
      role: "admin",
      passwordHash: adminPasswordHash
    }
  });

  const providerPasswordHash = await bcrypt.hash("provider1234", 10);
  const providerUser = await prisma.user.upsert({
    where: { email: "electric.pro@example.com" },
    update: { name: "Kampala Electric Pro", role: "provider", passwordHash: providerPasswordHash },
    create: {
      email: "electric.pro@example.com",
      name: "Kampala Electric Pro",
      role: "provider",
      passwordHash: providerPasswordHash
    }
  });

  const [electricalCategory, eventsCategory] = await Promise.all([
    prisma.serviceCategory.findUnique({ where: { slug: "electrical" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "events" } })
  ]);

  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      businessName: "Kampala Electric Pro",
      providerType: "company",
      tagline: "Reliable power and electrical support for NGOs, offices, and homes.",
      city: "Kigali",
      country: "Rwanda",
      bio: "Certified electrical contractor delivering transparent pricing, rapid response, and documented works for institutional and private clients.",
      logoUrl:
        "https://images.unsplash.com/photo-1611273426858-450f47f08e8a?auto=format&fit=crop&w=320&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1400&q=80",
      contactEmail: "quotes@kampalaelectricpro.rw",
      contactPhone: "+250 788 123 456",
      websiteUrl: "https://kampalaelectricpro.example.com",
      yearsInBusiness: 11
    },
    create: {
      userId: providerUser.id,
      businessName: "Kampala Electric Pro",
      providerType: "company",
      tagline: "Reliable power and electrical support for NGOs, offices, and homes.",
      city: "Kigali",
      country: "Rwanda",
      bio: "Certified electrical contractor delivering transparent pricing, rapid response, and documented works for institutional and private clients.",
      logoUrl:
        "https://images.unsplash.com/photo-1611273426858-450f47f08e8a?auto=format&fit=crop&w=320&q=80",
      coverImageUrl:
        "https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1400&q=80",
      contactEmail: "quotes@kampalaelectricpro.rw",
      contactPhone: "+250 788 123 456",
      websiteUrl: "https://kampalaelectricpro.example.com",
      yearsInBusiness: 11
    }
  });

  if (electricalCategory) {
    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: providerProfile.id,
          categoryId: electricalCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: providerProfile.id,
        categoryId: electricalCategory.id
      }
    });
  }

  if (eventsCategory) {
    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: providerProfile.id,
          categoryId: eventsCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: providerProfile.id,
        categoryId: eventsCategory.id
      }
    });
  }

  if (electricalCategory && eventsCategory) {
    const services = [
      {
        id: "seed-electrical-inspection-service",
        categoryId: electricalCategory.id,
        title: "Office Electrical Safety Inspection",
        description: "Full wiring and load audit with compliance checklist and corrective plan.",
        imageUrl:
          "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-generator-backup-service",
        categoryId: electricalCategory.id,
        title: "Generator & Backup Power Installation",
        description: "Generator setup, ATS integration, and backup switch-over testing.",
        imageUrl:
          "https://images.unsplash.com/photo-1581091215367-59ab6dcef16f?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-emergency-maintenance-service",
        categoryId: electricalCategory.id,
        title: "Emergency Repair & Preventive Maintenance",
        description: "Rapid fault tracing plus scheduled maintenance for facilities.",
        imageUrl:
          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-event-power-service",
        categoryId: eventsCategory.id,
        title: "Event Power Setup & Technical Support",
        description: "Temporary power distribution, backup planning, and on-site technician support.",
        imageUrl:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80"
      }
    ];

    for (const service of services) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {
          categoryId: service.categoryId,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        },
        create: {
          id: service.id,
          providerProfileId: providerProfile.id,
          categoryId: service.categoryId,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        }
      });
    }

    const priceCards = [
      {
        id: "seed-price-inspection-standard",
        serviceId: "seed-electrical-inspection-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 185000,
        unit: "per_project",
        inclusions: "On-site inspection, load analysis, written report",
        exclusions: "Replacement materials"
      },
      {
        id: "seed-price-inspection-premium",
        serviceId: "seed-electrical-inspection-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 280000,
        unit: "per_project",
        inclusions: "Inspection, compliance action plan, follow-up visit",
        exclusions: "Replacement materials"
      },
      {
        id: "seed-price-generator-standard",
        serviceId: "seed-generator-backup-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 650000,
        unit: "per_project",
        inclusions: "Generator setup and test run",
        exclusions: "Generator unit and accessories"
      },
      {
        id: "seed-price-maintenance-basic",
        serviceId: "seed-emergency-maintenance-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 95000,
        unit: "per_day",
        inclusions: "Fault detection and urgent repair labor",
        exclusions: "Spare parts"
      },
      {
        id: "seed-price-event-power-standard",
        serviceId: "seed-event-power-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 420000,
        unit: "per_project",
        inclusions: "Power setup for one-day event and technician standby",
        exclusions: "Large generator rental"
      }
    ];

    for (const card of priceCards) {
      await prisma.servicePriceCard.upsert({
        where: { id: card.id },
        update: {
          tier: card.tier,
          currency: card.currency,
          basePrice: card.basePrice,
          unit: card.unit,
          inclusions: card.inclusions,
          exclusions: card.exclusions
        },
        create: card
      });
    }
  }

  await prisma.providerBillingCapability.upsert({
    where: { providerProfileId: providerProfile.id },
    update: {
      quotationAvailable: true,
      ebmAvailable: true,
      quotationLeadTimeHours: 24,
      ebmNotes: "Issued after payment confirmation."
    },
    create: {
      providerProfileId: providerProfile.id,
      quotationAvailable: true,
      ebmAvailable: true,
      quotationLeadTimeHours: 24,
      ebmNotes: "Issued after payment confirmation."
    }
  });

  await prisma.verificationCase.upsert({
    where: { id: "seed-verification-approved" },
    update: {
      providerProfileId: providerProfile.id,
      status: "approved",
      score: 90,
      level: "premium_verified",
      reviewedAt: new Date(),
      notes: "Identity, license, pricing, and documentation checks completed."
    },
    create: {
      id: "seed-verification-approved",
      providerProfileId: providerProfile.id,
      status: "approved",
      score: 90,
      level: "premium_verified",
      reviewedAt: new Date(),
      notes: "Identity, license, pricing, and documentation checks completed."
    }
  });

  if (electricalCategory) {
    const customerPasswordHash = await bcrypt.hash("customer1234", 10);
    const customers = await Promise.all([
      prisma.user.upsert({
        where: { email: "procurement@ngo-rwanda.org" },
        update: { name: "Amina N.", role: "org_buyer", passwordHash: customerPasswordHash },
        create: {
          email: "procurement@ngo-rwanda.org",
          name: "Amina N.",
          role: "org_buyer",
          passwordHash: customerPasswordHash
        }
      }),
      prisma.user.upsert({
        where: { email: "ops.manager@healthhub.org" },
        update: { name: "David K.", role: "customer", passwordHash: customerPasswordHash },
        create: {
          email: "ops.manager@healthhub.org",
          name: "David K.",
          role: "customer",
          passwordHash: customerPasswordHash
        }
      }),
      prisma.user.upsert({
        where: { email: "homeowner.kigali@example.com" },
        update: { name: "Claudine M.", role: "customer", passwordHash: customerPasswordHash },
        create: {
          email: "homeowner.kigali@example.com",
          name: "Claudine M.",
          role: "customer",
          passwordHash: customerPasswordHash
        }
      })
    ]);

    const requestTemplates = [
      {
        id: "seed-request-electrical-audit",
        requesterUserId: customers[0].id,
        title: "School campus electrical safety audit",
        requirementText: "Need full inspection for 3 buildings and recommendations.",
        locationText: "Kigali",
        budgetMin: 150000,
        budgetMax: 300000
      },
      {
        id: "seed-request-generator-setup",
        requesterUserId: customers[1].id,
        title: "Backup generator installation",
        requirementText: "Install and test 40kVA generator with transfer switch.",
        locationText: "Gasabo",
        budgetMin: 500000,
        budgetMax: 900000
      },
      {
        id: "seed-request-maintenance-visit",
        requesterUserId: customers[2].id,
        title: "Emergency wiring maintenance",
        requirementText: "Immediate troubleshooting for repeated tripping issue.",
        locationText: "Nyarutarama",
        budgetMin: 80000,
        budgetMax: 180000
      }
    ];

    for (const requestItem of requestTemplates) {
      await prisma.serviceRequest.upsert({
        where: { id: requestItem.id },
        update: {
          requesterUserId: requestItem.requesterUserId,
          categoryId: electricalCategory.id,
          title: requestItem.title,
          requirementText: requestItem.requirementText,
          locationText: requestItem.locationText,
          budgetMin: requestItem.budgetMin,
          budgetMax: requestItem.budgetMax,
          currency: "RWF",
          needsQuotation: true,
          needsEbm: true,
          status: "completed"
        },
        create: {
          id: requestItem.id,
          requesterUserId: requestItem.requesterUserId,
          categoryId: electricalCategory.id,
          title: requestItem.title,
          requirementText: requestItem.requirementText,
          locationText: requestItem.locationText,
          budgetMin: requestItem.budgetMin,
          budgetMax: requestItem.budgetMax,
          currency: "RWF",
          needsQuotation: true,
          needsEbm: true,
          status: "completed"
        }
      });
    }

    const bookings = [
      {
        id: "seed-booking-1",
        requestId: "seed-request-electrical-audit",
        customerUserId: customers[0].id,
        finalPrice: 210000
      },
      {
        id: "seed-booking-2",
        requestId: "seed-request-generator-setup",
        customerUserId: customers[1].id,
        finalPrice: 690000
      },
      {
        id: "seed-booking-3",
        requestId: "seed-request-maintenance-visit",
        customerUserId: customers[2].id,
        finalPrice: 120000
      }
    ];

    for (const booking of bookings) {
      await prisma.booking.upsert({
        where: { id: booking.id },
        update: {
          requestId: booking.requestId,
          providerProfileId: providerProfile.id,
          customerUserId: booking.customerUserId,
          finalPrice: booking.finalPrice,
          currency: "RWF",
          status: "completed",
          completedAt: new Date("2026-07-20T09:00:00.000Z")
        },
        create: {
          id: booking.id,
          requestId: booking.requestId,
          providerProfileId: providerProfile.id,
          customerUserId: booking.customerUserId,
          finalPrice: booking.finalPrice,
          currency: "RWF",
          status: "completed",
          completedAt: new Date("2026-07-20T09:00:00.000Z")
        }
      });
    }

    const reviews = [
      {
        bookingId: "seed-booking-1",
        reviewerUserId: customers[0].id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 5,
        comment:
          "Excellent reporting quality and clear quotation. Our finance team approved quickly."
      },
      {
        bookingId: "seed-booking-2",
        reviewerUserId: customers[1].id,
        ratingOverall: 4,
        ratingPriceTransparency: 4,
        ratingTimeliness: 5,
        ratingQuality: 4,
        comment: "Professional installation team. Great communication and on-time delivery."
      },
      {
        bookingId: "seed-booking-3",
        reviewerUserId: customers[2].id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 4,
        ratingQuality: 5,
        comment: "Quick emergency support and the final bill matched the quoted price."
      }
    ];

    for (const review of reviews) {
      await prisma.review.upsert({
        where: { bookingId: review.bookingId },
        update: {
          reviewerUserId: review.reviewerUserId,
          providerProfileId: providerProfile.id,
          ratingOverall: review.ratingOverall,
          ratingPriceTransparency: review.ratingPriceTransparency,
          ratingTimeliness: review.ratingTimeliness,
          ratingQuality: review.ratingQuality,
          comment: review.comment
        },
        create: {
          bookingId: review.bookingId,
          reviewerUserId: review.reviewerUserId,
          providerProfileId: providerProfile.id,
          ratingOverall: review.ratingOverall,
          ratingPriceTransparency: review.ratingPriceTransparency,
          ratingTimeliness: review.ratingTimeliness,
          ratingQuality: review.ratingQuality,
          comment: review.comment
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
