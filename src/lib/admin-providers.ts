import { prisma } from "@/lib/prisma";

export interface AdminProviderListItem {
  id: string;
  businessName: string;
  city: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  owner: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  verificationStatus: string | null;
  serviceCount: number;
}

export async function listAdminProviders(): Promise<AdminProviderListItem[]> {
  const providers = await prisma.providerProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      verificationCases: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true }
      },
      _count: {
        select: { services: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return providers.map((provider) => ({
    id: provider.id,
    businessName: provider.businessName,
    city: provider.city,
    country: provider.country,
    isActive: provider.isActive,
    createdAt: provider.createdAt.toISOString(),
    owner: {
      userId: provider.user.id,
      name: provider.user.name,
      email: provider.user.email,
      role: provider.user.role
    },
    verificationStatus: provider.verificationCases[0]?.status ?? null,
    serviceCount: provider._count.services
  }));
}

export async function deleteAdminProvider(providerProfileId: string): Promise<{
  businessName: string;
  ownerUserId: string;
}> {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: {
      id: true,
      businessName: true,
      userId: true,
      user: {
        select: { role: true }
      }
    }
  });

  if (!provider) {
    throw new Error("Provider not found");
  }

  if (provider.user.role === "admin") {
    throw new Error("Cannot delete an admin vendor profile");
  }

  await prisma.$transaction(async (tx) => {
    await tx.vendorChatMessage.deleteMany({
      where: { providerProfileId }
    });
    await tx.vendorChatReadCursor.deleteMany({
      where: { providerProfileId }
    });
    await tx.providerProfile.delete({
      where: { id: providerProfileId }
    });
    await tx.user.update({
      where: { id: provider.userId },
      data: { role: "customer" }
    });
  });

  return {
    businessName: provider.businessName,
    ownerUserId: provider.userId
  };
}
