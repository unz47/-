// レシートOCR の公開API（§11）。UI からはここだけ見る。
// 撮影(VisionKitスキャナ) → OCR(Vision) → parse まで一気通貫。すべて端末内・外部送信なし。
import { Platform } from "react-native";

import { VisionOcr } from "../../../modules/vision-ocr";
import { merchantKey } from "./merchant";
import { parseReceipt } from "./parse";
import type { ExtractionTier, ParsedReceipt } from "./types";

export type { ExtractionTier, OcrLine, OcrResult, ParsedReceipt } from "./types";
export { parseReceipt } from "./parse";
export { merchantKey } from "./merchant";

/** 信頼度がこれ未満 or 値が無いフィールドは「要確認」にする。 */
const LOW_CONFIDENCE = 0.5;

/** OCR 結果から支出フォームに流し込む素案（＋「要確認」フラグ）。 */
export interface ReceiptPrefill {
  amount?: number;
  date?: string; // YYYY-MM-DD
  memo?: string;
  merchant?: string;
  merchantKey?: string;
  occurredAt?: string;
  uncertain: { amount: boolean; date: boolean; merchant: boolean };
}

/** OCR が使えるか（iOS の dev build のみ true。Expo Go / Web では false）。 */
export function ocrAvailable(): boolean {
  return Platform.OS === "ios" && VisionOcr != null;
}

export type ScanOutcome =
  | { status: "ok"; receipt: ParsedReceipt; tier: ExtractionTier }
  | { status: "canceled" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

/** レシートを撮影 → OCR → 解析。非対応環境では status:"unavailable"。 */
export async function scanReceipt(): Promise<ScanOutcome> {
  if (!ocrAvailable() || !VisionOcr) return { status: "unavailable" };
  try {
    const scan = await VisionOcr.scanDocument();
    if (scan?.canceled || !scan?.path) return { status: "canceled" };
    const result = await VisionOcr.recognizeText(scan.path);
    const caps = await VisionOcr.getCapabilities().catch(() => ({
      onDeviceLLM: false,
    }));
    const tier: ExtractionTier = caps?.onDeviceLLM ? "llm" : "heuristic";
    const receipt = parseReceipt({ lines: result.lines });
    return { status: "ok", receipt, tier };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** ParsedReceipt → フォーム用 ReceiptPrefill。 */
export function toPrefill(r: ParsedReceipt): ReceiptPrefill {
  return {
    amount: r.amount,
    date: r.occurredAt?.slice(0, 10),
    memo: r.merchant,
    merchant: r.merchant,
    merchantKey: merchantKey(r.merchant),
    occurredAt: r.occurredAt,
    uncertain: {
      amount: r.amount == null || (r.amountConfidence ?? 0) < LOW_CONFIDENCE,
      date: r.occurredAt == null || (r.dateConfidence ?? 0) < LOW_CONFIDENCE,
      merchant:
        r.merchant == null || (r.merchantConfidence ?? 0) < LOW_CONFIDENCE,
    },
  };
}
