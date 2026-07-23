"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface AuthResult {
  error?: { message: string };
}

interface AuthPanelProps {
  locale: Locale;
}

export function AuthPanel({ locale }: AuthPanelProps) {
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
      setError(data.error?.message ?? tr(locale, "Authentication failed", "인증에 실패했습니다."));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <section className="panel" style={{ maxWidth: "520px", margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>
        {mode === "login" ? tr(locale, "Sign in", "로그인") : tr(locale, "Create account", "계정 만들기")}
      </h1>
      <p className="muted tiny">
        {tr(locale, "Demo users after seeding", "시드 데이터 데모 계정")}: admin@muzunguprice.com /
        admin1234 · electric.pro@example.com / provider1234
      </p>
      {error && <div className="flash error">{error}</div>}
      <form className="grid" onSubmit={submit}>
        {mode === "register" && (
          <>
            <div>
              <label className="tiny">{tr(locale, "Name", "이름")}</label>
              <input className="input" name="name" required />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Role", "역할")}</label>
              <select className="select" defaultValue="customer" name="role" required>
                <option value="customer">{tr(locale, "Customer", "고객")}</option>
                <option value="provider">{tr(locale, "Provider", "업체/프리랜서")}</option>
                <option value="org_buyer">{tr(locale, "Institution Buyer", "기관 구매자")}</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="tiny">{tr(locale, "Email", "이메일")}</label>
          <input className="input" name="email" type="email" required />
        </div>
        <div>
          <label className="tiny">{tr(locale, "Password", "비밀번호")}</label>
          <input className="input" name="password" type="password" required />
        </div>
        <button className="btn" disabled={loading} type="submit">
          {loading
            ? tr(locale, "Please wait...", "처리 중...")
            : mode === "login"
              ? tr(locale, "Login", "로그인")
              : tr(locale, "Register", "회원가입")}
        </button>
      </form>
      <div className="hr" />
      <button
        className="btn secondary"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        type="button"
      >
        {mode === "login"
          ? tr(locale, "Need an account?", "계정이 없나요?")
          : tr(locale, "Already have an account?", "이미 계정이 있나요?")}
      </button>
    </section>
  );
}
