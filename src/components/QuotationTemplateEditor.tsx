"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useSyncAppLoading } from "@/hooks/useSyncAppLoading";
import { Locale, tr } from "@/lib/i18n";
import {
  QuotationTemplateData,
  QuotationTemplateDefaults,
  buildQuotationPdfDocument,
  calculateQuotationTotal,
  createEmptyLineItem,
  createQuotationTemplateData
} from "@/lib/quotation-template";

interface QuotationTemplateEditorProps {
  locale: Locale;
  defaults: QuotationTemplateDefaults;
  disabled?: boolean;
  submitting?: boolean;
  completed?: boolean;
  onSubmit: (input: { fileName: string; dataUrl: string }) => void | Promise<void>;
}

export function QuotationTemplateEditor({
  locale,
  defaults,
  disabled = false,
  submitting = false,
  completed = false,
  onSubmit
}: QuotationTemplateEditorProps) {
  const [data, setData] = useState<QuotationTemplateData>(() => createQuotationTemplateData(defaults));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSyncAppLoading(submitting || isGeneratingPdf);
  const drawingRef = useRef(false);

  const total = useMemo(() => calculateQuotationTotal(data.lineItems), [data.lineItems]);

  function fillCanvasBackground(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      fillCanvasBackground(canvas);
    }
  }, []);

  function updateLineItem(
    id: string,
    patch: Partial<QuotationTemplateData["lineItems"][number]>
  ): void {
    setData((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    }));
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    context.beginPath();
    context.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>): void {
    if (!drawingRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#111";
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    drawingRef.current = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setData((current) => ({ ...current, signatureDataUrl: canvas.toDataURL("image/png") }));
  }

  function clearSignature(): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    fillCanvasBackground(canvas);
    setData((current) => ({ ...current, signatureDataUrl: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsGeneratingPdf(true);
    try {
      const pdf = await buildQuotationPdfDocument(data);
      await onSubmit({
        fileName: pdf.fileName,
        dataUrl: pdf.dataUrl
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const isBusy = disabled || submitting || isGeneratingPdf;

  return (
    <form className="grid" onSubmit={(event) => void handleSubmit(event)}>
      <p className="tiny muted" style={{ margin: 0 }}>
        {tr(
          locale,
          "Optional: fill in the app quotation template below. You can edit every field before sending.",
          "선택 사항: 아래 앱 견적서 양식을 작성해 보낼 수 있습니다. 모든 항목은 전송 전에 수정할 수 있습니다."
        )}
      </p>

      <div className="grid grid-3">
        <div>
          <label className="tiny">{tr(locale, "Business name", "업체명")}</label>
          <input
            className="input"
            onChange={(event) => setData((current) => ({ ...current, businessName: event.target.value }))}
            required
            value={data.businessName}
          />
        </div>
        <div>
          <label className="tiny">{tr(locale, "Email", "이메일")}</label>
          <input
            className="input"
            onChange={(event) => setData((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={data.email}
          />
        </div>
        <div>
          <label className="tiny">{tr(locale, "Phone", "전화번호")}</label>
          <input
            className="input"
            onChange={(event) => setData((current) => ({ ...current, phone: event.target.value }))}
            value={data.phone}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="tiny">{tr(locale, "Address", "주소")}</label>
          <input
            className="input"
            onChange={(event) => setData((current) => ({ ...current, address: event.target.value }))}
            value={data.address}
          />
        </div>
        <div>
          <label className="tiny">{tr(locale, "Date", "날짜")}</label>
          <input
            className="input"
            onChange={(event) => setData((current) => ({ ...current, quotationDate: event.target.value }))}
            value={data.quotationDate}
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label className="tiny">{tr(locale, "Project", "프로젝트")}</label>
          <input
            className="input"
            onChange={(event) => setData((current) => ({ ...current, projectName: event.target.value }))}
            value={data.projectName}
          />
        </div>
      </div>

      <div className="panel" style={{ padding: "12px" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <strong className="tiny">{tr(locale, "Line items", "항목")}</strong>
          <button
            className="btn secondary"
            onClick={() =>
              setData((current) => ({
                ...current,
                lineItems: [...current.lineItems, createEmptyLineItem()]
              }))
            }
            type="button"
          >
            {tr(locale, "Add row", "행 추가")}
          </button>
        </div>
        {data.lineItems.map((item) => (
          <div className="grid grid-3" key={item.id} style={{ marginBottom: "8px" }}>
            <div>
              <label className="tiny">{tr(locale, "Item name", "항목명")}</label>
              <textarea
                className="textarea"
                onChange={(event) => updateLineItem(item.id, { description: event.target.value })}
                placeholder={tr(locale, "Describe the item", "항목을 입력해 주세요")}
                rows={2}
                value={item.description}
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Unit price (RWF)", "단가 (RWF)")}</label>
              <input
                className="input"
                min={0}
                onChange={(event) =>
                  updateLineItem(item.id, { unitPrice: Number.parseFloat(event.target.value) || 0 })
                }
                type="number"
                value={item.unitPrice || ""}
              />
            </div>
            <div>
              <label className="tiny">{tr(locale, "Qty", "수량")}</label>
              <input
                className="input"
                min={1}
                onChange={(event) =>
                  updateLineItem(item.id, { quantity: Number.parseInt(event.target.value, 10) || 1 })
                }
                type="number"
                value={item.quantity}
              />
            </div>
          </div>
        ))}
        <p className="tiny" style={{ margin: 0 }}>
          <strong>{tr(locale, "Total", "합계")}:</strong> RWF {total.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-3">
        <div>
          <label className="tiny">{tr(locale, "Inclusive items (remarks)", "포함 항목 (비고)")}</label>
          <select
            className="select"
            onChange={(event) =>
              setData((current) => ({
                ...current,
                inclusiveNote: event.target.value as QuotationTemplateData["inclusiveNote"]
              }))
            }
            value={data.inclusiveNote}
          >
            <option value="none">{tr(locale, "None", "해당 없음")}</option>
            <option value="vat">VAT Inclusive</option>
            <option value="transport">Transport Inclusive</option>
            <option value="vat_transport">VAT & Transport Inclusive</option>
            <option value="other">{tr(locale, "Other (custom)", "기타 (직접 입력)")}</option>
          </select>
        </div>
        {data.inclusiveNote === "other" && (
          <div style={{ gridColumn: "span 2" }}>
            <label className="tiny">{tr(locale, "Custom remark", "직접 입력")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, inclusiveNoteOther: event.target.value }))}
              placeholder={tr(locale, "Describe what is included", "포함 내용을 입력해 주세요")}
              value={data.inclusiveNoteOther}
            />
          </div>
        )}
      </div>

      <div className="grid grid-3">
        <div>
          <label className="tiny">{tr(locale, "Payment method", "결제 수단")}</label>
          <select
            className="select"
            onChange={(event) =>
              setData((current) => ({
                ...current,
                paymentMethod: event.target.value as QuotationTemplateData["paymentMethod"]
              }))
            }
            value={data.paymentMethod}
          >
            <option value="bank_transfer">{tr(locale, "Bank transfer", "은행 이체")}</option>
            <option value="momo">{tr(locale, "MoMo transfer", "모모 이체")}</option>
          </select>
        </div>
      </div>

      {data.paymentMethod === "bank_transfer" ? (
        <div className="grid grid-3">
          <div>
            <label className="tiny">{tr(locale, "Account name", "예금주")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, bankAccountName: event.target.value }))}
              value={data.bankAccountName}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Account number", "계좌번호")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, bankAccountNumber: event.target.value }))}
              value={data.bankAccountNumber}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Bank", "은행")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, bankName: event.target.value }))}
              value={data.bankName}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "Bank SWIFT code (optional)", "은행 SWIFT 코드 (선택)")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, bankSwiftCode: event.target.value }))}
              placeholder={tr(locale, "Optional", "선택 입력")}
              value={data.bankSwiftCode}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-3">
          <div>
            <label className="tiny">{tr(locale, "MoMo account name", "모모 예금주")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, momoAccountName: event.target.value }))}
              value={data.momoAccountName}
            />
          </div>
          <div>
            <label className="tiny">{tr(locale, "MoMo number", "모모 번호")}</label>
            <input
              className="input"
              onChange={(event) => setData((current) => ({ ...current, momoNumber: event.target.value }))}
              value={data.momoNumber}
            />
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: "12px" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
          <strong className="tiny">{tr(locale, "Signature (optional)", "서명 (선택)")}</strong>
          <button className="btn secondary" onClick={clearSignature} type="button">
            {tr(locale, "Clear signature", "서명 지우기")}
          </button>
        </div>
        <p className="tiny muted" style={{ marginTop: 0 }}>
          {tr(
            locale,
            "Draw your signature below. This is an in-app image signature, not a certified e-signature service.",
            "아래에 서명을 그리면 됩니다. 공인 전자서명 서비스가 아닌 앱 내 이미지 서명입니다."
          )}
        </p>
        <canvas
          ref={canvasRef}
          height={120}
          onPointerDown={startDrawing}
          onPointerLeave={stopDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          style={{
            width: "100%",
            maxWidth: "420px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            touchAction: "none",
            backgroundColor: "#ffffff"
          }}
          width={420}
        />
      </div>

      <button className="btn" disabled={isBusy || completed} type="submit">
        {submitting || isGeneratingPdf
          ? tr(locale, "Uploading...", "업로드 중...")
          : completed
            ? tr(locale, "Upload complete", "업로드 완료")
            : tr(locale, "Upload quotation", "견적서 업로드")}
      </button>
    </form>
  );
}
