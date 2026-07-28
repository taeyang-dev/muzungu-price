import { formatBilingualCopy, Locale, localizeCopy } from "@/lib/i18n";

type VerificationDecision = "approved" | "rejected" | "on_hold";

const LEGACY_KO_SUBJECTS: Record<string, string> = {
  "업체 심사가 승인되었습니다": "Vendor review approved",
  "업체 심사가 반려되었습니다": "Vendor review rejected",
  "업체 심사가 보류되었습니다": "Vendor review on hold",
  "심사 요청이 접수되었습니다": "Review request received"
};

function translateLegacyKoreanBody(locale: Locale, subject: string, body: string): string {
  if (locale === "ko" || body.includes("|||")) {
    return body;
  }

  const adminNoteMatch = body.match(/\n\n관리자 메모: ([\s\S]*)$/);
  const adminNote = adminNoteMatch?.[1]?.trim();
  const adminNoteSuffix = adminNote ? `\n\nReviewer note: ${adminNote}` : "";
  const bodyWithoutNote = adminNoteMatch ? body.slice(0, adminNoteMatch.index) : body;

  if (subject === "업체 심사가 승인되었습니다") {
    const match = bodyWithoutNote.match(/^(.+?) 업체 심사가 승인되었습니다\. 이제 마켓플레이스에 노출됩니다\.$/);
    if (match) {
      return `${match[1]} vendor review has been approved. Your storefront is now visible on the marketplace.${adminNoteSuffix}`;
    }
  }

  if (subject === "업체 심사가 반려되었습니다") {
    const match = bodyWithoutNote.match(
      /^(.+?) 업체 심사가 반려되었습니다\. 벤더 등록 페이지에서 서류를 보완한 뒤 다시 심사를 요청해 주세요\.$/
    );
    if (match) {
      return `${match[1]} vendor review was rejected. Update your documents on the vendor registration page and submit again.${adminNoteSuffix}`;
    }
  }

  if (subject === "업체 심사가 보류되었습니다") {
    const match = bodyWithoutNote.match(
      /^(.+?) 업체 심사가 보류되었습니다\. 추가 자료가 필요할 수 있습니다\. 쪽지함과 벤더 등록 페이지를 확인해 주세요\.$/
    );
    if (match) {
      return `${match[1]} vendor review is on hold. Additional documents may be required. Check your inbox and vendor registration page.${adminNoteSuffix}`;
    }
  }

  if (subject === "심사 요청이 접수되었습니다") {
    if (
      bodyWithoutNote ===
      "심사 중입니다. 12시간 이내 심사가 완료되며, 추가 요청이 있을 경우 쪽지함에서 확인하세요."
    ) {
      return "Your review is in progress. It will be completed within 12 hours. If we need more information, you will receive a message in your inbox.";
    }
  }

  return body;
}

export function displayInboxSubject(locale: Locale, subject: string): string {
  const localized = localizeCopy(locale, subject);
  if (locale !== "en" || localized !== subject) {
    return localized;
  }
  return LEGACY_KO_SUBJECTS[subject] ?? subject;
}

export function displayInboxBody(locale: Locale, subject: string, body: string): string {
  const localized = localizeCopy(locale, body);
  if (locale !== "en" || localized !== body) {
    return localized;
  }
  return translateLegacyKoreanBody(locale, subject, body);
}

export function verificationReviewInboxMessage(
  status: VerificationDecision,
  businessName: string,
  adminNotes?: string | null
): { subject: string; body: string } {
  const notesEn = adminNotes ? `\n\nReviewer note: ${adminNotes}` : "";
  const notesKo = adminNotes ? `\n\n관리자 메모: ${adminNotes}` : "";

  if (status === "approved") {
    return {
      subject: formatBilingualCopy("Vendor review approved", "업체 심사가 승인되었습니다"),
      body: formatBilingualCopy(
        `${businessName} vendor review has been approved. Your storefront is now visible on the marketplace.${notesEn}`,
        `${businessName} 업체 심사가 승인되었습니다. 이제 마켓플레이스에 노출됩니다.${notesKo}`
      )
    };
  }

  if (status === "rejected") {
    return {
      subject: formatBilingualCopy("Vendor review rejected", "업체 심사가 반려되었습니다"),
      body: formatBilingualCopy(
        `${businessName} vendor review was rejected. Update your documents on the vendor registration page and submit again.${notesEn}`,
        `${businessName} 업체 심사가 반려되었습니다. 벤더 등록 페이지에서 서류를 보완한 뒤 다시 심사를 요청해 주세요.${notesKo}`
      )
    };
  }

  return {
    subject: formatBilingualCopy("Vendor review on hold", "업체 심사가 보류되었습니다"),
    body: formatBilingualCopy(
      `${businessName} vendor review is on hold. Additional documents may be required. Check your inbox and vendor registration page.${notesEn}`,
      `${businessName} 업체 심사가 보류되었습니다. 추가 자료가 필요할 수 있습니다. 쪽지함과 벤더 등록 페이지를 확인해 주세요.${notesKo}`
    )
  };
}

export function verificationSubmittedInboxMessage(): { subject: string; body: string } {
  return {
    subject: formatBilingualCopy("Review request received", "심사 요청이 접수되었습니다"),
    body: formatBilingualCopy(
      "Your review is in progress. It will be completed within 12 hours. If we need more information, you will receive a message in your inbox.",
      "심사 중입니다. 12시간 이내 심사가 완료되며, 추가 요청이 있을 경우 쪽지함에서 확인하세요."
    )
  };
}

export function documentUploadedInboxMessage(input: {
  vendorName: string;
  docLabelEn: string;
  docLabelKo: string;
  fileName?: string | null;
}): { subject: string; body: string } {
  const fileLineEn = input.fileName ? `File: ${input.fileName}` : "";
  const fileLineKo = input.fileName ? `파일: ${input.fileName}` : "";

  return {
    subject: formatBilingualCopy(
      `${input.vendorName} sent your ${input.docLabelEn}`,
      `${input.vendorName} 님이 ${input.docLabelKo}를 보냈습니다`
    ),
    body: formatBilingualCopy(
      [
        `${input.vendorName} uploaded a ${input.docLabelEn} for your request.`,
        fileLineEn,
        "Open Requests to download the document."
      ]
        .filter(Boolean)
        .join("\n"),
      [
        `${input.vendorName} 님이 요청에 대한 ${input.docLabelKo}를 업로드했습니다.`,
        fileLineKo,
        "요청서에서 문서를 다운로드할 수 있습니다."
      ]
        .filter(Boolean)
        .join("\n")
    )
  };
}

export function purchaseCodeUpdatedInboxMessage(input: {
  requestTitle: string;
  customerName: string;
  purchaseCode: string;
}): { subject: string; body: string } {
  return {
    subject: formatBilingualCopy(
      `Purchase code updated: ${input.requestTitle}`,
      `Purchase code 업데이트: ${input.requestTitle}`
    ),
    body: formatBilingualCopy(
      [
        `${input.customerName} updated the purchase code.`,
        `Purchase code: ${input.purchaseCode}`,
        "Open Received requests to view the latest code."
      ].join("\n"),
      [
        `${input.customerName} 님이 Purchase code를 업데이트했습니다.`,
        `Purchase code: ${input.purchaseCode}`,
        "수신 요청서에서 최신 코드를 확인하세요."
      ].join("\n")
    )
  };
}
