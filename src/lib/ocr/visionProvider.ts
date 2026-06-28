// iOS ネイティブ Apple Vision を呼ぶ OcrProvider（§11.2）。
// JS からは Capacitor プラグイン "VisionOcr" 経由。ネイティブ(iOS)でのみ動作する。
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { OcrLine, OcrProvider, OcrResult } from "./types";

interface VisionOcrPlugin {
  recognizeText(options: {
    path?: string;
    base64?: string;
  }): Promise<{ lines: OcrLine[] }>;
  /** 端末能力（§11.9）。旧ビルド/未実装時は reject されうるので呼び出し側で握り潰す。 */
  getCapabilities(): Promise<{ onDeviceLLM: boolean }>;
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
  async capabilities() {
    // getCapabilities 未実装の古いネイティブでも壊れないよう、失敗時は非対応扱い。
    try {
      const caps = await VisionOcr.getCapabilities();
      return { onDeviceLLM: caps?.onDeviceLLM ?? false };
    } catch {
      return { onDeviceLLM: false };
    }
  },
};
