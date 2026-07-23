import { getVendorStorageEventName } from "@/lib/vendor-storage";

export type SavedDocumentType = "quotation" | "ebm";

export interface UploadAttachment {
  id?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

export interface SavedVendorDocument {
  id: string;
  vendorId: string;
  vendorName: string;
  docType: SavedDocumentType;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  savedAt: string;
}

const DOCUMENTS_KEY = "muzungu_saved_documents";

function readRawDocuments(): SavedVendorDocument[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DOCUMENTS_KEY);
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
        (item): item is SavedVendorDocument =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.vendorId === "string" &&
          typeof item.vendorName === "string" &&
          (item.docType === "quotation" || item.docType === "ebm") &&
          typeof item.fileName === "string" &&
          typeof item.originalName === "string" &&
          typeof item.mimeType === "string" &&
          typeof item.sizeBytes === "number" &&
          typeof item.dataUrl === "string" &&
          typeof item.savedAt === "string"
      )
      .slice(0, 300);
  } catch {
    return [];
  }
}

function writeDocuments(next: SavedVendorDocument[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(next.slice(0, 300)));
  const eventName = getVendorStorageEventName();
  window.dispatchEvent(new Event(eventName));
}

function dateStamp(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function extensionFromAttachment(file: UploadAttachment): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 8 && !fromName.includes("/")) {
    return fromName.toLowerCase();
  }

  const mimeMap: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "text/plain": "txt"
  };
  return mimeMap[file.mimeType] ?? "bin";
}

export function readSavedDocuments(type?: SavedDocumentType): SavedVendorDocument[] {
  const all = readRawDocuments().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  if (!type) {
    return all;
  }
  return all.filter((item) => item.docType === type);
}

export function getSavedDocumentCounts(): { quotation: number; ebm: number } {
  const docs = readRawDocuments();
  return {
    quotation: docs.filter((item) => item.docType === "quotation").length,
    ebm: docs.filter((item) => item.docType === "ebm").length
  };
}

export function saveVendorDocument(input: {
  vendorId: string;
  vendorName: string;
  docType: SavedDocumentType;
  attachment: UploadAttachment;
}): SavedVendorDocument {
  const now = new Date();
  const safeVendor = sanitizeName(input.vendorName) || "vendor";
  const typeUpper = input.docType.toUpperCase();
  const extension = extensionFromAttachment(input.attachment);
  const generatedFileName = `${safeVendor}_${typeUpper}_${dateStamp(now)}.${extension}`;

  const saved: SavedVendorDocument = {
    id: `${input.vendorId}-${input.docType}-${now.getTime()}`,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    docType: input.docType,
    fileName: generatedFileName,
    originalName: input.attachment.name,
    mimeType: input.attachment.mimeType,
    sizeBytes: input.attachment.sizeBytes,
    dataUrl: input.attachment.dataUrl,
    savedAt: now.toISOString()
  };

  const current = readRawDocuments();
  writeDocuments([saved, ...current.filter((item) => item.id !== saved.id)]);
  return saved;
}
