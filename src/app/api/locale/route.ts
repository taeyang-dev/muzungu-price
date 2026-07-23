import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";

const schema = z.object({
  locale: z.string().min(2).max(5)
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const locale = normalizeLocale(payload.locale);

    const response = ok({ locale });
    response.cookies.set({
      name: "mp_lang",
      value: locale,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365
    });
    return response;
  } catch {
    return fail("Invalid locale payload", 400, "VAL_001");
  }
}
