import { cookies } from "next/headers";
import { Locale, normalizeLocale } from "@/lib/i18n";

export async function getLocaleFromCookies(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get("mp_lang")?.value);
}
