export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export type QuotationInclusiveNote = "none" | "vat" | "transport" | "vat_transport" | "other";
export type QuotationPaymentMethod = "bank_transfer" | "momo";

export interface QuotationTemplateData {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  quotationDate: string;
  projectName: string;
  lineItems: QuotationLineItem[];
  inclusiveNote: QuotationInclusiveNote;
  inclusiveNoteOther: string;
  paymentMethod: QuotationPaymentMethod;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankSwiftCode: string;
  momoAccountName: string;
  momoNumber: string;
  signatureDataUrl?: string;
}

export interface QuotationTemplateDefaults {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  paymentMethod?: QuotationPaymentMethod;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankSwiftCode?: string;
  momoAccountName?: string;
  momoNumber?: string;
  projectName?: string;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function defaultPaymentMethod(defaults: QuotationTemplateDefaults): QuotationPaymentMethod {
  if (defaults.paymentMethod) {
    return defaults.paymentMethod;
  }
  if (defaults.momoNumber?.trim() && !defaults.bankAccountNumber?.trim()) {
    return "momo";
  }
  return "bank_transfer";
}

export function createEmptyLineItem(): QuotationLineItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    quantity: 1,
    unitPrice: 0
  };
}

export function createQuotationTemplateData(
  defaults: QuotationTemplateDefaults
): QuotationTemplateData {
  const today = new Date();
  const quotationDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  return {
    businessName: defaults.businessName,
    email: defaults.email,
    phone: defaults.phone,
    address: defaults.address,
    quotationDate,
    projectName: defaults.projectName ?? "",
    lineItems: [createEmptyLineItem()],
    inclusiveNote: "none",
    inclusiveNoteOther: "",
    paymentMethod: defaultPaymentMethod(defaults),
    bankAccountName: defaults.bankAccountName,
    bankAccountNumber: defaults.bankAccountNumber,
    bankName: defaults.bankName,
    bankSwiftCode: defaults.bankSwiftCode ?? "",
    momoAccountName: defaults.momoAccountName ?? "",
    momoNumber: defaults.momoNumber ?? ""
  };
}

