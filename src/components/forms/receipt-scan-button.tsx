"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { scanReceipt, type ParsedReceipt } from "@/lib/ocr";
import type { ReceiptPrefill } from "@/components/forms/expense-form";

/** 信頼度がこれ未満 or 値が取れていないフィールドは「要確認」にする。 */
const LOW_CONFIDENCE = 0.5;

function toPrefill(r: ParsedReceipt): ReceiptPrefill {
  return {
    amount: r.amount,
    merchant: r.merchant,
    occurredAt: r.occurredAt,
    date: r.occurredAt?.slice(0, 10),
    uncertain: {
      amount: r.amount == null || (r.amountConfidence ?? 0) < LOW_CONFIDENCE,
      date: r.occurredAt == null || (r.dateConfidence ?? 0) < LOW_CONFIDENCE,
      merchant:
        r.merchant == null || (r.merchantConfidence ?? 0) < LOW_CONFIDENCE,
    },
    scannedAt: new Date().toISOString(),
  };
}

interface ReceiptScanButtonProps {
  onScanned: (prefill: ReceiptPrefill) => void;
}

/**
 * レシート撮影→OCR→支出フォームのプレフィルを起動するボタン（§11.5 A/B）。
 * 常に + FAB と並べて表示する。OCR は iOS ネイティブのみ動くため、
 * 使えない環境（Web/dev）では押すと案内を出す（導線自体は消さない）。
 */
export function ReceiptScanButton({ onScanned }: ReceiptScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    if (scanning) return;
    setError(null);
    setScanning(true);
    const out = await scanReceipt();
    setScanning(false);
    if (out.status === "ok") {
      onScanned(toPrefill(out.receipt));
    } else if (out.status === "error") {
      setError("レシートを読み取れませんでした");
    } else if (out.status === "unavailable") {
      setError("iOS アプリで利用できます");
    }
    // canceled は無言で何もしない
  }

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1">
      {error && (
        <span className="whitespace-nowrap rounded bg-surface-raised px-2 py-1 text-xs text-text-secondary shadow">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={handleScan}
        disabled={scanning}
        aria-label="レシートから追加"
        className="flex h-14 items-center gap-2 rounded-full border border-border bg-surface-raised pl-4 pr-5 font-semibold text-text-primary shadow-lg outline-none transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-70"
      >
        {scanning ? (
          <Loader2 size={22} className="animate-spin text-accent" />
        ) : (
          <Camera size={22} className="text-accent" />
        )}
        <span className="text-sm">レシート</span>
      </button>
    </div>
  );
}
