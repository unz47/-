// レシートOCR の型（§11）。エンジン非依存。
// ネイティブ Apple Vision プロバイダ（iOS）も、テスト用の固定データも、この形で扱う。

/**
 * OCR が認識した 1 行。
 * 座標は正規化（0〜1）の bounding box。**原点は左下**（Apple Vision の規約）＝
 * y が大きいほどページ上方。並びは y 降順で「上→下」になる。
 */
export interface OcrLine {
  text: string;
  confidence: number; // 0〜1
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrResult {
  lines: OcrLine[];
}

/** レシートから抽出した支出の素案。各 *Confidence は「要確認」判定に使う（低いほど怪しい）。 */
export interface ParsedReceipt {
  amount?: number; // 円・整数（合計）
  amountConfidence?: number;
  merchant?: string; // 印字された店名（生）
  merchantConfidence?: number;
  occurredAt?: string; // 購入日時 ISO（時刻が取れなければ日付のみ）
  dateConfidence?: number;
  address?: string; // レシート印字の店舗住所
  addressConfidence?: number;
  /** デバッグ/確認用に、認識した全行（上→下）。 */
  rawLines: string[];
}

/**
 * 抽出の方式（§11.9）。端末の能力で分岐する:
 * - "llm": 対応機（A17 Pro〜 / iOS26+）で端末内 LLM（Foundation Models）による構造化抽出。
 * - "heuristic": 非対応機。Apple Vision のテキストを parse.ts で解析（既存）。
 * いずれも**端末内完結・外部送信なし**。
 */
export type ExtractionTier = "llm" | "heuristic";

/** 端末の OCR 関連能力。 */
export interface OcrCapabilities {
  /** 端末内 LLM（Foundation Models）が使えるか。 */
  onDeviceLLM: boolean;
}

/** OCR エンジンの抽象。端末（iOS ネイティブ Vision）でだけ利用可能。 */
export interface OcrProvider {
  /** 現在の環境で OCR が使えるか（ネイティブのみ true）。 */
  isAvailable(): Promise<boolean>;
  /** 画像（ファイルパス or base64）を OCR する。 */
  recognize(image: { path?: string; base64?: string }): Promise<OcrResult>;
  /** 端末能力（LLM 対応可否など）。未実装プロバイダは省略可（= 非対応扱い）。 */
  capabilities?(): Promise<OcrCapabilities>;
}
