export type Locale = "en" | "ko" | "fr";
const BILINGUAL_DELIMITER = "|||";

export function normalizeLocale(value: string | null | undefined): Locale {
  if (value === "ko") {
    return "ko";
  }
  if (value === "fr") {
    return "fr";
  }
  return "en";
}

export function tr(locale: Locale, english: string, korean: string, french?: string): string {
  if (locale === "ko") {
    return korean;
  }
  if (locale === "fr") {
    return french ?? english;
  }
  return english;
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
