// iOS ネイティブ Apple Vision を呼ぶ OcrProvider（§11.2）。
// JS からは Capacitor プラグイン "VisionOcr" 経由。ネイティブ(iOS)でのみ動作する。
import { Capacitor } from "@capacitor/core";
import type { OcrProvider, OcrResult } from "./types";
import { VisionOcr } from "./plugin";

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
