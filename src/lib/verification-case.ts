import { prisma } from "@/lib/prisma";

export async function ensureDraftVerificationCase(providerProfileId: string) {
  const active = await prisma.verificationCase.findFirst({
    where: {
      providerProfileId,
      status: { in: ["draft", "pending", "on_hold"] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (active) {
    return active;
  }

  return prisma.verificationCase.create({
    data: {
      providerProfileId,
      status: "draft"
    }
  });
}
