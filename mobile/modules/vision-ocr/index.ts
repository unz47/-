// JS から見たローカルネイティブモジュール VisionOcr。
// dev build（expo run:ios）でのみ存在。Expo Go / Web では null（呼び出し側で握り潰す）。
import { requireOptionalNativeModule } from "expo-modules-core";

export interface VisionOcrLine {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionOcrNativeModule {
  /** 端末内LLM（Foundation Models）対応可否。現状は false 固定。 */
  getCapabilities(): Promise<{ onDeviceLLM: boolean }>;
  /** 画像（パス）を自動台形補正 → Apple Vision で OCR。撮影は JS(expo-image-picker)側。 */
  recognizeText(path: string): Promise<{ lines: VisionOcrLine[] }>;
}

export const VisionOcr =
  requireOptionalNativeModule<VisionOcrNativeModule>("VisionOcr");
