export type AppTheme = "dark" | "light";

const THEME_COOKIE = "mp_theme";

export function normalizeTheme(value: string | null | undefined): AppTheme {
  return value === "light" ? "light" : "dark";
}

export function getThemeCookieName(): string {
  return THEME_COOKIE;
}
