import { getVendorStorageEventName } from "@/lib/vendor-storage";

export type RequestDocumentType = "quotation" | "ebm";

export interface RequestedDocument {
  id: string;
  requestId: string;
  vendorId: string;
  vendorName: string;
  type: RequestDocumentType;
  fileName: string;
  createdAt: string;
  dataUrl: string;
}

const KEY = "muzungu_requested_documents";

function readRaw(): RequestedDocument[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (item): item is RequestedDocument =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.requestId === "string" &&
          typeof item.vendorId === "string" &&
          typeof item.vendorName === "string" &&
          (item.type === "quotation" || item.type === "ebm") &&
          typeof item.fileName === "string" &&
          typeof item.createdAt === "string" &&
          typeof item.dataUrl === "string"
      )
      .slice(0, 300);
  } catch {
    return [];
  }
}

function writeRaw(items: RequestedDocument[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 300)));
  window.dispatchEvent(new Event(getVendorStorageEventName()));
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 50);
}

function dateStamp(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildDefaultRequestedDocumentName(
  vendorName: string,
  type: RequestDocumentType,
  today = new Date()
): string {
  const safeVendor = sanitizeName(vendorName) || "vendor";
  const label = type === "quotation" ? "견적서" : "EBM";
  return `${safeVendor}_${label}_${dateStamp(today)}.pdf`;
}

export function saveRequestedDocument(input: {
  requestId: string;
  vendorId: string;
  vendorName: string;
  type: RequestDocumentType;
  fileName?: string;
  content?: string;
  dataUrl?: string;
}): RequestedDocument {
  const now = new Date();
  const fileName =
    input.fileName?.trim() || buildDefaultRequestedDocumentName(input.vendorName, input.type, now);
  const dataUrl =
    input.dataUrl ??
    `data:text/plain;charset=utf-8,${encodeURIComponent(input.content ?? "Document body is empty.")}`;

  const entry: RequestedDocument = {
    id: `${input.requestId}-${input.type}-${now.getTime()}`,
    requestId: input.requestId,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    type: input.type,
    fileName,
    createdAt: now.toISOString(),
    dataUrl
  };

  const current = readRaw();
  writeRaw([entry, ...current]);
  return entry;
}

export function readRequestedDocuments(type?: RequestDocumentType): RequestedDocument[] {
  const items = readRaw().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (!type) {
    return items;
  }
  return items.filter((item) => item.type === type);
}

export function renameRequestedDocument(id: string, fileName: string): void {
  const nextName = fileName.trim();
  if (!nextName) {
    return;
  }

  const current = readRaw();
  writeRaw(
    current.map((item) =>
      item.id === id
        ? {
            ...item,
            fileName: nextName
          }
        : item
    )
  );
}

export function getRequestedDocumentCounts(): { quotation: number; ebm: number } {
  const items = readRaw();
  return {
    quotation: items.filter((item) => item.type === "quotation").length,
    ebm: items.filter((item) => item.type === "ebm").length
  };
}
