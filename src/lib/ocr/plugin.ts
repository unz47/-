// ネイティブ "VisionOcr" Capacitor プラグインの共有ハンドル（§11）。
// capture.ts（撮影）と visionProvider.ts（OCR）の両方から使うため、登録はここ 1 箇所に集約する。
import { registerPlugin } from "@capacitor/core";
import type { OcrLine } from "./types";

export interface VisionOcrPlugin {
  /** 画像（path or base64）を Apple Vision で OCR して行データを返す。 */
  recognizeText(options: {
    path?: string;
    base64?: string;
  }): Promise<{ lines: OcrLine[] }>;
  /** 端末能力（§11.9。端末内 LLM 対応可否など）。 */
  getCapabilities(): Promise<{ onDeviceLLM: boolean }>;
  /**
   * VisionKit ドキュメントスキャナで撮影する（§11.9）。
   * 紙の縁検出・台形補正・コントラスト強調を施した画像のパスを返す（OCR 精度の要）。
   * ユーザーキャンセル時は `{ canceled: true }`。
   */
  scanDocument(): Promise<{ path?: string; canceled?: boolean }>;
}

export const VisionOcr = registerPlugin<VisionOcrPlugin>("VisionOcr");
