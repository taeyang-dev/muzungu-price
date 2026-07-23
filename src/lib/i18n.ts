export type Locale = "en" | "ko";

export function normalizeLocale(value: string | null | undefined): Locale {
  if (value === "ko") {
    return "ko";
  }
  return "en";
}

export function tr(locale: Locale, english: string, korean: string): string {
  return locale === "ko" ? korean : english;
}
