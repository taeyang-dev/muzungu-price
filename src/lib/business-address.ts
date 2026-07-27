export interface StructuredBusinessAddress {
  line1: string;
  line2: string;
  district: string;
}

export function composeBusinessAddress(parts: StructuredBusinessAddress): string {
  return [parts.line1.trim(), parts.line2.trim(), parts.district.trim()].filter(Boolean).join("\n");
}

export function parseBusinessAddress(value: string | null | undefined): StructuredBusinessAddress {
  if (!value?.trim()) {
    return { line1: "", line2: "", district: "" };
  }

  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    line1: lines[0] ?? "",
    line2: lines[1] ?? "",
    district: lines[2] ?? ""
  };
}
