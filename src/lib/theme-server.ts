import { cookies } from "next/headers";
import { AppTheme, normalizeTheme } from "@/lib/theme";

export async function getThemeFromCookies(): Promise<AppTheme> {
  const store = await cookies();
  return normalizeTheme(store.get("mp_theme")?.value);
}
