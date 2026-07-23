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

  const [electricalCategory, eventsCategory, artCategory, furnitureCategory, electronicsCategory, safariCategory] =
    await Promise.all([
    prisma.serviceCategory.findUnique({ where: { slug: "electrical" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "events" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "art-experience" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "furniture" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "electronics" } }),
    prisma.serviceCategory.findUnique({ where: { slug: "safari" } })
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
      ebmNotes: "Issued after payment confirmation.",
      vendorTinNumber: "TIN-EP-450129",
      paymentTermsCsv: "prepaid,postpaid,deposit,other",
      paymentMethodsCsv: "bank_transfer,momo,cash",
      momoAccountName: "Kampala Electric Pro Ltd",
      momoNumber: "+250788123456",
      bankName: "Bank of Kigali",
      bankAccountName: "Kampala Electric Pro Ltd",
      bankAccountNumber: "1100-2299-5577",
      bankSwiftCode: "BKRWRWRW"
    },
    create: {
      providerProfileId: providerProfile.id,
      quotationAvailable: true,
      ebmAvailable: true,
      quotationLeadTimeHours: 24,
      ebmNotes: "Issued after payment confirmation.",
      vendorTinNumber: "TIN-EP-450129",
      paymentTermsCsv: "prepaid,postpaid,deposit,other",
      paymentMethodsCsv: "bank_transfer,momo,cash",
      momoAccountName: "Kampala Electric Pro Ltd",
      momoNumber: "+250788123456",
      bankName: "Bank of Kigali",
      bankAccountName: "Kampala Electric Pro Ltd",
      bankAccountNumber: "1100-2299-5577",
      bankSwiftCode: "BKRWRWRW"
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
      update: {
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 12,
        vendorTinNumber: "TIN-STAGE-22001",
        paymentTermsCsv: "prepaid,deposit,postpaid",
        paymentMethodsCsv: "bank_transfer,momo",
        momoAccountName: "Kigali Stage & Sound",
        momoNumber: "+250788222111",
        bankName: "I&M Bank Rwanda",
        bankAccountName: "Kigali Stage & Sound",
        bankAccountNumber: "3388-2000-1234",
        bankSwiftCode: "IMRWRWRW"
      },
      create: {
        providerProfileId: stageProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 12,
        vendorTinNumber: "TIN-STAGE-22001",
        paymentTermsCsv: "prepaid,deposit,postpaid",
        paymentMethodsCsv: "bank_transfer,momo",
        momoAccountName: "Kigali Stage & Sound",
        momoNumber: "+250788222111",
        bankName: "I&M Bank Rwanda",
        bankAccountName: "Kigali Stage & Sound",
        bankAccountNumber: "3388-2000-1234",
        bankSwiftCode: "IMRWRWRW"
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
      update: {
        quotationAvailable: true,
        ebmAvailable: false,
        quotationLeadTimeHours: 8,
        vendorTinNumber: "TIN-ART-90021",
        paymentTermsCsv: "prepaid,postpaid,other",
        paymentMethodsCsv: "bank_transfer,momo,cash",
        momoAccountName: "Imigongo Art Gallery",
        momoNumber: "+250788555222",
        bankName: "Equity Bank Rwanda",
        bankAccountName: "Imigongo Art Gallery",
        bankAccountNumber: "7722-1199-3322",
        bankSwiftCode: "EQBLRWRW"
      },
      create: {
        providerProfileId: artProfile.id,
        quotationAvailable: true,
        ebmAvailable: false,
        quotationLeadTimeHours: 8,
        vendorTinNumber: "TIN-ART-90021",
        paymentTermsCsv: "prepaid,postpaid,other",
        paymentMethodsCsv: "bank_transfer,momo,cash",
        momoAccountName: "Imigongo Art Gallery",
        momoNumber: "+250788555222",
        bankName: "Equity Bank Rwanda",
        bankAccountName: "Imigongo Art Gallery",
        bankAccountNumber: "7722-1199-3322",
        bankSwiftCode: "EQBLRWRW"
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

    // Reset catalog items for this provider so repeated seeding keeps one clean product lineup.
    await prisma.servicePriceCard.deleteMany({
      where: {
        service: {
          providerProfileId: furnitureProfile.id
        }
      }
    });
    await prisma.service.deleteMany({
      where: {
        providerProfileId: furnitureProfile.id
      }
    });

    const furnitureServices = [
      {
        id: "seed-furniture-chair-service",
        title: bilingual("Ergonomic Task Chair (Type A / Type B)", "인체공학 사무의자 (A형 / B형)"),
        description: bilingual(
          "Type-based chair production for offices and schools. Minimum order varies by model and finishing.",
          "사무실/학교용 의자를 타입별로 제작합니다. 모델과 마감에 따라 최소 주문 수량이 달라집니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-furniture-desk-service",
        title: bilingual("Office Desk (120cm / 160cm / L-shape)", "사무용 책상 (120cm / 160cm / ㄱ자형)"),
        description: bilingual(
          "Desk options by size and frame type, suitable for team offices and training rooms.",
          "사이즈/프레임 타입별 책상 옵션을 제공하며 팀 오피스와 교육장에 적합합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-furniture-custom-service",
        title: bilingual("Custom Office Furniture Build", "주문 제작 사무 가구"),
        description: bilingual(
          "Custom shelving, reception desks, and mixed furniture sets for specific floor plans.",
          "공간 도면에 맞춘 맞춤 선반, 리셉션 데스크, 혼합 가구 세트를 제작합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1616627452124-5862042bd2fb?auto=format&fit=crop&w=1200&q=80"
      }
    ];

    for (const service of furnitureServices) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {
          providerProfileId: furnitureProfile.id,
          categoryId: furnitureCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        },
        create: {
          id: service.id,
          providerProfileId: furnitureProfile.id,
          categoryId: furnitureCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        }
      });
    }

    const furniturePriceCards = [
      {
        id: "seed-furniture-chair-basic",
        serviceId: "seed-furniture-chair-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 520000,
        unit: "per_project",
        inclusions: bilingual(
          "Minimum order: 15 chairs (Type A); fabric finish and Kigali delivery included",
          "최소 주문: A형 의자 15개; 기본 패브릭 마감과 키갈리 배송 포함"
        ),
        exclusions: bilingual("Assembly outside Kigali", "키갈리 외 지역 설치비")
      },
      {
        id: "seed-furniture-chair-premium",
        serviceId: "seed-furniture-chair-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 980000,
        unit: "per_project",
        inclusions: bilingual(
          "MOQ: 20 chairs (Type B ergonomic); reinforced frame and anti-scratch finish",
          "최소 주문: B형 인체공학 의자 20개; 보강 프레임/스크래치 방지 마감 포함"
        ),
        exclusions: bilingual("Custom logo stitching", "로고 자수 커스텀")
      },
      {
        id: "seed-furniture-desk-standard",
        serviceId: "seed-furniture-desk-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 760000,
        unit: "per_project",
        inclusions: bilingual(
          "Minimum order: 10 desks (120cm); cable-hole finish included",
          "최소 주문: 120cm 책상 10개; 케이블 홀 가공 포함"
        ),
        exclusions: bilingual("Metal drawer set upgrade", "금속 서랍장 업그레이드")
      },
      {
        id: "seed-furniture-desk-premium",
        serviceId: "seed-furniture-desk-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 1460000,
        unit: "per_project",
        inclusions: bilingual(
          "MOQ: 8 desks (160cm/L-shape); laminate top and frame reinforcement",
          "최소 주문: 160cm/ㄱ자형 책상 8개; 라미네이트 상판/프레임 보강 포함"
        ),
        exclusions: bilingual("Electrical socket integration", "전원 소켓 매립")
      },
      {
        id: "seed-furniture-custom-start",
        serviceId: "seed-furniture-custom-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 450000,
        unit: "per_project",
        inclusions: bilingual(
          "Minimum order: 1 custom set; starting estimate for simple custom build",
          "최소 주문: 맞춤 1세트; 단순 주문 제작 기준 시작 견적"
        ),
        exclusions: bilingual("Premium hardwood materials", "고급 원목 자재")
      },
      {
        id: "seed-furniture-custom-premium",
        serviceId: "seed-furniture-custom-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 1800000,
        unit: "per_project",
        inclusions: bilingual(
          "MOQ: 1 project; full custom production with 3D mockup",
          "최소 주문: 프로젝트 1건; 3D 목업 포함 풀 커스텀 제작"
        ),
        exclusions: bilingual("Architectural redesign service", "건축 구조 재설계")
      }
    ];

    for (const card of furniturePriceCards) {
      await prisma.servicePriceCard.upsert({
        where: { id: card.id },
        update: card,
        create: card
      });
    }

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: furnitureProfile.id },
      update: {
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 18,
        vendorTinNumber: "TIN-FUR-77812",
        paymentTermsCsv: "deposit,postpaid,other",
        paymentMethodsCsv: "bank_transfer,momo",
        momoAccountName: "Kivu Craft Furniture",
        momoNumber: "+250788901112",
        bankName: "Cogebanque",
        bankAccountName: "Kivu Craft Furniture",
        bankAccountNumber: "8844-5566-1133",
        bankSwiftCode: "COGBRWRW"
      },
      create: {
        providerProfileId: furnitureProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 18,
        vendorTinNumber: "TIN-FUR-77812",
        paymentTermsCsv: "deposit,postpaid,other",
        paymentMethodsCsv: "bank_transfer,momo",
        momoAccountName: "Kivu Craft Furniture",
        momoNumber: "+250788901112",
        bankName: "Cogebanque",
        bankAccountName: "Kivu Craft Furniture",
        bankAccountNumber: "8844-5566-1133",
        bankSwiftCode: "COGBRWRW"
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
        title: "Office chairs/desks plus custom reception furniture",
        requirementText:
          "Need 20 ergonomic chairs, 10 desks, and one custom reception unit with clear MOQ-based pricing.",
        locationText: "Kigali Heights",
        budgetMin: 1200000,
        budgetMax: 2500000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      },
      create: {
        id: "seed-request-furniture-office",
        requesterUserId: sampleReviewers[2].id,
        categoryId: furnitureCategory.id,
        title: "Office chairs/desks plus custom reception furniture",
        requirementText:
          "Need 20 ergonomic chairs, 10 desks, and one custom reception unit with clear MOQ-based pricing.",
        locationText: "Kigali Heights",
        budgetMin: 1200000,
        budgetMax: 2500000,
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
        finalPrice: 2140000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-12T08:00:00.000Z")
      },
      create: {
        id: "seed-booking-furniture-1",
        requestId: "seed-request-furniture-office",
        providerProfileId: furnitureProfile.id,
        customerUserId: sampleReviewers[2].id,
        finalPrice: 2140000,
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
          "The chair/desk type prices were clear, and custom-build starting costs were explained well.",
          "의자/책상 타입별 가격이 명확했고 주문제작 시작가 설명도 이해하기 쉬웠습니다."
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
          "The chair/desk type prices were clear, and custom-build starting costs were explained well.",
          "의자/책상 타입별 가격이 명확했고 주문제작 시작가 설명도 이해하기 쉬웠습니다."
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

    await prisma.servicePriceCard.deleteMany({
      where: {
        service: {
          providerProfileId: electronicsProfile.id
        }
      }
    });
    await prisma.service.deleteMany({
      where: {
        providerProfileId: electronicsProfile.id
      }
    });

    const electronicsServices = [
      {
        id: "seed-electronics-laptop-service",
        title: bilingual("Business Laptop 14-inch", "비즈니스 노트북 14인치"),
        description: bilingual(
          "Intel i5 class laptops for office productivity teams with warranty options.",
          "사무 생산성 업무용 인텔 i5급 노트북 제품입니다. 보증 옵션 선택 가능."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-electronics-monitor-service",
        title: bilingual("27-inch IPS Monitor", "27인치 IPS 모니터"),
        description: bilingual(
          "FHD monitors for desk setups, training rooms, and operations centers.",
          "사무 데스크/교육장/운영센터용 FHD 모니터 제품입니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-electronics-printer-service",
        title: bilingual("Office Printer & Scanner Combo", "사무용 프린터·스캐너 콤보"),
        description: bilingual(
          "Reliable print/scan unit for administrative and procurement documents.",
          "행정/조달 문서 작업에 적합한 프린트·스캔 복합기 제품입니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-electronics-projector-service",
        title: bilingual("Wireless Meeting Projector", "무선 회의용 프로젝터"),
        description: bilingual(
          "Projector package with wireless casting support for boardrooms and trainings.",
          "회의실/교육용 무선 캐스팅 지원 프로젝터 패키지입니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-electronics-custom-sourcing-service",
        title: bilingual("Custom Device Sourcing", "맞춤형 전자기기 소싱"),
        description: bilingual(
          "Need a specific brand/spec? We source and quote custom electronics requests.",
          "특정 브랜드/사양이 필요하면 맞춤 소싱으로 별도 견적을 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
      }
    ];

    for (const service of electronicsServices) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {
          providerProfileId: electronicsProfile.id,
          categoryId: electronicsCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        },
        create: {
          id: service.id,
          providerProfileId: electronicsProfile.id,
          categoryId: electronicsCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        }
      });
    }

    const electronicsPriceCards = [
      {
        id: "seed-electronics-laptop-standard",
        serviceId: "seed-electronics-laptop-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 5400000,
        unit: "per_project",
        inclusions: bilingual(
          "MOQ: 10 laptops; setup check and Kigali delivery included",
          "최소 주문: 노트북 10대; 초기 세팅 점검 및 키갈리 배송 포함"
        ),
        exclusions: bilingual("Extended accidental damage warranty", "파손보증 연장")
      },
      {
        id: "seed-electronics-monitor-standard",
        serviceId: "seed-electronics-monitor-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 1680000,
        unit: "per_project",
        inclusions: bilingual(
          "Minimum order: 10 monitors; HDMI cables included",
          "최소 주문: 모니터 10대; HDMI 케이블 포함"
        ),
        exclusions: bilingual("Adjustable arm mounts", "모니터 암 마운트")
      },
      {
        id: "seed-electronics-printer-basic",
        serviceId: "seed-electronics-printer-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 860000,
        unit: "per_project",
        inclusions: bilingual(
          "MOQ: 2 units; basic toner starter pack included",
          "최소 주문: 2대; 기본 토너 스타터팩 포함"
        ),
        exclusions: bilingual("Additional toner packs", "추가 토너")
      },
      {
        id: "seed-electronics-projector-standard",
        serviceId: "seed-electronics-projector-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 1220000,
        unit: "per_project",
        inclusions: bilingual(
          "Minimum order: 2 units; HDMI + wireless dongle included",
          "최소 주문: 2대; HDMI + 무선 동글 포함"
        ),
        exclusions: bilingual("Ceiling mount installation", "천장 설치 공사")
      },
      {
        id: "seed-electronics-custom-basic",
        serviceId: "seed-electronics-custom-sourcing-service",
        tier: "basic",
        currency: "RWF",
        basePrice: 350000,
        unit: "per_project",
        inclusions: bilingual(
          "Minimum order: 1 request; custom sourcing starts from this amount",
          "최소 주문: 요청 1건; 맞춤 소싱 시작 견적"
        ),
        exclusions: bilingual("Urgent import logistics", "긴급 수입 물류비")
      }
    ];

    for (const card of electronicsPriceCards) {
      await prisma.servicePriceCard.upsert({
        where: { id: card.id },
        update: card,
        create: card
      });
    }

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: electronicsProfile.id },
      update: {
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 6,
        vendorTinNumber: "TIN-TECH-55220",
        paymentTermsCsv: "prepaid,postpaid,deposit,other",
        paymentMethodsCsv: "bank_transfer,momo,card",
        momoAccountName: "Kigali Tech Market",
        momoNumber: "+250788340340",
        bankName: "KCB Rwanda",
        bankAccountName: "Kigali Tech Market",
        bankAccountNumber: "9900-1122-4444",
        bankSwiftCode: "KCBLRWRW"
      },
      create: {
        providerProfileId: electronicsProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 6,
        vendorTinNumber: "TIN-TECH-55220",
        paymentTermsCsv: "prepaid,postpaid,deposit,other",
        paymentMethodsCsv: "bank_transfer,momo,card",
        momoAccountName: "Kigali Tech Market",
        momoNumber: "+250788340340",
        bankName: "KCB Rwanda",
        bankAccountName: "Kigali Tech Market",
        bankAccountNumber: "9900-1122-4444",
        bankSwiftCode: "KCBLRWRW"
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
        title: "Embassy electronics purchase by product",
        requirementText: "Need laptops, monitors, and printers priced separately with clear MOQ.",
        locationText: "Kiyovu",
        budgetMin: 5500000,
        budgetMax: 9000000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      },
      create: {
        id: "seed-request-electronics-office",
        requesterUserId: sampleReviewers[3].id,
        categoryId: electronicsCategory.id,
        title: "Embassy electronics purchase by product",
        requirementText: "Need laptops, monitors, and printers priced separately with clear MOQ.",
        locationText: "Kiyovu",
        budgetMin: 5500000,
        budgetMax: 9000000,
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
        finalPrice: 7680000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-10T09:30:00.000Z")
      },
      create: {
        id: "seed-booking-electronics-1",
        requestId: "seed-request-electronics-office",
        providerProfileId: electronicsProfile.id,
        customerUserId: sampleReviewers[3].id,
        finalPrice: 7680000,
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

  if (safariCategory) {
    const safariPasswordHash = await bcrypt.hash("safari1234", 10);
    const safariUser = await prisma.user.upsert({
      where: { email: "virunga.safari@muzunguprice.rw" },
      update: { name: "Virunga & Kivu Travel", role: "provider", passwordHash: safariPasswordHash },
      create: {
        email: "virunga.safari@muzunguprice.rw",
        name: "Virunga & Kivu Travel",
        role: "provider",
        passwordHash: safariPasswordHash
      }
    });

    const safariProfile = await prisma.providerProfile.upsert({
      where: { userId: safariUser.id },
      update: {
        businessName: "Virunga & Kivu Travel",
        providerType: "company",
        tagline: bilingual("Trusted local travel operator for safari and lake tours.", "사파리와 호수 투어를 전문으로 하는 신뢰도 높은 현지 여행사."),
        city: "Rubavu",
        country: "Rwanda",
        bio: bilingual(
          "We run curated Rwanda experiences including Akagera safari, Kivu lake routes, and cross-district cultural trips for individuals and organizations.",
          "아카게라 사파리, 키부 호수 코스, 지역 연계 문화 투어까지 개인/기관 맞춤형 르완다 현지 여행 서비스를 제공합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "bookings@virungakivu.rw",
        contactPhone: "+250 788 700 321",
        websiteUrl: "https://virungakivu.example.com",
        yearsInBusiness: 10
      },
      create: {
        userId: safariUser.id,
        businessName: "Virunga & Kivu Travel",
        providerType: "company",
        tagline: bilingual("Trusted local travel operator for safari and lake tours.", "사파리와 호수 투어를 전문으로 하는 신뢰도 높은 현지 여행사."),
        city: "Rubavu",
        country: "Rwanda",
        bio: bilingual(
          "We run curated Rwanda experiences including Akagera safari, Kivu lake routes, and cross-district cultural trips for individuals and organizations.",
          "아카게라 사파리, 키부 호수 코스, 지역 연계 문화 투어까지 개인/기관 맞춤형 르완다 현지 여행 서비스를 제공합니다."
        ),
        logoUrl:
          "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=320&q=80",
        coverImageUrl:
          "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
        contactEmail: "bookings@virungakivu.rw",
        contactPhone: "+250 788 700 321",
        websiteUrl: "https://virungakivu.example.com",
        yearsInBusiness: 10
      }
    });

    await prisma.providerCategory.upsert({
      where: {
        providerProfileId_categoryId: {
          providerProfileId: safariProfile.id,
          categoryId: safariCategory.id
        }
      },
      update: {},
      create: {
        providerProfileId: safariProfile.id,
        categoryId: safariCategory.id
      }
    });

    await prisma.servicePriceCard.deleteMany({
      where: {
        service: {
          providerProfileId: safariProfile.id
        }
      }
    });
    await prisma.service.deleteMany({
      where: {
        providerProfileId: safariProfile.id
      }
    });

    const safariServices = [
      {
        id: "seed-safari-akagera-service",
        title: bilingual("Akagera Full-day Safari Tour", "아카게라 국립공원 1일 사파리 투어"),
        description: bilingual(
          "One-day game drive with professional guide, 4x4 vehicle, and park logistics support.",
          "전문 가이드, 4x4 차량, 입장 동선 지원이 포함된 1일 게임드라이브 코스입니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1549366021-9f761d040a94?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-safari-kivu-lake-service",
        title: bilingual("Lake Kivu Scenic Boat Tour", "키부 호수 경관 보트 투어"),
        description: bilingual(
          "Half-day lake cruise with safety crew, local guide, and optional coffee-island stop.",
          "안전 요원, 현지 가이드, 커피 아일랜드 선택 방문이 포함된 반나절 보트 코스입니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "seed-safari-gorilla-logistics-service",
        title: bilingual("Volcanoes Gorilla Trek Logistics", "비룽가 고릴라 트레킹 로지스틱스"),
        description: bilingual(
          "Transport, permit support coordination, and bilingual guide support for trekking days.",
          "트레킹 일정의 이동, 퍼밋 준비 지원, 이중언어 가이드 동행을 제공합니다."
        ),
        imageUrl:
          "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80"
      }
    ];

    for (const service of safariServices) {
      await prisma.service.upsert({
        where: { id: service.id },
        update: {
          providerProfileId: safariProfile.id,
          categoryId: safariCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        },
        create: {
          id: service.id,
          providerProfileId: safariProfile.id,
          categoryId: safariCategory.id,
          title: service.title,
          description: service.description,
          imageUrl: service.imageUrl
        }
      });
    }

    const safariPriceCards = [
      {
        id: "seed-safari-akagera-standard",
        serviceId: "seed-safari-akagera-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 380000,
        unit: "per_day",
        inclusions: bilingual(
          "Minimum order: 2 guests; guide + transport + park routing support",
          "최소 주문: 2인; 가이드 + 이동차량 + 공원 동선 지원 포함"
        ),
        exclusions: bilingual("Park entrance permits", "공원 입장 퍼밋")
      },
      {
        id: "seed-safari-kivu-standard",
        serviceId: "seed-safari-kivu-lake-service",
        tier: "standard",
        currency: "RWF",
        basePrice: 240000,
        unit: "per_day",
        inclusions: bilingual(
          "Minimum order: 3 guests; boat rental + life jackets + local guide",
          "최소 주문: 3인; 보트 대여 + 구명조끼 + 현지 가이드 포함"
        ),
        exclusions: bilingual("Private island meals", "섬 내 식사")
      },
      {
        id: "seed-safari-gorilla-premium",
        serviceId: "seed-safari-gorilla-logistics-service",
        tier: "premium",
        currency: "RWF",
        basePrice: 720000,
        unit: "per_project",
        inclusions: bilingual(
          "MOQ: 1 trip package; permit prep assistance + transport + bilingual guide",
          "최소 주문: 1회 패키지; 퍼밋 준비 지원 + 이동 + 이중언어 가이드 포함"
        ),
        exclusions: bilingual("Gorilla permit fee", "고릴라 퍼밋 비용")
      }
    ];

    for (const card of safariPriceCards) {
      await prisma.servicePriceCard.upsert({
        where: { id: card.id },
        update: card,
        create: card
      });
    }

    await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: safariProfile.id },
      update: {
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 10,
        vendorTinNumber: "TIN-SAFARI-34311",
        paymentTermsCsv: "prepaid,deposit,postpaid",
        paymentMethodsCsv: "bank_transfer,momo,card",
        momoAccountName: "Virunga & Kivu Travel",
        momoNumber: "+250788700321",
        bankName: "BK",
        bankAccountName: "Virunga & Kivu Travel",
        bankAccountNumber: "3300-6788-9922",
        bankSwiftCode: "BKRWRWRW"
      },
      create: {
        providerProfileId: safariProfile.id,
        quotationAvailable: true,
        ebmAvailable: true,
        quotationLeadTimeHours: 10,
        vendorTinNumber: "TIN-SAFARI-34311",
        paymentTermsCsv: "prepaid,deposit,postpaid",
        paymentMethodsCsv: "bank_transfer,momo,card",
        momoAccountName: "Virunga & Kivu Travel",
        momoNumber: "+250788700321",
        bankName: "BK",
        bankAccountName: "Virunga & Kivu Travel",
        bankAccountNumber: "3300-6788-9922",
        bankSwiftCode: "BKRWRWRW"
      }
    });

    await prisma.verificationCase.upsert({
      where: { id: "seed-safari-verification-approved" },
      update: {
        providerProfileId: safariProfile.id,
        status: "approved",
        score: 89,
        level: "pro_verified",
        reviewedAt: new Date(),
        notes: "Tour licenses, insurance, and guide compliance verified."
      },
      create: {
        id: "seed-safari-verification-approved",
        providerProfileId: safariProfile.id,
        status: "approved",
        score: 89,
        level: "pro_verified",
        reviewedAt: new Date(),
        notes: "Tour licenses, insurance, and guide compliance verified."
      }
    });

    await prisma.serviceRequest.upsert({
      where: { id: "seed-request-safari-kivu" },
      update: {
        requesterUserId: sampleReviewers[1].id,
        categoryId: safariCategory.id,
        title: "Kivu lake and safari combo for visiting team",
        requirementText: "Need 2-day itinerary with Kivu boat tour and one safari day.",
        locationText: "Rubavu / Akagera",
        budgetMin: 650000,
        budgetMax: 1200000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      },
      create: {
        id: "seed-request-safari-kivu",
        requesterUserId: sampleReviewers[1].id,
        categoryId: safariCategory.id,
        title: "Kivu lake and safari combo for visiting team",
        requirementText: "Need 2-day itinerary with Kivu boat tour and one safari day.",
        locationText: "Rubavu / Akagera",
        budgetMin: 650000,
        budgetMax: 1200000,
        currency: "RWF",
        needsQuotation: true,
        needsEbm: true,
        status: "completed"
      }
    });

    await prisma.booking.upsert({
      where: { id: "seed-booking-safari-1" },
      update: {
        requestId: "seed-request-safari-kivu",
        providerProfileId: safariProfile.id,
        customerUserId: sampleReviewers[1].id,
        finalPrice: 980000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-09T08:00:00.000Z")
      },
      create: {
        id: "seed-booking-safari-1",
        requestId: "seed-request-safari-kivu",
        providerProfileId: safariProfile.id,
        customerUserId: sampleReviewers[1].id,
        finalPrice: 980000,
        currency: "RWF",
        status: "completed",
        completedAt: new Date("2026-07-09T08:00:00.000Z")
      }
    });

    await prisma.review.upsert({
      where: { bookingId: "seed-booking-safari-1" },
      update: {
        reviewerUserId: sampleReviewers[1].id,
        providerProfileId: safariProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 5,
        comment: bilingual(
          "Great safari planning and smooth Lake Kivu route. Quotation and EBM were issued exactly as requested.",
          "사파리 일정 기획이 훌륭했고 키부 호수 코스도 매우 매끄러웠습니다. 견적서와 EBM도 요청대로 정확히 발행됐습니다."
        )
      },
      create: {
        bookingId: "seed-booking-safari-1",
        reviewerUserId: sampleReviewers[1].id,
        providerProfileId: safariProfile.id,
        ratingOverall: 5,
        ratingPriceTransparency: 5,
        ratingTimeliness: 5,
        ratingQuality: 5,
        comment: bilingual(
          "Great safari planning and smooth Lake Kivu route. Quotation and EBM were issued exactly as requested.",
          "사파리 일정 기획이 훌륭했고 키부 호수 코스도 매우 매끄러웠습니다. 견적서와 EBM도 요청대로 정확히 발행됐습니다."
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
