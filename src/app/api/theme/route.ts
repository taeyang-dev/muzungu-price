import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { normalizeTheme } from "@/lib/theme";

const schema = z.object({
  theme: z.enum(["dark", "light"])
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = schema.parse(await request.json());
    const theme = normalizeTheme(payload.theme);

    const response = ok({ theme });
    response.cookies.set({
      name: "mp_theme",
      value: theme,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365
    });
    return response;
  } catch {
    return fail("Invalid theme payload", 400, "VAL_001");
  }
}
