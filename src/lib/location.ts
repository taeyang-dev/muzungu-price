const CITY_ALIASES: Record<string, string> = {
  키갈리: "Kigali",
  키가리: "Kigali",
  kigali: "Kigali",
  kampala: "Kampala",
  캄팔라: "Kampala",
  나이로비: "Nairobi",
  nairobi: "Nairobi"
};

const COUNTRY_ALIASES: Record<string, string> = {
  르완다: "Rwanda",
  rwanda: "Rwanda",
  우간다: "Uganda",
  uganda: "Uganda",
  케냐: "Kenya",
  kenya: "Kenya"
};

function lookupAlias(value: string, aliases: Record<string, string>): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = aliases[trimmed];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();
  return aliases[lower] ?? null;
}

export function normalizeCityInput(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return lookupAlias(trimmed, CITY_ALIASES) ?? trimmed;
}

export function normalizeCountryInput(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return lookupAlias(trimmed, COUNTRY_ALIASES) ?? trimmed;
}
