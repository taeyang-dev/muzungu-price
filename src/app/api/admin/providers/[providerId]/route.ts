import { NextRequest, NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import { deleteAdminProvider } from "@/lib/admin-providers";
import { requireRole } from "@/lib/guards";

interface RouteParams {
  params: Promise<{ providerId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireRole(_request, ["admin"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  const { providerId } = await params;

  try {
    const deleted = await deleteAdminProvider(providerId);
    return ok({
      deleted: true,
      providerProfileId: providerId,
      businessName: deleted.businessName,
      ownerUserId: deleted.ownerUserId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete provider";
    if (message === "Provider not found") {
      return fail(message, 404, "NOT_FOUND");
    }
    if (message === "Cannot delete an admin vendor profile") {
      return fail(message, 403, "AUTH_002");
    }
    return fail("Failed to delete provider", 500, "ADMIN_500");
  }
}
