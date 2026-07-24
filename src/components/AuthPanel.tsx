"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface AuthResult {
  error?: { message: string };
  data?: {
    destinationMasked?: string;
    debugCode?: string;
  };
}

interface AuthPanelProps {
  locale: Locale;
}

type LoginMethod = "password" | "verification";
type VerificationChannel = "email" | "sms" | "whatsapp";

export function AuthPanel({ locale }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationChannel, setVerificationChannel] = useState<VerificationChannel>("email");
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [verificationHint, setVerificationHint] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
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

    window.location.href = "/";
    router.refresh();
  }

  async function requestVerificationCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!verificationEmail.trim()) {
      setError(tr(locale, "Please enter email first.", "먼저 이메일을 입력해 주세요."));
      return;
    }

    setLoading(true);
    setError("");
    setDebugCode(null);
    const response = await fetch("/api/auth/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: verificationEmail.trim(),
        channel: verificationChannel
      })
    });

    const data = (await response.json()) as AuthResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to send verification code.", "인증번호 전송에 실패했습니다."));
      return;
    }

    setVerificationRequested(true);
    setVerificationHint(
      data.data?.destinationMasked
        ? tr(
            locale,
            `Verification code sent to ${data.data.destinationMasked}.`,
            `${data.data.destinationMasked}로 인증번호를 보냈습니다.`
          )
        : tr(locale, "Verification code sent.", "인증번호를 보냈습니다.")
    );
    setDebugCode(data.data?.debugCode ?? null);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: verificationEmail.trim(),
        code: verificationCode.trim()
      })
    });

    const data = (await response.json()) as AuthResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Verification failed.", "인증에 실패했습니다."));
      return;
    }

    window.location.href = "/";
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
      {mode === "login" && (
        <div className="row tiny" style={{ marginBottom: "10px" }}>
          <button
            className={loginMethod === "password" ? "btn" : "btn secondary"}
            onClick={() => setLoginMethod("password")}
            type="button"
          >
            {tr(locale, "Password login", "비밀번호 로그인")}
          </button>
          <button
            className={loginMethod === "verification" ? "btn" : "btn secondary"}
            onClick={() => setLoginMethod("verification")}
            type="button"
          >
            {tr(locale, "Verification code login", "인증번호 로그인")}
          </button>
        </div>
      )}

      {mode === "register" || loginMethod === "password" ? (
        <form className="grid" onSubmit={submit}>
          {mode === "register" && (
            <>
              <div>
                <label className="tiny">{tr(locale, "Name", "이름")}</label>
                <input className="input" name="name" required />
              </div>
              <div>
                <label className="tiny">{tr(locale, "Phone (optional)", "전화번호 (선택)")}</label>
                <input className="input" name="phone" placeholder="+2507..." />
                <p className="tiny muted" style={{ margin: "6px 0 0 0" }}>
                  {tr(
                    locale,
                    "Add phone to use SMS/WhatsApp verification login later.",
                    "나중에 SMS/WhatsApp 인증 로그인을 쓰려면 전화번호를 입력해 주세요."
                  )}
                </p>
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
      ) : (
        <>
          <form className="grid" onSubmit={requestVerificationCode}>
            <div>
              <label className="tiny">{tr(locale, "Email", "이메일")}</label>
              <input
                className="input"
                name="verificationEmail"
                onChange={(event) => setVerificationEmail(event.target.value)}
                required
                type="email"
                value={verificationEmail}
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Verification channel", "인증 채널")}</label>
              <select
                className="select"
                onChange={(event) => setVerificationChannel(event.target.value as VerificationChannel)}
                value={verificationChannel}
              >
                <option value="email">{tr(locale, "Email verification", "이메일 인증")}</option>
                <option value="sms">{tr(locale, "SMS verification", "SMS 인증")}</option>
                <option value="whatsapp">{tr(locale, "WhatsApp verification", "왓츠앱 인증")}</option>
              </select>
            </div>
            <button className="btn" disabled={loading} type="submit">
              {loading ? tr(locale, "Sending code...", "인증번호 전송 중...") : tr(locale, "Send verification code", "인증번호 보내기")}
            </button>
          </form>

          {verificationRequested && (
            <form className="grid" onSubmit={verifyCode} style={{ marginTop: "12px" }}>
              <p className="tiny muted" style={{ margin: 0 }}>
                {verificationHint}
              </p>
              {debugCode ? (
                <p className="tiny muted" style={{ margin: 0 }}>
                  {tr(locale, "Dev code", "개발용 코드")}: <strong>{debugCode}</strong>
                </p>
              ) : null}
              <div>
                <label className="tiny">{tr(locale, "Verification code", "인증번호")}</label>
                <input
                  className="input"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder="123456"
                  required
                  value={verificationCode}
                />
              </div>
              <div className="row">
                <button className="btn" disabled={loading} type="submit">
                  {loading ? tr(locale, "Verifying...", "인증 중...") : tr(locale, "Verify and login", "인증 후 로그인")}
                </button>
                <button
                  className="btn secondary"
                  disabled={loading}
                  onClick={() => {
                    setVerificationRequested(false);
                    setVerificationCode("");
                    setVerificationHint("");
                    setDebugCode(null);
                  }}
                  type="button"
                >
                  {tr(locale, "Change email/channel", "이메일/채널 변경")}
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <div className="hr" />
      <button
        className="btn secondary"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError("");
          setVerificationRequested(false);
          setVerificationCode("");
          setVerificationHint("");
          setDebugCode(null);
        }}
        type="button"
      >
        {mode === "login"
          ? tr(locale, "Need an account?", "계정이 없나요?")
          : tr(locale, "Already have an account?", "이미 계정이 있나요?")}
      </button>
    </section>
  );
}
