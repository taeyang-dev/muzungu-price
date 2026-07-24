"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, tr } from "@/lib/i18n";

interface AuthResult {
  error?: { message: string };
  data?: {
    destinationMasked?: string;
    debugCode?: string;
    mocked?: boolean;
    provider?: string;
  };
}

interface AuthPanelProps {
  locale: Locale;
}

type VerificationChannel = "email" | "sms" | "whatsapp";

export function AuthPanel({ locale }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [verificationChannel, setVerificationChannel] = useState<VerificationChannel>("email");
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

  async function requestVerificationCode(): Promise<void> {
    if (!registerEmail.trim()) {
      setError(tr(locale, "Please enter email first.", "먼저 이메일을 입력해 주세요."));
      return;
    }
    if (verificationChannel !== "email" && !registerPhone.trim()) {
      setError(
        tr(
          locale,
          "Please enter phone number for SMS/WhatsApp verification.",
          "SMS/왓츠앱 인증에는 전화번호를 입력해 주세요."
        )
      );
      return;
    }

    setLoading(true);
    setError("");
    setDebugCode(null);
    const response = await fetch("/api/auth/verification/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        channel: verificationChannel,
        purpose: "register"
      })
    });

    const data = (await response.json()) as AuthResult;
    setLoading(false);
    if (!response.ok) {
      setError(data.error?.message ?? tr(locale, "Failed to send verification code.", "인증번호 전송에 실패했습니다."));
      return;
    }

    setVerificationHint(
      data.data?.destinationMasked
        ? tr(
            locale,
            data.data?.mocked
              ? `Test mode only: code was not actually delivered. (${data.data.destinationMasked})`
              : `Verification code sent to ${data.data.destinationMasked}.`,
            data.data?.mocked
              ? `테스트 모드입니다. 실제 발송되지 않았어요. (${data.data.destinationMasked})`
              : `${data.data.destinationMasked}로 인증번호를 보냈습니다.`
          )
        : tr(locale, "Verification code sent.", "인증번호를 보냈습니다.")
    );
    setDebugCode(data.data?.debugCode ?? null);
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
              <label className="tiny">{tr(locale, "Login email", "로그인 이메일")}</label>
              <input
                className="input"
                name="email"
                onChange={(event) => setRegisterEmail(event.target.value)}
                required
                type="email"
                value={registerEmail}
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Verification option", "인증 옵션")}</label>
              <select
                className="select"
                name="verificationChannel"
                onChange={(event) => {
                  setVerificationChannel(event.target.value as VerificationChannel);
                  setVerificationHint("");
                  setDebugCode(null);
                }}
                value={verificationChannel}
              >
                <option value="email">{tr(locale, "Email verification", "이메일 인증")}</option>
                <option value="sms">{tr(locale, "SMS verification", "SMS 인증")}</option>
                <option value="whatsapp">{tr(locale, "WhatsApp verification", "왓츠앱 인증")}</option>
              </select>
            </div>
            {verificationChannel !== "email" ? (
              <div>
                <label className="tiny">{tr(locale, "Phone number", "전화번호")}</label>
                <input
                  className="input"
                  name="phone"
                  onChange={(event) => setRegisterPhone(event.target.value)}
                  placeholder="+2507..."
                  required
                  value={registerPhone}
                />
              </div>
            ) : (
              <p className="tiny muted" style={{ margin: 0 }}>
                {tr(
                  locale,
                  "Verification code will be sent to your login email.",
                  "인증번호는 로그인 이메일로 전송됩니다."
                )}
              </p>
            )}
            <div className="row">
              <button className="btn secondary" disabled={loading} onClick={requestVerificationCode} type="button">
                {loading ? tr(locale, "Sending code...", "인증번호 전송 중...") : tr(locale, "Send verification code", "인증번호 보내기")}
              </button>
              {verificationHint ? (
                <span className="tiny muted" style={{ alignSelf: "center" }}>
                  {verificationHint}
                </span>
              ) : null}
            </div>
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
                name="verificationCode"
                placeholder="123456"
                required
              />
            </div>
          </>
        )}
        {mode === "login" && (
          <>
            <div>
              <label className="tiny">{tr(locale, "Email", "이메일")}</label>
              <input className="input" name="email" type="email" required />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Password", "비밀번호")}</label>
              <input className="input" name="password" type="password" required />
            </div>
          </>
        )}
        {mode === "register" && (
          <div>
            <label className="tiny">{tr(locale, "Password", "비밀번호")}</label>
            <input className="input" name="password" type="password" required />
          </div>
        )}
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
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError("");
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
