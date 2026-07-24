import { VerificationChannel } from "@prisma/client";

export const VERIFICATION_CODE_TTL_SECONDS = 5 * 60;
export const VERIFICATION_REQUEST_COOLDOWN_SECONDS = 30;
export const VERIFICATION_MAX_ATTEMPTS = 5;

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value.replace(/[^\d+]/g, "").trim();
  if (cleaned.length < 8) {
    return null;
  }
  return cleaned;
}

function messageForChannel(code: string): string {
  return `Your Muzungu Price verification code is ${code}. It expires in 5 minutes.`;
}

async function sendViaWebhook(
  url: string,
  token: string | undefined,
  payload: Record<string, string>
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Delivery webhook failed: ${response.status}`);
  }
}

export async function deliverVerificationCode(
  channel: VerificationChannel,
  destination: string,
  code: string
): Promise<{ provider: string; mocked: boolean }> {
  const message = messageForChannel(code);

  if (channel === "email" && process.env.AUTH_EMAIL_WEBHOOK_URL) {
    await sendViaWebhook(process.env.AUTH_EMAIL_WEBHOOK_URL, process.env.AUTH_EMAIL_WEBHOOK_TOKEN, {
      channel,
      to: destination,
      code,
      message
    });
    return { provider: "email-webhook", mocked: false };
  }

  if (channel === "sms" && process.env.AUTH_SMS_WEBHOOK_URL) {
    await sendViaWebhook(process.env.AUTH_SMS_WEBHOOK_URL, process.env.AUTH_SMS_WEBHOOK_TOKEN, {
      channel,
      to: destination,
      code,
      message
    });
    return { provider: "sms-webhook", mocked: false };
  }

  if (channel === "whatsapp" && process.env.AUTH_WHATSAPP_WEBHOOK_URL) {
    await sendViaWebhook(
      process.env.AUTH_WHATSAPP_WEBHOOK_URL,
      process.env.AUTH_WHATSAPP_WEBHOOK_TOKEN,
      {
        channel,
        to: destination,
        code,
        message
      }
    );
    return { provider: "whatsapp-webhook", mocked: false };
  }

  console.info(`[auth][verification][mock] ${channel} -> ${destination}: ${message}`);
  return { provider: "mock", mocked: true };
}
