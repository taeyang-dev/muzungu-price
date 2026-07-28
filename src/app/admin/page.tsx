import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminVerificationPanel } from "@/components/AdminVerificationPanel";
import { AdminVendorManagerPanel } from "@/components/AdminVendorManagerPanel";
import { listAdminProviders } from "@/lib/admin-providers";
import { getLocaleFromCookies } from "@/lib/i18n-server";
import { tr } from "@/lib/i18n";

export default async function AdminPage() {
  const session = await getSession();
  const locale = await getLocaleFromCookies();
  if (!session) {
    return (
      <section className="panel">
        <h1>{tr(locale, "Admin", "관리자")}</h1>
        <p>{tr(locale, "Please sign in first.", "먼저 로그인해 주세요.")}</p>
        <Link className="btn" href="/auth">
          {tr(locale, "Go to Sign in", "로그인하러 가기")}
        </Link>
      </section>
    );
  }

  if (session.role !== "admin") {
    return (
      <section className="panel">
        <h1>{tr(locale, "Admin", "관리자")}</h1>
        <p className="muted">
          {tr(locale, "Only admin accounts can access verification controls.", "관리자 계정만 검증 관리를 사용할 수 있습니다.")}
        </p>
      </section>
    );
  }

  const [cases, providers] = await Promise.all([
    prisma.verificationCase.findMany({
      where: {
        status: { not: "draft" }
      },
      include: {
        providerProfile: {
          include: {
            user: true
          }
        },
        documents: true
      },
      orderBy: { createdAt: "desc" }
    }),
    listAdminProviders()
  ]);

  return (
    <section className="grid">
      <AdminVendorManagerPanel locale={locale} providers={providers} />
      <AdminVerificationPanel
        cases={cases.map((item: (typeof cases)[number]) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
        locale={locale}
      />
    </section>
  );
}
