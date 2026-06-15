// レシート画像の取得（§11.5 A）。カメラ撮影 or 写真ライブラリから1枚。
// 端末では @capacitor/camera が native のピッカーを出す。Web ではファイル選択にフォールバックするが、
// Vision は native のみなので OCR は走らない（呼び出し側で ocrAvailable を見て分岐する）。
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

/** 撮影/選択した画像のファイルパスを返す。キャンセル時は null。 */
export async function captureReceiptImage(): Promise<{ path: string } | null> {
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
