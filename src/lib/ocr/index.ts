// レシートOCR の公開API（§11）。UI からはここだけ見る。
import type { OcrProvider, ParsedReceipt } from "./types";
import { visionProvider } from "./visionProvider";
import { captureReceiptImage } from "./capture";
import { parseReceipt } from "./parse";
import { merchantKey } from "./merchant";

export type { OcrLine, OcrResult, ParsedReceipt } from "./types";
export { parseReceipt } from "./parse";
export { merchantKey } from "./merchant";

const provider: OcrProvider = visionProvider;

/** この環境で OCR が使えるか（iOS ネイティブのみ true）。 */
export async function ocrAvailable(): Promise<boolean> {
  return provider.isAvailable();
}

export type ScanOutcome =
  | { status: "ok"; receipt: ParsedReceipt }
  | { status: "canceled" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

/**
 * レシートを撮影/選択 → OCR → 解析まで一気通貫。
 * 端末以外（Web/dev）では status:"unavailable" を返す（呼び出し側で導線を隠す/案内する）。
 */
export async function scanReceipt(): Promise<ScanOutcome> {
  if (!(await provider.isAvailable())) return { status: "unavailable" };
  const image = await captureReceiptImage();
  if (!image) return { status: "canceled" };
  try {
    const result = await provider.recognize(image);
    return { status: "ok", receipt: parseReceipt(result) };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** ParsedReceipt の店名から正規化キーを得る（保存時に Expense.merchantKey に入れる）。 */
export function keyFor(receipt: ParsedReceipt): string | undefined {
  return merchantKey(receipt.merchant);
}
