import { prisma } from "@/lib/prisma";

type SessionScope = {
  userId: string;
  role: string;
};

type ServiceRequestWhereInput = NonNullable<
  Parameters<typeof prisma.serviceRequest.count>[0]
>["where"];

const ACTIVE_REQUEST_TYPES = ["quotation", "ebm"] as const;

export async function getProviderProfileIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      providerProfile: {
        select: { id: true }
      }
    }
  });
  return user?.providerProfile?.id ?? null;
}

export async function loadVendorAccessForUser(userId: string): Promise<{
  dbRole: string | null;
  providerProfileId: string | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      providerProfile: {
        select: { id: true }
      }
    }
  });

  return {
    dbRole: user?.role ?? null,
    providerProfileId: user?.providerProfile?.id ?? null
  };
}

export function buildSentRequestsWhere(userId: string): ServiceRequestWhereInput {
  return {
    requesterUserId: userId,
    requestType: { in: [...ACTIVE_REQUEST_TYPES] },
    status: { notIn: ["cancelled"] }
  };
}

export function buildReceivedRequestsWhere(providerProfileId: string): ServiceRequestWhereInput {
  return {
    providerProfileId,
    requestType: { in: [...ACTIVE_REQUEST_TYPES] },
    status: { notIn: ["cancelled"] }
  };
}

export async function buildServiceRequestScopeWhere(
  session: SessionScope,
  box: "sent" | "received"
): Promise<ServiceRequestWhereInput | null> {
  if (box === "sent") {
    return buildSentRequestsWhere(session.userId);
  }

  const providerProfileId = await getProviderProfileIdForUser(session.userId);
  if (!providerProfileId) {
    return null;
  }

  return buildReceivedRequestsWhere(providerProfileId);
}

export async function countRequestsByType(
  where: ServiceRequestWhereInput
): Promise<{ total: number; quotation: number; ebm: number }> {
  const [total, quotation, ebm] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.count({ where: { ...where, requestType: "quotation" } }),
    prisma.serviceRequest.count({ where: { ...where, requestType: "ebm" } })
  ]);

  return { total, quotation, ebm };
}
