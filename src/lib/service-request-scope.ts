import { prisma } from "@/lib/prisma";

type SessionScope = {
  userId: string;
  role: string;
};

type ServiceRequestWhereInput = NonNullable<
  Parameters<typeof prisma.serviceRequest.count>[0]
>["where"];

export async function getProviderProfileIdForUser(userId: string): Promise<string | null> {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  return profile?.id ?? null;
}

export async function buildServiceRequestScopeWhere(
  session: SessionScope
): Promise<ServiceRequestWhereInput | null> {
  if (session.role === "provider") {
    const providerProfileId = await getProviderProfileIdForUser(session.userId);
    if (!providerProfileId) {
      return null;
    }

    return {
      providerProfileId,
      OR: [{ status: "open" }, { status: "negotiating" }]
    };
  }

  return {
    requesterUserId: session.userId,
    status: { notIn: ["cancelled", "completed"] }
  };
}
