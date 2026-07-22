import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminVerificationPanel } from "@/components/AdminVerificationPanel";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    return (
      <section className="panel">
        <h1>Admin</h1>
        <p>Please sign in first.</p>
        <Link className="btn" href="/auth">
          Go to Sign in
        </Link>
      </section>
    );
  }

  if (session.role !== "admin") {
    return (
      <section className="panel">
        <h1>Admin</h1>
        <p className="muted">Only admin accounts can access verification controls.</p>
      </section>
    );
  }

  const cases = await prisma.verificationCase.findMany({
    include: {
      providerProfile: {
        include: {
          user: true
        }
      },
      documents: true
    },
    orderBy: { createdAt: "desc" }
  });

  return <AdminVerificationPanel cases={cases.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />;
}
