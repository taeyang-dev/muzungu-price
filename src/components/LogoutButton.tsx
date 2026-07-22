"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout(): Promise<void> {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <button className="btn secondary" onClick={handleLogout} disabled={loading} type="button">
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
