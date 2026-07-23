import { getLocaleFromCookies } from "@/lib/i18n-server";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import type { SavedDocumentType } from "@/lib/document-storage";

interface DocumentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseType(value: string | string[] | undefined): SavedDocumentType | "all" {
  const normalized = typeof value === "string" ? value : "";
  if (normalized === "quotation" || normalized === "ebm") {
    return normalized;
  }
  return "all";
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const locale = await getLocaleFromCookies();
  const params = await searchParams;
  const initialType = parseType(params.type);
  return <DocumentsPanel initialType={initialType} locale={locale} />;
}
