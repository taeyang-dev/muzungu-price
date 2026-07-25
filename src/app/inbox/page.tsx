import Link from "next/link";
import { InboxPanel } from "@/components/InboxPanel";
import { getSession } from "@/lib/auth";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";

export default async function InboxPage() {
  const session = await getSession();
  const locale = await getLocaleFromCookies();

  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Inbox", "쪽지함")}</h1>
        <p>{tr(locale, "Please sign in first.", "먼저 로그인해 주세요.")}</p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  return <InboxPanel locale={locale} />;
}
