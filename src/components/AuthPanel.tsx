"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthResult {
  error?: { message: string };
}

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setLoading(true);
    setError("");

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await response.json()) as AuthResult;
    if (!response.ok) {
      setError(data.error?.message ?? "Authentication failed");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <section className="panel" style={{ maxWidth: "520px", margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <p className="muted tiny">
        Demo users after seeding: admin@muzunguprice.com / admin1234 and electric.pro@example.com /
        provider1234
      </p>
      {error && <div className="flash error">{error}</div>}
      <form className="grid" onSubmit={submit}>
        {mode === "register" && (
          <>
            <div>
              <label className="tiny">Name</label>
              <input className="input" name="name" required />
            </div>
            <div>
              <label className="tiny">Role</label>
              <select className="select" defaultValue="customer" name="role" required>
                <option value="customer">Customer</option>
                <option value="provider">Provider</option>
                <option value="org_buyer">Institution Buyer</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="tiny">Email</label>
          <input className="input" name="email" type="email" required />
        </div>
        <div>
          <label className="tiny">Password</label>
          <input className="input" name="password" type="password" required />
        </div>
        <button className="btn" disabled={loading} type="submit">
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>
      <div className="hr" />
      <button
        className="btn secondary"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        type="button"
      >
        {mode === "login" ? "Need an account?" : "Already have an account?"}
      </button>
    </section>
  );
}
