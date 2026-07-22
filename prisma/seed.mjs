import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { slug: "language-lessons", name: "Language Lessons" },
    { slug: "events", name: "Event Services" },
    { slug: "electrical", name: "Electrical Services" },
    { slug: "real-estate", name: "Real Estate" },
    { slug: "safari", name: "Safari Tours" }
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

  const electricalCategory = await prisma.serviceCategory.findUnique({
    where: { slug: "electrical" }
  });

  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      businessName: "Kampala Electric Pro",
      providerType: "company",
      city: "Kampala",
      country: "Uganda",
      bio: "Certified electrical contractor for offices and compounds."
    },
    create: {
      userId: providerUser.id,
      businessName: "Kampala Electric Pro",
      providerType: "company",
      city: "Kampala",
      country: "Uganda",
      bio: "Certified electrical contractor for offices and compounds."
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

    const service = await prisma.service.upsert({
      where: {
        id: "seed-electrical-service"
      },
      update: {
        title: "Office Safety Inspection",
        description: "Electrical inspection with written safety report."
      },
      create: {
        id: "seed-electrical-service",
        providerProfileId: providerProfile.id,
        categoryId: electricalCategory.id,
        title: "Office Safety Inspection",
        description: "Electrical inspection with written safety report."
      }
    });

    await prisma.servicePriceCard.upsert({
      where: { id: "seed-electrical-price-standard" },
      update: {
        tier: "standard",
        currency: "USD",
        basePrice: 120,
        unit: "per_project",
        inclusions: "2-floor inspection + PDF report",
        exclusions: "Replacement materials"
      },
      create: {
        id: "seed-electrical-price-standard",
        serviceId: service.id,
        tier: "standard",
        currency: "USD",
        basePrice: 120,
        unit: "per_project",
        inclusions: "2-floor inspection + PDF report",
        exclusions: "Replacement materials"
      }
    });
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

  await prisma.verificationCase.create({
    data: {
      providerProfileId: providerProfile.id,
      status: "approved",
      score: 85,
      level: "pro_verified",
      reviewedAt: new Date(),
      notes: "Identity, license, and price transparency verified."
    }
  });
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
