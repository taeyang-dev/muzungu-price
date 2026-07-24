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

function normalizePhoneForTwilio(destination: string): string {
  const compact = destination.replace(/\s+/g, "");
  if (compact.startsWith("+")) {
    return compact;
  }
  const digits = compact.replace(/[^\d]/g, "");
  const defaultCountryCode = (process.env.AUTH_DEFAULT_COUNTRY_CODE ?? "250").replace(/[^\d]/g, "");
  const localDigits = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+${defaultCountryCode}${localDigits}`;
}

function shouldAllowMockDelivery(): boolean {
  const override = process.env.AUTH_ALLOW_MOCK_VERIFICATION;
  if (override === "true") {
    return true;
  }
  if (override === "false") {
    return false;
  }
  return false;
}

async function sendEmailViaResend(destination: string, code: string, message: string): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_API_KEY;
  const fromAddress = process.env.AUTH_RESEND_FROM;
  if (!apiKey || !fromAddress) {
    throw new Error("Resend is not configured. Set AUTH_RESEND_API_KEY and AUTH_RESEND_FROM.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromAddress,
      to: destination,
      subject: "Muzungu Price verification code",
      text: message,
      html: `<p>${message}</p>`
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend delivery failed: ${response.status} ${body}`);
  }
}

async function sendTwilioMessage(
  destination: string,
  message: string,
  channel: "sms" | "whatsapp"
): Promise<void> {
  const accountSid = process.env.AUTH_TWILIO_ACCOUNT_SID;
  const authToken = process.env.AUTH_TWILIO_AUTH_TOKEN;
  const smsFrom = process.env.AUTH_TWILIO_SMS_FROM;
  const whatsappFrom = process.env.AUTH_TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken) {
    throw new Error("Twilio is not configured. Set AUTH_TWILIO_ACCOUNT_SID and AUTH_TWILIO_AUTH_TOKEN.");
  }

  const fromRaw = channel === "sms" ? smsFrom : whatsappFrom;
  if (!fromRaw) {
    throw new Error(
      channel === "sms"
        ? "Set AUTH_TWILIO_SMS_FROM for SMS delivery."
        : "Set AUTH_TWILIO_WHATSAPP_FROM for WhatsApp delivery."
    );
  }
  const toNumber = normalizePhoneForTwilio(destination);
  const from = channel === "sms" ? fromRaw : fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${fromRaw}`;
  const to = channel === "sms" ? toNumber : `whatsapp:${toNumber}`;

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: message
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Twilio ${channel} delivery failed: ${response.status} ${responseBody}`);
  }
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

  if (channel === "email" && process.env.AUTH_RESEND_API_KEY && process.env.AUTH_RESEND_FROM) {
    await sendEmailViaResend(destination, code, message);
    return { provider: "resend", mocked: false };
  }

  if (
    channel === "sms" &&
    process.env.AUTH_TWILIO_ACCOUNT_SID &&
    process.env.AUTH_TWILIO_AUTH_TOKEN &&
    process.env.AUTH_TWILIO_SMS_FROM
  ) {
    await sendTwilioMessage(destination, message, "sms");
    return { provider: "twilio-sms", mocked: false };
  }

  if (
    channel === "whatsapp" &&
    process.env.AUTH_TWILIO_ACCOUNT_SID &&
    process.env.AUTH_TWILIO_AUTH_TOKEN &&
    process.env.AUTH_TWILIO_WHATSAPP_FROM
  ) {
    await sendTwilioMessage(destination, message, "whatsapp");
    return { provider: "twilio-whatsapp", mocked: false };
  }

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

  if (!shouldAllowMockDelivery()) {
    throw new Error(
      `No real delivery provider configured for ${channel}. Configure Resend/Twilio (recommended) or channel webhook.`
    );
  }

  console.info(`[auth][verification][mock] ${channel} -> ${destination}: ${message}`);
  return { provider: "mock", mocked: true };
}
