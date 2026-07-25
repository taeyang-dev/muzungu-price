const PASSWORD_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?`~";

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULE_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*\\d)(?=.*[${escapeRegex(PASSWORD_SPECIAL_CHARS)}]).{${PASSWORD_MIN_LENGTH},}$`
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULE_REGEX.test(password);
}

export function passwordRequirementMessage(locale: "en" | "ko" = "ko"): string {
  if (locale === "en") {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters with lowercase letters (a-z), numbers (0-9), and one special character (${PASSWORD_SPECIAL_CHARS}).`;
  }
  return `8자 이상, 영문 소문자(a-z), 숫자(0-9), 특수문자(!@#$%^&* 등)를 각각 1개 이상 포함해 주세요.`;
}
