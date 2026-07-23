import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  quotationAvailable: z.boolean(),
  ebmAvailable: z.boolean(),
  quotationLeadTimeHours: z.coerce.number().int().positive().optional(),
  ebmNotes: z.string().optional(),
  vendorTinNumber: z.string().optional(),
  paymentTerms: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  momoAccountName: z.string().optional(),
  momoNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankSwiftCode: z.string().optional()
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireRole(request, ["provider"]);
  if (auth.error || !auth.session) {
    return auth.error as NextResponse;
  }

  try {
    const payload = schema.parse(await request.json());
    const updateData = {
      quotationAvailable: payload.quotationAvailable,
      ebmAvailable: payload.ebmAvailable,
      quotationLeadTimeHours: payload.quotationLeadTimeHours ?? null,
      ebmNotes: payload.ebmNotes || null,
      vendorTinNumber: payload.vendorTinNumber || null,
      paymentTermsCsv:
        payload.paymentTerms && payload.paymentTerms.length > 0 ? payload.paymentTerms.join(",") : null,
      paymentMethodsCsv:
        payload.paymentMethods && payload.paymentMethods.length > 0
          ? payload.paymentMethods.join(",")
          : null,
      momoAccountName: payload.momoAccountName || null,
      momoNumber: payload.momoNumber || null,
      bankName: payload.bankName || null,
      bankAccountName: payload.bankAccountName || null,
      bankAccountNumber: payload.bankAccountNumber || null,
      bankSwiftCode: payload.bankSwiftCode || null
    };
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: auth.session.userId }
    });
    if (!profile) {
      return fail("Provider profile does not exist", 404, "PROV_001");
    }

    const updated = await prisma.providerBillingCapability.upsert({
      where: { providerProfileId: profile.id },
      update: updateData,
      create: {
        providerProfileId: profile.id,
        ...updateData
      }
    });
    return ok(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.issues[0]?.message ?? "Invalid payload", 400, "VAL_001");
    }
    return fail("Failed to update billing capabilities", 500, "PROV_500");
  }
}
