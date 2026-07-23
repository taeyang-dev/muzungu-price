"use client";

import { useEffect, useMemo, useState } from "react";
import { Locale, tr } from "@/lib/i18n";
import {
  readSavedDocuments,
  SavedDocumentType,
  SavedVendorDocument
} from "@/lib/document-storage";
import { getVendorStorageEventName } from "@/lib/vendor-storage";

interface DocumentsPanelProps {
  locale: Locale;
  initialType: SavedDocumentType | "all";
}

function typeLabel(locale: Locale, type: SavedDocumentType | "all"): string {
  if (type === "quotation") {
    return tr(locale, "Quotation", "견적서");
  }
  if (type === "ebm") {
    return "EBM";
  }
  return tr(locale, "All documents", "전체 문서");
}

export function DocumentsPanel({ locale, initialType }: DocumentsPanelProps) {
  const [selectedType, setSelectedType] = useState<SavedDocumentType | "all">(initialType);
  const [documents, setDocuments] = useState<SavedVendorDocument[]>([]);

  useEffect(() => {
    function refresh(): void {
      setDocuments(readSavedDocuments());
    }

    refresh();
    const eventName = getVendorStorageEventName();
    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const counts = useMemo(
    () => ({
      quotation: documents.filter((item) => item.docType === "quotation").length,
      ebm: documents.filter((item) => item.docType === "ebm").length
    }),
    [documents]
  );
  const filtered = documents.filter((item) => selectedType === "all" || item.docType === selectedType);

  return (
    <section className="panel section">
      <h1 style={{ marginTop: 0 }}>{tr(locale, "Saved vendor documents", "저장된 업체 문서")}</h1>
      <p className="muted tiny">
        {tr(
          locale,
          "Documents saved from chat attachments are listed here.",
          "채팅 첨부파일에서 저장한 문서가 여기에 모입니다."
        )}
      </p>

      <div className="doc-filter-tabs">
        {(["all", "quotation", "ebm"] as const).map((type) => (
          <button
            className={`doc-filter-tab ${selectedType === type ? "active" : ""}`}
            key={type}
            onClick={() => setSelectedType(type)}
            type="button"
          >
            {typeLabel(locale, type)}
            {type === "quotation" ? ` (${counts.quotation})` : ""}
            {type === "ebm" ? ` (${counts.ebm})` : ""}
            {type === "all" ? ` (${documents.length})` : ""}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="drawer-empty" style={{ marginTop: "10px" }}>
          {tr(locale, "No saved documents yet.", "저장된 문서가 없습니다.")}
        </p>
      ) : (
        <ul className="doc-list">
          {filtered.map((doc) => (
            <li key={doc.id}>
              <div>
                <strong>{doc.fileName}</strong>
                <p className="tiny muted">
                  {tr(locale, "Vendor", "업체")}: {doc.vendorName} · {typeLabel(locale, doc.docType)} ·{" "}
                  {new Date(doc.savedAt).toLocaleString()}
                </p>
              </div>
              <a className="btn" download={doc.fileName} href={doc.dataUrl}>
                {tr(locale, "Download", "다운로드")}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
