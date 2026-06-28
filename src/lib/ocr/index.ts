// レシートOCR の公開API（§11）。UI からはここだけ見る。
import type { ExtractionTier, OcrProvider, OcrResult, ParsedReceipt } from "./types";
import { visionProvider } from "./visionProvider";
import { captureReceiptImage } from "./capture";
import { parseReceipt } from "./parse";
import { merchantKey } from "./merchant";

export type { ExtractionTier, OcrLine, OcrResult, ParsedReceipt } from "./types";
export { parseReceipt } from "./parse";
export { merchantKey } from "./merchant";

const provider: OcrProvider = visionProvider;

/** この環境で OCR が使えるか（iOS ネイティブのみ true）。 */
export async function ocrAvailable(): Promise<boolean> {
  return provider.isAvailable();
}

/** 端末の能力で抽出方式を決める（§11.9）。LLM 対応機なら "llm"、それ以外は "heuristic"。 */
export async function extractionTier(): Promise<ExtractionTier> {
  const caps = await provider.capabilities?.();
  return caps?.onDeviceLLM ? "llm" : "heuristic";
}

/**
 * OCR 結果から支出の素案を抽出する（§11.9 の分岐点）。
 * いずれも端末内完結。現状は両 tier ともヒューリスティック（parse.ts）。
 * TODO(§11.9): tier === "llm" の対応機では Foundation Models による構造化抽出に差し替える
 * （ネイティブ側に抽出メソッドを足し、ここから呼ぶ）。
 */
function extractReceipt(result: OcrResult, tier: ExtractionTier): ParsedReceipt {
  void tier; // 現状は分岐先が同一。LLM アーム実装時にここで切り替える。
  return parseReceipt(result);
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
    console.log("[ocr] recognizing image", image.path);
    const result = await provider.recognize(image);
    const tier = await extractionTier();
    const receipt = extractReceipt(result, tier);
    console.log(
      "[ocr] tier=%s lines=%d parsed=%o",
      tier,
      result.lines.length,
      {
        amount: receipt.amount,
        merchant: receipt.merchant,
        occurredAt: receipt.occurredAt,
      },
    );
    return { status: "ok", receipt };
  } catch (e) {
    console.log("[ocr] error", e);
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

/** ParsedReceipt の店名から正規化キーを得る（保存時に Expense.merchantKey に入れる）。 */
export function keyFor(receipt: ParsedReceipt): string | undefined {
  return merchantKey(receipt.merchant);
}
