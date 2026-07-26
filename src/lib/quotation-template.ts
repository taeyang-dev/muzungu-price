export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotationTemplateData {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  quotationDate: string;
  projectName: string;
  lineItems: QuotationLineItem[];
  transportInclusive: boolean;
  vatInclusive: boolean;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  signatureDataUrl?: string;
}

export interface QuotationTemplateDefaults {
  businessName: string;
  email: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  projectName?: string;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    transportInclusive: true,
    vatInclusive: true,
    bankAccountName: defaults.bankAccountName,
    bankAccountNumber: defaults.bankAccountNumber,
    bankName: defaults.bankName
  };
}

export function calculateQuotationTotal(lineItems: QuotationLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function buildQuotationHtml(data: QuotationTemplateData): string {
  const rows = data.lineItems
    .map((item, index) => {
      const total = item.quantity * item.unitPrice;
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.description)}</td>
          <td style="text-align:right">${formatMoney(item.unitPrice)}</td>
          <td style="text-align:right">${formatMoney(total)}</td>
        </tr>
      `;
    })
    .join("");

  const total = calculateQuotationTotal(data.lineItems);
  const signatureBlock = data.signatureDataUrl
    ? `<div style="margin-top:28px"><p style="margin:0 0 8px;font-size:13px">Authorized signature</p><img src="${data.signatureDataUrl}" alt="Signature" style="max-width:220px;max-height:90px;border-bottom:1px solid #222" /></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Quotation - ${escapeHtml(data.businessName)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
      h1 { font-size: 28px; margin: 18px 0 8px; letter-spacing: 1px; }
      .muted { color: #444; font-size: 14px; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; margin-top: 18px; }
      th, td { border: 1px solid #ccc; padding: 10px; vertical-align: top; font-size: 14px; }
      th { background: #f5f5f5; text-align: left; }
      .meta { margin-top: 16px; font-size: 14px; }
      .notes { margin-top: 14px; font-size: 14px; }
      .total { margin-top: 16px; font-size: 18px; font-weight: 700; }
      .bank { margin-top: 24px; font-size: 14px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="muted">
      <strong style="font-size:20px;color:#111">${escapeHtml(data.businessName)}</strong><br />
      Email: ${escapeHtml(data.email)}<br />
      Phone: ${escapeHtml(data.phone)}<br />
      ${escapeHtml(data.address)}
    </div>
    <h1>QUOTATION</h1>
    <div class="meta">
      <div><strong>Date:</strong> ${escapeHtml(data.quotationDate)}</div>
      <div><strong>Project:</strong> ${escapeHtml(data.projectName)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:48px">No</th>
          <th>Description</th>
          <th style="width:140px;text-align:right">Unit Price (RWF)</th>
          <th style="width:140px;text-align:right">Total (RWF)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="notes">
      ${data.transportInclusive ? "<div>Transport Inclusive</div>" : ""}
      ${data.vatInclusive ? "<div>VAT Inclusive</div>" : ""}
    </div>
    <div class="total">TOTAL ${formatMoney(total)}</div>
    <div class="bank">
      <strong>Bank Details</strong><br />
      Account name: ${escapeHtml(data.bankAccountName)}<br />
      Account Number: ${escapeHtml(data.bankAccountNumber)}<br />
      Bank Name: ${escapeHtml(data.bankName)}
    </div>
    <p style="margin-top:24px">Thank you for your business!</p>
    ${signatureBlock}
  </body>
</html>`;
}

export function buildQuotationDataUrl(data: QuotationTemplateData): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(buildQuotationHtml(data))}`;
}
