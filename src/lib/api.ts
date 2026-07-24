import { NextResponse } from "next/server";

export function ok<T>(data: T, meta: Record<string, unknown> | null = null): NextResponse {
  return NextResponse.json({ data, meta, error: null });
}

export function fail(
  message: string,
  status = 400,
  code = "VAL_001"
): NextResponse {
  return NextResponse.json(
    {
      data: null,
      meta: null,
      error: { code, message }
    },
    { status }
  );
}

export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
