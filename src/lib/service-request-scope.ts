import { prisma } from "@/lib/prisma";

type SessionScope = {
  userId: string;
  role: string;
};

type ServiceRequestWhereInput = NonNullable<
  Parameters<typeof prisma.serviceRequest.count>[0]
>["where"];

const ACTIVE_REQUEST_TYPES = ["quotation", "ebm"] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getProviderProfileIdForUser(userId: string): Promise<string | null> {
  const access = await loadVendorAccessForUser(userId);
  return access.providerProfileId;
}

export async function loadVendorAccessForUser(
  userId: string,
  email?: string | null
): Promise<{
  dbRole: string | null;
  providerProfileId: string | null;
  roleUpdated: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      email: true,
      providerProfile: {
        select: { id: true }
      }
    }
  });

  if (user?.providerProfile?.id) {
    return {
      dbRole: user.role,
      providerProfileId: user.providerProfile.id,
      roleUpdated: false
    };
  }

  const profileByUserId = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (profileByUserId) {
    return {
      dbRole: user?.role ?? "provider",
      providerProfileId: profileByUserId.id,
      roleUpdated: false
    };
  }

  const lookupEmail = normalizeEmail(email ?? user?.email ?? "");
  if (!lookupEmail) {
    return {
      dbRole: user?.role ?? null,
      providerProfileId: null,
      roleUpdated: false
    };
  }

  const profileByEmail = await prisma.providerProfile.findFirst({
    where: {
      OR: [
        { contactEmail: { equals: lookupEmail, mode: "insensitive" } },
        { representativeEmail: { equals: lookupEmail, mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      userId: true,
      contactEmail: true,
      representativeEmail: true
    }
  });

  if (!profileByEmail) {
    return {
      dbRole: user?.role ?? null,
      providerProfileId: null,
      roleUpdated: false
    };
  }

  if (profileByEmail.userId === userId) {
    return {
      dbRole: user?.role ?? "provider",
      providerProfileId: profileByEmail.id,
      roleUpdated: false
    };
  }

  const owner = await prisma.user.findUnique({
    where: { id: profileByEmail.userId },
    select: { email: true }
  });

  const profileEmails = [profileByEmail.contactEmail, profileByEmail.representativeEmail]
    .filter(Boolean)
    .map((value) => normalizeEmail(value as string));
  const profileEmailMatchesSession = profileEmails.includes(lookupEmail);
  const ownerMissingOrSameEmail = !owner || normalizeEmail(owner.email) === lookupEmail;

  if (profileEmailMatchesSession && ownerMissingOrSameEmail) {
    await prisma.providerProfile.update({
      where: { id: profileByEmail.id },
      data: { userId }
    });

    let roleUpdated = false;
    if (user?.role !== "provider") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "provider" }
      });
      roleUpdated = true;
    }

    return {
      dbRole: "provider",
      providerProfileId: profileByEmail.id,
      roleUpdated
    };
  }

  return {
    dbRole: user?.role ?? null,
    providerProfileId: null,
    roleUpdated: false
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
