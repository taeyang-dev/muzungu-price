export interface PhoneCountryCode {
  code: string;
  labelEn: string;
  labelKo: string;
  dialCode: string;
}

export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { code: "RW", labelEn: "Rwanda", labelKo: "르완다", dialCode: "+250" },
  { code: "KR", labelEn: "South Korea", labelKo: "대한민국", dialCode: "+82" },
  { code: "US", labelEn: "United States", labelKo: "미국", dialCode: "+1" },
  { code: "UG", labelEn: "Uganda", labelKo: "우간다", dialCode: "+256" },
  { code: "KE", labelEn: "Kenya", labelKo: "케냐", dialCode: "+254" },
  { code: "TZ", labelEn: "Tanzania", labelKo: "탄자니아", dialCode: "+255" },
  { code: "CN", labelEn: "China", labelKo: "중국", dialCode: "+86" },
  { code: "JP", labelEn: "Japan", labelKo: "일본", dialCode: "+81" },
  { code: "GB", labelEn: "United Kingdom", labelKo: "영국", dialCode: "+44" },
  { code: "FR", labelEn: "France", labelKo: "프랑스", dialCode: "+33" },
  { code: "DE", labelEn: "Germany", labelKo: "독일", dialCode: "+49" }
];

export function splitPhoneNumber(value: string | null | undefined): {
  dialCode: string;
  localNumber: string;
} {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { dialCode: "+250", localNumber: "" };
  }

  const matched = [...PHONE_COUNTRY_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((entry) => trimmed.startsWith(entry.dialCode));

  if (!matched) {
    return { dialCode: "+250", localNumber: trimmed.replace(/^\+/, "") };
  }

  return {
    dialCode: matched.dialCode,
    localNumber: trimmed.slice(matched.dialCode.length).replace(/\D/g, "")
  };
}

export function combinePhoneNumber(dialCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  return `${dialCode}${digits}`;
}
