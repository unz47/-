// iOS ネイティブ Apple Vision を呼ぶ OcrProvider（§11.2）。
// JS からは Capacitor プラグイン "VisionOcr" 経由。ネイティブ(iOS)でのみ動作する。
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { OcrLine, OcrProvider, OcrResult } from "./types";

interface VisionOcrPlugin {
  recognizeText(options: {
    path?: string;
    base64?: string;
  }): Promise<{ lines: OcrLine[] }>;
}

const VisionOcr = registerPlugin<VisionOcrPlugin>("VisionOcr");

export const visionProvider: OcrProvider = {
  async isAvailable() {
    // Web ビルドでは Vision は無い。iOS ネイティブのみ。
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  },
  async recognize(image): Promise<OcrResult> {
    const res = await VisionOcr.recognizeText(image);
    return { lines: res.lines };
  },
};
