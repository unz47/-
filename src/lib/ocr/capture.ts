// レシート画像の取得（§11.5 A）。
// iOS では VisionKit ドキュメントスキャナ（縁検出・台形補正・コントラスト強調）を使う＝OCR 精度の要（§11.9）。
// スキャナが使えない環境（Web / 旧ビルド）は @capacitor/camera のカメラ/ライブラリ選択にフォールバックする。
// Vision OCR 自体は native のみなので、Web では OCR は走らない（呼び出し側で ocrAvailable を見て分岐）。
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { VisionOcr } from "./plugin";

/** 撮影/選択した画像のファイルパスを返す。キャンセル時は null。 */
export async function captureReceiptImage(): Promise<{ path: string } | null> {
  // iOS: ドキュメントスキャナ優先（補正済み画像で OCR 精度が上がる）。
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
    try {
      const res = await VisionOcr.scanDocument();
      if (res.canceled) return null; // ユーザーが明示的にキャンセル
      if (res.path) return { path: res.path };
      // path も canceled も無い異常時は下のカメラへフォールバック
    } catch {
      // スキャナ非対応/旧ビルド等 → カメラにフォールバック
    }
  }

  // フォールバック: 従来のカメラ/写真ライブラリ選択。
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt, // 「カメラ / 写真ライブラリ」を選ばせる
      quality: 80,
      correctOrientation: true,
      presentationStyle: "fullscreen",
    });
    const path = photo.path ?? photo.webPath;
    return path ? { path } : null;
  } catch {
    // ユーザーキャンセル等
    return null;
  }
}
