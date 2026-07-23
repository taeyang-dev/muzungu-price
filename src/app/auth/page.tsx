import { AuthPanel } from "@/components/AuthPanel";
import { getLocaleFromCookies } from "@/lib/i18n-server";

export default async function AuthPage() {
  const locale = await getLocaleFromCookies();
  return <AuthPanel locale={locale} />;
}