export function calculateQuotationTotal(lineItems: QuotationLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function getInclusiveNoteText(data: QuotationTemplateData): string {
  switch (data.inclusiveNote) {
    case "vat":
      return "VAT Inclusive";
    case "transport":
      return "Transport Inclusive";
    case "vat_transport":
      return "VAT & Transport Inclusive";
    case "other":
      return data.inclusiveNoteOther.trim();
    default:
      return "";
  }
}

function buildQuotationFileName(businessName: string): string {
  const safeName = businessName.trim().replace(/\s+/g, "_").slice(0, 40) || "vendor";
  return `Quotation_${safeName}.pdf`;
}

let quotationFontBase64: string | null = null;
const QUOTATION_FONT_FILE = "NotoSansCJKkr-Regular.otf";
const QUOTATION_FONT_FAMILY = "NotoSansCJKkr";

async function loadQuotationFontBase64(): Promise<string> {
  if (quotationFontBase64) {
    return quotationFontBase64;
  }

  const response = await fetch(`/fonts/${QUOTATION_FONT_FILE}`);
  if (!response.ok) {
    throw new Error("Failed to load PDF font");
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  quotationFontBase64 = btoa(binary);
  return quotationFontBase64;
}

function applyQuotationFont(doc: import("jspdf").jsPDF, fontSize = 10): void {
  doc.setFont(QUOTATION_FONT_FAMILY, "normal");
  doc.setFontSize(fontSize);
}

async function ensureQuotationFont(doc: import("jspdf").jsPDF): Promise<void> {
  const base64 = await loadQuotationFontBase64();
  doc.addFileToVFS(QUOTATION_FONT_FILE, base64);
  doc.addFont(QUOTATION_FONT_FILE, QUOTATION_FONT_FAMILY, "normal");
  applyQuotationFont(doc, 10);
}

function wrapDescription(
  doc: import("jspdf").jsPDF,
  text: string,
  maxWidth: number
): string[] {
  applyQuotationFont(doc, 10);
  const normalized = text.trim() || "-";
  const wrapped = doc.splitTextToSize(normalized, maxWidth);
  if (Array.isArray(wrapped) && wrapped.length > 0 && wrapped.some((line) => line.trim().length > 0)) {
    return wrapped;
  }
  return [normalized];
}

export async function buildQuotationPdfDocument(
  data: QuotationTemplateData
): Promise<{ dataUrl: string; fileName: string }> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  await ensureQuotationFont(doc);
  const left = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - 14;
  let y = 18;

  applyQuotationFont(doc, 16);
  doc.text(data.businessName, left, y);
  y += 8;

  applyQuotationFont(doc, 10);
  const headerLines = [
    data.email ? `Email: ${data.email}` : "",
    data.phone ? `Phone: ${data.phone}` : "",
    data.address
  ].filter(Boolean);

  for (const line of headerLines) {
    doc.text(line, left, y);
    y += 5;
  }

  y += 4;
  applyQuotationFont(doc, 20);
  doc.text("QUOTATION", left, y);
  y += 10;

  applyQuotationFont(doc, 11);
  doc.text(`Date: ${data.quotationDate}`, left, y);
  y += 6;
  doc.text(`Project: ${data.projectName}`, left, y);
  y += 10;

  const colNo = left;
  const colDescription = left + 12;
  const colUnit = right - 58;
  const colTotal = right - 28;
  applyQuotationFont(doc, 10);
  doc.text("No", colNo, y);
  doc.text("Description", colDescription, y);
  doc.text("Unit Price", colUnit, y, { align: "right" });
  doc.text("Total", colTotal, y, { align: "right" });
  y += 4;
  doc.line(left, y, right, y);
  y += 6;

  for (const [index, item] of data.lineItems.entries()) {
    const lineTotal = item.quantity * item.unitPrice;
    const descriptionWidth = Math.max(colUnit - colDescription - 8, 40);
    const descriptionLines = wrapDescription(doc, item.description, descriptionWidth);
    const rowHeight = Math.max(descriptionLines.length * 5, 6);

    if (y + rowHeight > 270) {
      doc.addPage();
      applyQuotationFont(doc, 10);
      y = 20;
    }

    applyQuotationFont(doc, 10);
    doc.text(String(index + 1), colNo, y);
    doc.text(descriptionLines, colDescription, y);
    doc.text(formatMoney(item.unitPrice), colUnit, y, { align: "right" });
    doc.text(formatMoney(lineTotal), colTotal, y, { align: "right" });
    y += rowHeight + 4;
  }

  y += 2;
  doc.line(left, y, right, y);
  y += 8;

  const inclusiveText = getInclusiveNoteText(data);
  if (inclusiveText) {
    applyQuotationFont(doc, 10);
    doc.text("Remarks", left, y);
    y += 6;
    const remarkLines = doc.splitTextToSize(inclusiveText, right - left);
    doc.text(remarkLines, left, y);
    y += remarkLines.length * 5 + 4;
  }

  applyQuotationFont(doc, 13);
  doc.text(`TOTAL RWF ${formatMoney(calculateQuotationTotal(data.lineItems))}`, left, y);
  y += 12;

  applyQuotationFont(doc, 11);
  doc.text(data.paymentMethod === "momo" ? "MoMo Details" : "Bank Details", left, y);
  y += 7;
  applyQuotationFont(doc, 10);

  const paymentLines =
    data.paymentMethod === "momo"
      ? [
          `Account name: ${data.momoAccountName || "-"}`,
          `MoMo number: ${data.momoNumber || "-"}`
        ]
      : [
          `Account name: ${data.bankAccountName || "-"}`,
          `Account number: ${data.bankAccountNumber || "-"}`,
          `Bank name: ${data.bankName || "-"}`,
          data.bankSwiftCode ? `SWIFT: ${data.bankSwiftCode}` : ""
        ].filter(Boolean);

  for (const line of paymentLines) {
    doc.text(line, left, y);
    y += 5;
  }

  y += 6;
  doc.text("Thank you for your business!", left, y);
  y += 10;

  if (data.signatureDataUrl) {
    if (y > 250) {
      doc.addPage();
      applyQuotationFont(doc, 10);
      y = 20;
    }
    applyQuotationFont(doc, 10);
    doc.text("Signature", left, y);
    y += 4;
    doc.addImage(data.signatureDataUrl, "PNG", left, y, 55, 22);
  }

  return {
    dataUrl: doc.output("datauristring"),
    fileName: buildQuotationFileName(data.businessName)
  };
}
