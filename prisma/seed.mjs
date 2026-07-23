import bcrypt from "bcryptjs";
import prismaClientPkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const { PrismaClient } = prismaClientPkg;

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db"
  })
});

function bilingual(en, ko) {
  return `${en}|||${ko}`;
}

async function main() {
  const categories = [
    { slug: "language-lessons", name: "Language Lessons" },
    { slug: "events", name: "Event Services" },
    { slug: "electrical", name: "Electrical Services" },
    { slug: "real-estate", name: "Real Estate" },
    { slug: "safari", name: "Safari Tours" },
    { slug: "art-experience", name: "Art Experience" },
    { slug: "furniture", name: "Furniture Making" },
    { slug: "electronics", name: "Electronics Sales" },
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

  const [electricalCategory, eventsCategory, artCategory, furnitureCategory, electronicsCategory] = await Promise.all([
    prisma.serviceCategory.findUnique({ where: { slug: "electrical" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "events" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "art-experience" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "furniture" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "electronics" } })
  ]);

  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      businessName: "Kampala Electric Pro",
      providerType: "company",
      tagline: bilingual(
        "Reliable power and electrical support for NGOs, offices, and homes.",
        "NGO, 사무실, 가정을 위한 신뢰도 높은 전기 솔루션을 제공합니다."
      ),
      city: "Kigali",
      country: "Rwanda",
      bio: bilingual(
        "Certified electrical contractor delivering transparent pricing, rapid response, and documented works for institutional and private clients.",
        "기관/개인 고객에게 투명한 정가, 빠른 대응, 문서화된 작업 결과를 제공하는 인증 전기 시공 업체입니다."
      ),
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
      tagline: bilingual(
        "Reliable power and electrical support for NGOs, offices, and homes.",
        "NGO, 사무실, 가정을 위한 신뢰도 높은 전기 솔루션을 제공합니다."
      ),
      city: "Kigali",
      country: "Rwanda",
      bio: bilingual(
        "Certified electrical contractor delivering transparent pricing, rapid response, and documented works for institutional and private clients.",
        "기관/개인 고객에게 투명한 정가, 빠른 대응, 문서화된 작업 결과를 제공하는 인증 전기 시공 업체입니다."
      ),
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
        title: bilingual("Office Electrical Safety Inspection", "사무실 전기 안전 점검"),
        description: bilingual(
          "Full wiring and load audit with compliance checklist and corrective plan.",
          "배선/부하 전수 점검, 준수 체크리스트, 개선 계획까지 포함합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-generator-backup-service",
        categoryId: electricalCategory.id,
        title: bilingual("Generator & Backup Power Installation", "발전기 및 예비전원 설치"),
        description: bilingual(
          "Generator setup, ATS integration, and backup switch-over testing.",
          "발전기 설치, ATS 연동, 전원 전환 테스트를 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1581091215367-59ab6dcef16f?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-emergency-maintenance-service",
        categoryId: electricalCategory.id,
        title: bilingual("Emergency Repair & Preventive Maintenance", "긴급 수리 및 예방 정비"),
        description: bilingual(
          "Rapid fault tracing plus scheduled maintenance for facilities.",
          "긴급 장애 진단과 정기 예방 정비를 함께 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-event-power-service",
        categoryId: eventsCategory.id,
        title: bilingual("Event Power Setup & Technical Support", "행사 전력 설치 및 기술 지원"),
        description: bilingual(
          "Temporary power distribution, backup planning, and on-site technician support.",
          "임시 전력 분배, 백업 계획, 현장 기술 인력 지원이 포함됩니다."
        ),
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
        inclusions: bilingual("On-site inspection, load analysis, written report", "현장 점검, 부하 분석, 보고서"),
        exclusions: bilingual("Replacement materials", "교체 자재비")
      },
      {
        id: "seed-price-inspection-premium",
        serviceId: "seed-electrical-inspection-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 280000,
        unit: "per_project",
        inclusions: bilingual("Inspection, compliance action plan, follow-up visit", "점검, 개선안, 후속 방문"),
        exclusions: bilingual("Replacement materials", "교체 자재비")
      },
      {
        id: "seed-price-generator-standard",
        serviceId: "seed-generator-backup-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 650000,
        unit: "per_project",
        inclusions: bilingual("Generator setup and test run", "발전기 설치 및 시운전"),
        exclusions: bilingual("Generator unit and accessories", "발전기 본체 및 부속품")
      },
      {
        id: "seed-price-maintenance-basic",
        serviceId: "seed-emergency-maintenance-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 95000,
        unit: "per_day",
        inclusions: bilingual("Fault detection and urgent repair labor", "고장 진단 및 긴급 수리 인건비"),
        exclusions: bilingual("Spare parts", "교체 부품")
      },
      {
        id: "seed-price-event-power-standard",
        serviceId: "seed-event-power-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 420000,
        unit: "per_project",
        inclusions: bilingual(
          "Power setup for one-day event and technician standby",
          "1일 행사 전력 설치 및 기술자 대기"
        ),
        exclusions: bilingual("Large generator rental", "대형 발전기 임대료")
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
          bilingual(
            "Excellent reporting quality and clear quotation. Our finance team approved quickly.",
            "보고서 품질이 뛰어나고 견적이 명확해서 재무팀 승인도 빨랐습니다."
          )
      },
      {
        bookingId: "seed-booking-2",
        reviewerUserId: customers[1].id,
        ratingOverall: 4,
        ratingPriceTransparency: 4,
        ratingTimeliness: 5,
        ratingQuality: 4,
        comment: bilingual(
          "Professional installation team. Great communication and on-time delivery.",
          "설치팀이 매우 전문적이고 소통이 좋아 일정에 맞춰 완료됐습니다."
        )
      },
      {
        bookingId: "seed-booking-3",
        reviewerUserId: customers[2].id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 4,
        ratingQuality: 5,
        comment: bilingual(
          "Quick emergency support and the final bill matched the quoted price.",
          "긴급 대응이 빨랐고 최종 청구 금액도 사전 견적과 일치했습니다."
        )
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

  const sampleReviewerPasswordHash = await bcrypt.hash("reviewer1234", 10);
  const sampleReviewers = await Promise.all([
    prisma.user.upsert({
      where: { email: "events.buyer@aidcenter.org" },
      update: { name: "Grace U.", role: "org_buyer", passwordHash: sampleReviewerPasswordHash },
      create: {
        email: "events.buyer@aidcenter.org",
        name: "Grace U.",
        role: "org_buyer",
        passwordHash: sampleReviewerPasswordHash
      }
    }),
    prisma.user.upsert({
      where: { email: "culture.team@kigalihub.org" },
      update: { name: "Minji K.", role: "customer", passwordHash: sampleReviewerPasswordHash },
      create: {
        email: "culture.team@kigalihub.org",
        name: "Minji K.",
        role: "customer",
        passwordHash: sampleReviewerPasswordHash
      }
    }),
    prisma.user.upsert({
      where: { email: "workspace.procurement@ngo.org" },
      update: { name: "Eric T.", role: "org_buyer", passwordHash: sampleReviewerPasswordHash },
      create: {
        email: "workspace.procurement@ngo.org",
        name: "Eric T.",
        role: "org_buyer",
        passwordHash: sampleReviewerPasswordHash
      }
    }),
    prisma.user.upsert({
      where: { email: "it.ops@embassy-rw.org" },
      update: { name: "Sora L.", role: "org_buyer", passwordHash: sampleReviewerPasswordHash },
      create: {
        email: "it.ops@embassy-rw.org",
        name: "Sora L.",
        role: "org_buyer",
        passwordHash: sampleReviewerPasswordHash
      }
    })
  ]);

  if (eventsCategory) {
    const stagePasswordHash = await bcrypt.hash("stage1234", 10);
    const stageUser = await prisma.user.upsert({
      where: { email: "stage.sound@muzunguprice.rw" },
      update: { name: "Kigali Stage & Sound", role: "provider", passwordHash: stagePasswordHash },
      create: {
        email: "stage.sound@muzunguprice.rw",
        name: "Kigali Stage & Sound",
        role: "provider",
        passwordHash: stagePasswordHash
      }
    });

    const stageProfile = await prisma.providerProfile.upsert({
      where: { userId: stageUser.id },
      update: {
        businessName: "Kigali Stage & Sound",
        providerType: "company",
        tagline: bilingual("Complete stage and live audio solutions.", "무대/음향 토탈 솔루션 전문 업체."),
        city: "Kigali",
        country: "Rwanda",
        bio: bilingual(
          "We design and install stage, sound, and lighting packages for NGO events, conferences, weddings, and public shows.",
          "NGO 행사, 컨퍼런스, 웨딩, 공연을 위한 무대/음향/조명 패키지를 설계하고 설치합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "quotes@stagesound.rw",
        contactPhone: "+250 788 222 111",
        websiteUrl: "https://stagesound.example.com",
        yearsInBusiness: 9
      },
      create: {
        userId: stageUser.id,
        businessName: "Kigali Stage & Sound",
        providerType: "company",
        tagline: bilingual("Complete stage and live audio solutions.", "무대/음향 토탈 솔루션 전문 업체."),
        city: "Kigali",
        country: "Rwanda",
        bio: bilingual(
          "We design and install stage, sound, and lighting packages for NGO events, conferences, weddings, and public shows.",
          "NGO 행사, 컨퍼런스, 웨딩, 공연을 위한 무대/음향/조명 패키지를 설계하고 설치합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "quotes@stagesound.rw",
        contactPhone: "+250 788 222 111",
        websiteUrl: "https://stagesound.example.com",
        yearsInBusiness: 9
      }
    });

    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: stageProfile.id,
          categoryId: eventsCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: stageProfile.id,
        categoryId: eventsCategory.id
      }
    });

    const stageServices = [
      {
        id: "seed-stage-indoor-service",
        title: bilingual("Indoor Conference Stage Setup", "실내 컨퍼런스 무대 설치"),
        description: bilingual(
          "Stage platform, podium, projector screen, and 2 wireless microphones for business events.",
          "기업/기관 행사용 무대, 단상, 스크린, 무선 마이크 2개를 설치합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-stage-outdoor-service",
        title: bilingual("Outdoor Concert Stage + Line Array", "야외 콘서트 무대 + 라인어레이 음향"),
        description: bilingual(
          "Large outdoor stage truss, line-array speakers, monitor wedges, and live mixing desk.",
          "대형 야외 트러스 무대, 라인어레이 스피커, 모니터 스피커, 라이브 믹싱 데스크를 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-stage-wedding-service",
        title: bilingual("Wedding Stage Decor + Audio", "웨딩 무대 장식 + 음향 세팅"),
        description: bilingual(
          "Decor stage backdrop, ceremony audio kit, and MC microphone package.",
          "웨딩 백드롭 장식, 본식 음향 세트, 사회자 마이크 패키지를 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80"
      }
    ];

    for (const service of stageServices) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {
          providerProfileId: stageProfile.id,
          categoryId: eventsCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        },
        create: {
          id: service.id,
          providerProfileId: stageProfile.id,
          categoryId: eventsCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        }
      });
    }

    const stagePriceCards = [
      {
        id: "seed-stage-indoor-basic",
        serviceId: "seed-stage-indoor-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 420000,
        unit: "per_project",
        inclusions: bilingual("Small stage + 2 mics + operator", "소형 무대 + 마이크 2개 + 오퍼레이터"),
        exclusions: bilingual("Lighting upgrades", "조명 업그레이드")
      },
      {
        id: "seed-stage-indoor-premium",
        serviceId: "seed-stage-indoor-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 780000,
        unit: "per_project",
        inclusions: bilingual("Full conference stage + AV support", "풀 컨퍼런스 무대 + AV 기술지원"),
        exclusions: bilingual("Venue rental", "행사장 대관비")
      },
      {
        id: "seed-stage-outdoor-standard",
        serviceId: "seed-stage-outdoor-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 1200000,
        unit: "per_project",
        inclusions: bilingual("Outdoor stage + line array + mix desk", "야외 무대 + 라인어레이 + 믹싱 데스크"),
        exclusions: bilingual("Crowd barriers", "안전 펜스")
      },
      {
        id: "seed-stage-outdoor-premium",
        serviceId: "seed-stage-outdoor-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 1900000,
        unit: "per_project",
        inclusions: bilingual("Large festival setup with backup power", "백업전원 포함 대형 페스티벌 세팅"),
        exclusions: bilingual("Artist transport", "아티스트 이동비")
      },
      {
        id: "seed-stage-wedding-standard",
        serviceId: "seed-stage-wedding-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 560000,
        unit: "per_project",
        inclusions: bilingual("Stage decor + ceremony sound kit", "무대 장식 + 본식 음향 세트"),
        exclusions: bilingual("Floral premium materials", "프리미엄 생화 자재")
      }
    ];

    for (const card of stagePriceCards) {
      await prisma.servicePriceCard.upsert({
        where: { id: card.id },
        update: card,
        create: card
      });
    }

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: stageProfile.id },
      update: { quotationAvailable: true, ebmAvailable: true, quotationLeadTimeHours: 12 },
      create: {
        providerProfileId: stageProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 12
      }
    });

    await prisma.verificationCase.upsert({
      where: { id: "seed-stage-verification-approved" },
      update: {
        providerProfileId: stageProfile.id,
        status: "approved",
        score: 88,
        level: "pro_verified",
        reviewedAt: new Date(),
        notes: "Venue installation quality and safety documentation verified."
      },
      create: {
        id: "seed-stage-verification-approved",
        providerProfileId: stageProfile.id,
        status: "approved",
        score: 88,
        level: "pro_verified",
        reviewedAt: new Date(),
        notes: "Venue installation quality and safety documentation verified."
      }
    });

    await prisma.serviceRequest.upsert({
      where: { id: "seed-request-stage-conference" },
      update: {
        requesterUserId: sampleReviewers[0].id,
        categoryId: eventsCategory.id,
        title: "UN workshop stage and sound setup",
        requirementText: "Need stage, LED, and speech audio for 250 participants.",
        locationText: "Kigali Convention district",
        budgetMin: 900000,
        budgetMax: 2100000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      },
      create: {
        id: "seed-request-stage-conference",
        requesterUserId: sampleReviewers[0].id,
        categoryId: eventsCategory.id,
        title: "UN workshop stage and sound setup",
        requirementText: "Need stage, LED, and speech audio for 250 participants.",
        locationText: "Kigali Convention district",
        budgetMin: 900000,
        budgetMax: 2100000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      }
    });

    await prisma.booking.upsert({
      where: { id: "seed-booking-stage-1" },
      update: {
        requestId: "seed-request-stage-conference",
        providerProfileId: stageProfile.id,
        customerUserId: sampleReviewers[0].id,
        finalPrice: 1380000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-18T10:00:00.000Z")
      },
      create: {
        id: "seed-booking-stage-1",
        requestId: "seed-request-stage-conference",
        providerProfileId: stageProfile.id,
        customerUserId: sampleReviewers[0].id,
        finalPrice: 1380000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-18T10:00:00.000Z")
      }
    });

    await prisma.review.upsert({
      where: { bookingId: "seed-booking-stage-1" },
      update: {
        reviewerUserId: sampleReviewers[0].id,
        providerProfileId: stageProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 4,
        ratingQuality: 5,
        comment: bilingual(
          "Very clear stage-type pricing and smooth setup. The sound check was excellent.",
          "무대 종류별 가격이 명확했고 설치가 매우 원활했습니다. 사운드 체크도 훌륭했어요."
        )
      },
      create: {
        bookingId: "seed-booking-stage-1",
        reviewerUserId: sampleReviewers[0].id,
        providerProfileId: stageProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 4,
        ratingQuality: 5,
        comment: bilingual(
          "Very clear stage-type pricing and smooth setup. The sound check was excellent.",
          "무대 종류별 가격이 명확했고 설치가 매우 원활했습니다. 사운드 체크도 훌륭했어요."
        )
      }
    });
  }

  if (artCategory) {
    const artPasswordHash = await bcrypt.hash("art1234", 10);
    const artUser = await prisma.user.upsert({
      where: { email: "gallery@muzunguprice.rw" },
      update: { name: "Imigongo Art Gallery", role: "provider", passwordHash: artPasswordHash },
      create: {
        email: "gallery@muzunguprice.rw",
        name: "Imigongo Art Gallery",
        role: "provider",
        passwordHash: artPasswordHash
      }
    });

    const artProfile = await prisma.providerProfile.upsert({
      where: { userId: artUser.id },
      update: {
        businessName: "Imigongo Art Gallery",
        providerType: "company",
        tagline: bilingual("Local art experience in one day.", "하루 만에 즐기는 르완다 아트 체험."),
        city: "Kigali",
        country: "Rwanda",
        bio: bilingual(
          "Hands-on gallery experiences, painting workshops, and curated cultural sessions for teams and visitors.",
          "팀/방문객을 위한 체험형 갤러리 클래스, 페인팅 워크숍, 문화 큐레이션 세션을 운영합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "hello@imigongo-gallery.rw",
        contactPhone: "+250 788 555 222",
        websiteUrl: "https://imigongo-gallery.example.com",
        yearsInBusiness: 6
      },
      create: {
        userId: artUser.id,
        businessName: "Imigongo Art Gallery",
        providerType: "company",
        tagline: bilingual("Local art experience in one day.", "하루 만에 즐기는 르완다 아트 체험."),
        city: "Kigali",
        country: "Rwanda",
        bio: bilingual(
          "Hands-on gallery experiences, painting workshops, and curated cultural sessions for teams and visitors.",
          "팀/방문객을 위한 체험형 갤러리 클래스, 페인팅 워크숍, 문화 큐레이션 세션을 운영합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "hello@imigongo-gallery.rw",
        contactPhone: "+250 788 555 222",
        websiteUrl: "https://imigongo-gallery.example.com",
        yearsInBusiness: 6
      }
    });

    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: artProfile.id,
          categoryId: artCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: artProfile.id,
        categoryId: artCategory.id
      }
    });

    await prisma.service.upsert({
      where: { id: "seed-art-one-day-service" },
      update: {
        providerProfileId: artProfile.id,
        categoryId: artCategory.id,
        title: bilingual("One-day Imigongo Art Workshop", "원데이 이미공고 아트 워크숍"),
        description: bilingual(
          "A 4-hour guided art class with materials, tea break, and gallery tour.",
          "4시간 지도형 아트 클래스(재료 포함), 티 브레이크, 갤러리 투어 포함."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80"
      },
      create: {
        id: "seed-art-one-day-service",
        providerProfileId: artProfile.id,
        categoryId: artCategory.id,
        title: bilingual("One-day Imigongo Art Workshop", "원데이 이미공고 아트 워크숍"),
        description: bilingual(
          "A 4-hour guided art class with materials, tea break, and gallery tour.",
          "4시간 지도형 아트 클래스(재료 포함), 티 브레이크, 갤러리 투어 포함."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80"
      }
    });

    await prisma.servicePriceCard.upsert({
      where: { id: "seed-art-one-day-price" },
      update: {
        serviceId: "seed-art-one-day-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 90000,
        unit: "per_day",
        inclusions: bilingual("Instructor, paint kit, tea break", "강사, 페인팅 키트, 티 브레이크"),
        exclusions: bilingual("Hotel transfer", "호텔 픽업/드롭")
      },
      create: {
        id: "seed-art-one-day-price",
        serviceId: "seed-art-one-day-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 90000,
        unit: "per_day",
        inclusions: bilingual("Instructor, paint kit, tea break", "강사, 페인팅 키트, 티 브레이크"),
        exclusions: bilingual("Hotel transfer", "호텔 픽업/드롭")
      }
    });

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: artProfile.id },
      update: { quotationAvailable: true, ebmAvailable: false, quotationLeadTimeHours: 8 },
      create: {
        providerProfileId: artProfile.id,
        quotationAvailable: true,
        ebmAvailable: false,
        quotationLeadTimeHours: 8
      }
    });

    await prisma.verificationCase.upsert({
      where: { id: "seed-art-verification-approved" },
      update: {
        providerProfileId: artProfile.id,
        status: "approved",
        score: 84,
        level: "verified",
        reviewedAt: new Date(),
        notes: "Business license and customer references verified."
      },
      create: {
        id: "seed-art-verification-approved",
        providerProfileId: artProfile.id,
        status: "approved",
        score: 84,
        level: "verified",
        reviewedAt: new Date(),
        notes: "Business license and customer references verified."
      }
    });

    await prisma.serviceRequest.upsert({
      where: { id: "seed-request-art-workshop" },
      update: {
        requesterUserId: sampleReviewers[1].id,
        categoryId: artCategory.id,
        title: "1-day cultural art workshop for visiting team",
        requirementText: "Need beginner-friendly class for 10 people.",
        locationText: "Kimironko",
        budgetMin: 700000,
        budgetMax: 1100000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: false,
        status: "completed"
      },
      create: {
        id: "seed-request-art-workshop",
        requesterUserId: sampleReviewers[1].id,
        categoryId: artCategory.id,
        title: "1-day cultural art workshop for visiting team",
        requirementText: "Need beginner-friendly class for 10 people.",
        locationText: "Kimironko",
        budgetMin: 700000,
        budgetMax: 1100000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: false,
        status: "completed"
      }
    });

    await prisma.booking.upsert({
      where: { id: "seed-booking-art-1" },
      update: {
        requestId: "seed-request-art-workshop",
        providerProfileId: artProfile.id,
        customerUserId: sampleReviewers[1].id,
        finalPrice: 860000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-15T11:00:00.000Z")
      },
      create: {
        id: "seed-booking-art-1",
        requestId: "seed-request-art-workshop",
        providerProfileId: artProfile.id,
        customerUserId: sampleReviewers[1].id,
        finalPrice: 860000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-15T11:00:00.000Z")
      }
    });

    await prisma.review.upsert({
      where: { bookingId: "seed-booking-art-1" },
      update: {
        reviewerUserId: sampleReviewers[1].id,
        providerProfileId: artProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 4,
        comment: bilingual(
          "Beautiful one-day program and clear package details before payment.",
          "원데이 프로그램이 정말 좋았고 결제 전 패키지 구성 안내가 명확했습니다."
        )
      },
      create: {
        bookingId: "seed-booking-art-1",
        reviewerUserId: sampleReviewers[1].id,
        providerProfileId: artProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 4,
        comment: bilingual(
          "Beautiful one-day program and clear package details before payment.",
          "원데이 프로그램이 정말 좋았고 결제 전 패키지 구성 안내가 명확했습니다."
        )
      }
    });
  }

  if (furnitureCategory) {
    const furniturePasswordHash = await bcrypt.hash("furniture1234", 10);
    const furnitureUser = await prisma.user.upsert({
      where: { email: "craft.furniture@muzunguprice.rw" },
      update: { name: "Kivu Craft Furniture", role: "provider", passwordHash: furniturePasswordHash },
      create: {
        email: "craft.furniture@muzunguprice.rw",
        name: "Kivu Craft Furniture",
        role: "provider",
        passwordHash: furniturePasswordHash
      }
    });

    const furnitureProfile = await prisma.providerProfile.upsert({
      where: { userId: furnitureUser.id },
      update: {
        businessName: "Kivu Craft Furniture",
        providerType: "company",
        tagline: bilingual("Custom chairs and desks for offices.", "사무공간 맞춤형 의자·책상 제작."),
        city: "Huye",
        country: "Rwanda",
        bio: bilingual(
          "We produce durable office desks, classroom chairs, and custom wood furniture with fixed quotations.",
          "고정 견적으로 사무용 책상, 강의실 의자, 맞춤 원목 가구를 제작합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "sales@kivucraft.rw",
        contactPhone: "+250 788 901 112",
        websiteUrl: "https://kivucraft.example.com",
        yearsInBusiness: 12
      },
      create: {
        userId: furnitureUser.id,
        businessName: "Kivu Craft Furniture",
        providerType: "company",
        tagline: bilingual("Custom chairs and desks for offices.", "사무공간 맞춤형 의자·책상 제작."),
        city: "Huye",
        country: "Rwanda",
        bio: bilingual(
          "We produce durable office desks, classroom chairs, and custom wood furniture with fixed quotations.",
          "고정 견적으로 사무용 책상, 강의실 의자, 맞춤 원목 가구를 제작합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "sales@kivucraft.rw",
        contactPhone: "+250 788 901 112",
        websiteUrl: "https://kivucraft.example.com",
        yearsInBusiness: 12
      }
    });

    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: furnitureProfile.id,
          categoryId: furnitureCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: furnitureProfile.id,
        categoryId: furnitureCategory.id
      }
    });

    await prisma.service.upsert({
      where: { id: "seed-furniture-desk-service" },
      update: {
        providerProfileId: furnitureProfile.id,
        categoryId: furnitureCategory.id,
        title: bilingual("Office Desk & Chair Package", "사무용 책상·의자 패키지"),
        description: bilingual(
          "Custom production for office desks and ergonomic chairs by quantity and finish.",
          "수량/마감 옵션에 따라 사무용 책상·인체공학 의자를 맞춤 제작합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1538688423619-a81d3f23454b?auto=format&fit=crop&w=1200&q=80"
      },
      create: {
        id: "seed-furniture-desk-service",
        providerProfileId: furnitureProfile.id,
        categoryId: furnitureCategory.id,
        title: bilingual("Office Desk & Chair Package", "사무용 책상·의자 패키지"),
        description: bilingual(
          "Custom production for office desks and ergonomic chairs by quantity and finish.",
          "수량/마감 옵션에 따라 사무용 책상·인체공학 의자를 맞춤 제작합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1538688423619-a81d3f23454b?auto=format&fit=crop&w=1200&q=80"
      }
    });

    await prisma.servicePriceCard.upsert({
      where: { id: "seed-furniture-package-standard" },
      update: {
        serviceId: "seed-furniture-desk-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 1480000,
        unit: "per_project",
        inclusions: bilingual("20 desks + 20 chairs + delivery in Kigali", "책상 20개 + 의자 20개 + 키갈리 배송"),
        exclusions: bilingual("Assembly outside Kigali", "키갈리 외 지역 조립비")
      },
      create: {
        id: "seed-furniture-package-standard",
        serviceId: "seed-furniture-desk-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 1480000,
        unit: "per_project",
        inclusions: bilingual("20 desks + 20 chairs + delivery in Kigali", "책상 20개 + 의자 20개 + 키갈리 배송"),
        exclusions: bilingual("Assembly outside Kigali", "키갈리 외 지역 조립비")
      }
    });

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: furnitureProfile.id },
      update: { quotationAvailable: true, ebmAvailable: true, quotationLeadTimeHours: 18 },
      create: {
        providerProfileId: furnitureProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 18
      }
    });

    await prisma.verificationCase.upsert({
      where: { id: "seed-furniture-verification-approved" },
      update: {
        providerProfileId: furnitureProfile.id,
        status: "approved",
        score: 86,
        level: "verified",
        reviewedAt: new Date(),
        notes: "Workshop visit and material quality checks completed."
      },
      create: {
        id: "seed-furniture-verification-approved",
        providerProfileId: furnitureProfile.id,
        status: "approved",
        score: 86,
        level: "verified",
        reviewedAt: new Date(),
        notes: "Workshop visit and material quality checks completed."
      }
    });

    await prisma.serviceRequest.upsert({
      where: { id: "seed-request-furniture-office" },
      update: {
        requesterUserId: sampleReviewers[2].id,
        categoryId: furnitureCategory.id,
        title: "New office desks and chairs",
        requirementText: "Need package for 20 people workspace.",
        locationText: "Kigali Heights",
        budgetMin: 1200000,
        budgetMax: 1800000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      },
      create: {
        id: "seed-request-furniture-office",
        requesterUserId: sampleReviewers[2].id,
        categoryId: furnitureCategory.id,
        title: "New office desks and chairs",
        requirementText: "Need package for 20 people workspace.",
        locationText: "Kigali Heights",
        budgetMin: 1200000,
        budgetMax: 1800000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      }
    });

    await prisma.booking.upsert({
      where: { id: "seed-booking-furniture-1" },
      update: {
        requestId: "seed-request-furniture-office",
        providerProfileId: furnitureProfile.id,
        customerUserId: sampleReviewers[2].id,
        finalPrice: 1520000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-12T08:00:00.000Z")
      },
      create: {
        id: "seed-booking-furniture-1",
        requestId: "seed-request-furniture-office",
        providerProfileId: furnitureProfile.id,
        customerUserId: sampleReviewers[2].id,
        finalPrice: 1520000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-12T08:00:00.000Z")
      }
    });

    await prisma.review.upsert({
      where: { bookingId: "seed-booking-furniture-1" },
      update: {
        reviewerUserId: sampleReviewers[2].id,
        providerProfileId: furnitureProfile.id,
        ratingOverall: 4,
        ratingPriceTransparency: 5,
        ratingTimeliness: 4,
        ratingQuality: 4,
        comment: bilingual(
          "Desk and chair quality is solid, and the quotation breakdown was very transparent.",
          "책상과 의자 품질이 좋고 견적서 항목이 매우 투명하게 제시되었습니다."
        )
      },
      create: {
        bookingId: "seed-booking-furniture-1",
        reviewerUserId: sampleReviewers[2].id,
        providerProfileId: furnitureProfile.id,
        ratingOverall: 4,
        ratingPriceTransparency: 5,
        ratingTimeliness: 4,
        ratingQuality: 4,
        comment: bilingual(
          "Desk and chair quality is solid, and the quotation breakdown was very transparent.",
          "책상과 의자 품질이 좋고 견적서 항목이 매우 투명하게 제시되었습니다."
        )
      }
    });
  }

  if (electronicsCategory) {
    const electronicsPasswordHash = await bcrypt.hash("electronics1234", 10);
    const electronicsUser = await prisma.user.upsert({
      where: { email: "tech.market@muzunguprice.rw" },
      update: { name: "Kigali Tech Market", role: "provider", passwordHash: electronicsPasswordHash },
      create: {
        email: "tech.market@muzunguprice.rw",
        name: "Kigali Tech Market",
        role: "provider",
        passwordHash: electronicsPasswordHash
      }
    });

    const electronicsProfile = await prisma.providerProfile.upsert({
      where: { userId: electronicsUser.id },
      update: {
        businessName: "Kigali Tech Market",
        providerType: "company",
        tagline: bilingual("Trusted electronics vendor for teams.", "팀 단위 납품에 강한 전자제품 공급업체."),
        city: "Kigali",
        country: "Rwanda",
        bio: bilingual(
          "We supply laptops, monitors, projectors, and office accessories with fixed package pricing.",
          "노트북, 모니터, 프로젝터, 사무용 액세서리를 패키지 정가로 공급합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "sales@kigalitechmarket.rw",
        contactPhone: "+250 788 340 340",
        websiteUrl: "https://kigalitechmarket.example.com",
        yearsInBusiness: 8
      },
      create: {
        userId: electronicsUser.id,
        businessName: "Kigali Tech Market",
        providerType: "company",
        tagline: bilingual("Trusted electronics vendor for teams.", "팀 단위 납품에 강한 전자제품 공급업체."),
        city: "Kigali",
        country: "Rwanda",
        bio: bilingual(
          "We supply laptops, monitors, projectors, and office accessories with fixed package pricing.",
          "노트북, 모니터, 프로젝터, 사무용 액세서리를 패키지 정가로 공급합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "sales@kigalitechmarket.rw",
        contactPhone: "+250 788 340 340",
        websiteUrl: "https://kigalitechmarket.example.com",
        yearsInBusiness: 8
      }
    });

    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: electronicsProfile.id,
          categoryId: electronicsCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: electronicsProfile.id,
        categoryId: electronicsCategory.id
      }
    });

    await prisma.service.upsert({
      where: { id: "seed-electronics-office-bundle-service" },
      update: {
        providerProfileId: electronicsProfile.id,
        categoryId: electronicsCategory.id,
        title: bilingual("Office Electronics Starter Bundle", "사무실 전자제품 스타터 번들"),
        description: bilingual(
          "10 laptops, 10 monitors, and networking starter kit with setup guidance.",
          "노트북 10대, 모니터 10대, 네트워크 스타터 키트와 설치 가이드를 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
      },
      create: {
        id: "seed-electronics-office-bundle-service",
        providerProfileId: electronicsProfile.id,
        categoryId: electronicsCategory.id,
        title: bilingual("Office Electronics Starter Bundle", "사무실 전자제품 스타터 번들"),
        description: bilingual(
          "10 laptops, 10 monitors, and networking starter kit with setup guidance.",
          "노트북 10대, 모니터 10대, 네트워크 스타터 키트와 설치 가이드를 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
      }
    });

    await prisma.servicePriceCard.upsert({
      where: { id: "seed-electronics-office-bundle-price" },
      update: {
        serviceId: "seed-electronics-office-bundle-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 6900000,
        unit: "per_project",
        inclusions: bilingual(
          "10 laptops, 10 monitors, keyboard/mouse sets, delivery",
          "노트북 10대, 모니터 10대, 키보드/마우스 세트, 배송 포함"
        ),
        exclusions: bilingual("Extended warranty contracts", "추가 연장보증 계약")
      },
      create: {
        id: "seed-electronics-office-bundle-price",
        serviceId: "seed-electronics-office-bundle-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 6900000,
        unit: "per_project",
        inclusions: bilingual(
          "10 laptops, 10 monitors, keyboard/mouse sets, delivery",
          "노트북 10대, 모니터 10대, 키보드/마우스 세트, 배송 포함"
        ),
        exclusions: bilingual("Extended warranty contracts", "추가 연장보증 계약")
      }
    });

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: electronicsProfile.id },
      update: { quotationAvailable: true, ebmAvailable: true, quotationLeadTimeHours: 6 },
      create: {
        providerProfileId: electronicsProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 6
      }
    });

    await prisma.verificationCase.upsert({
      where: { id: "seed-electronics-verification-approved" },
      update: {
        providerProfileId: electronicsProfile.id,
        status: "approved",
        score: 92,
        level: "premium_verified",
        reviewedAt: new Date(),
        notes: "Supply chain checks and serial tracking verified."
      },
      create: {
        id: "seed-electronics-verification-approved",
        providerProfileId: electronicsProfile.id,
        status: "approved",
        score: 92,
        level: "premium_verified",
        reviewedAt: new Date(),
        notes: "Supply chain checks and serial tracking verified."
      }
    });

    await prisma.serviceRequest.upsert({
      where: { id: "seed-request-electronics-office" },
      update: {
        requesterUserId: sampleReviewers[3].id,
        categoryId: electronicsCategory.id,
        title: "Embassy office laptop refresh",
        requirementText: "Need 10 reliable laptops and 10 monitors with clear invoice.",
        locationText: "Kiyovu",
        budgetMin: 5500000,
        budgetMax: 7500000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      },
      create: {
        id: "seed-request-electronics-office",
        requesterUserId: sampleReviewers[3].id,
        categoryId: electronicsCategory.id,
        title: "Embassy office laptop refresh",
        requirementText: "Need 10 reliable laptops and 10 monitors with clear invoice.",
        locationText: "Kiyovu",
        budgetMin: 5500000,
        budgetMax: 7500000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      }
    });

    await prisma.booking.upsert({
      where: { id: "seed-booking-electronics-1" },
      update: {
        requestId: "seed-request-electronics-office",
        providerProfileId: electronicsProfile.id,
        customerUserId: sampleReviewers[3].id,
        finalPrice: 7020000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-10T09:30:00.000Z")
      },
      create: {
        id: "seed-booking-electronics-1",
        requestId: "seed-request-electronics-office",
        providerProfileId: electronicsProfile.id,
        customerUserId: sampleReviewers[3].id,
        finalPrice: 7020000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-10T09:30:00.000Z")
      }
    });

    await prisma.review.upsert({
      where: { bookingId: "seed-booking-electronics-1" },
      update: {
        reviewerUserId: sampleReviewers[3].id,
        providerProfileId: electronicsProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 5,
        comment: bilingual(
          "The quotation and EBM documents were perfect for procurement and all devices matched specs.",
          "견적서/EBM 문서가 예산 집행에 정확했고 납품 장비도 사양과 완벽히 일치했습니다."
        )
      },
      create: {
        bookingId: "seed-booking-electronics-1",
        reviewerUserId: sampleReviewers[3].id,
        providerProfileId: electronicsProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 5,
        comment: bilingual(
          "The quotation and EBM documents were perfect for procurement and all devices matched specs.",
          "견적서/EBM 문서가 예산 집행에 정확했고 납품 장비도 사양과 완벽히 일치했습니다."
        )
      }
    });
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
