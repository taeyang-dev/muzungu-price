export interface ParsedDataUrl {
  mimeType: string;
  buffer: Buffer;
}

export function parseDataUrl(value: string): ParsedDataUrl | null {
  if (!value.startsWith("data:")) {
    return null;
  }

  const commaIndex = value.indexOf(",");
  if (commaIndex === -1) {
    return null;
  }

  const metadata = value.slice(5, commaIndex);
  const payload = value.slice(commaIndex + 1);
  const mimeType = metadata.split(";")[0] || "application/octet-stream";
  const isBase64 = metadata.includes(";base64");

  try {
    const buffer = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    return { mimeType, buffer };
  } catch {
    return null;
  }
}

export function extensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };
  return map[mimeType] ?? "bin";
}
