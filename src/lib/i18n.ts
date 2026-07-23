export type Locale = "en" | "ko";
const BILINGUAL_DELIMITER = "|||";

export function normalizeLocale(value: string | null | undefined): Locale {
  if (value === "ko") {
    return "ko";
  }
  return "en";
}

export function tr(locale: Locale, english: string, korean: string): string {
  return locale === "ko" ? korean : english;
}

export function localizeCopy(locale: Locale, value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parts = value.split(BILINGUAL_DELIMITER);
  if (parts.length !== 2) {
    return value;
  }

  const [english, korean] = parts.map((item) => item.trim());
  if (locale === "ko") {
    return korean || english;
  }
  return english || korean;
}
