# レシートOCR ネイティブ統合（iOS / Apple Vision）

v0.2 のレシートOCR（§11）は **iOS ネイティブの Apple Vision** で端末内 OCR する。
TS 側（パース・名寄せ・UI）は検証済み（`pnpm check:ocr`）。ここはネイティブ配線の手順。

## 構成
- JS → ネイティブの橋: Capacitor プラグイン `VisionOcr`（`registerPlugin`）。
  - JS: `src/lib/ocr/visionProvider.ts`（`recognizeText({path|base64}) → {lines}`）
  - Swift: `ios/App/App/VisionOcrPlugin.swift`（`CAPPlugin` + `CAPBridgedPlugin`、Vision で OCR）
- 撮影/選択: `@capacitor/camera`（`src/lib/ocr/capture.ts`）。
- 権限文（Info.plist 追加済み）: `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`。
- 返す座標は正規化(0〜1)・原点左下（Vision 規約）＝ TS の `OcrLine` と一致。

## ビルド手順
```bash
pnpm ios:sync   # = next build && cap sync ios（web 資産と camera プラグインを同期）
pnpm ios:open   # Xcode で ios/App/App.xcodeproj を開く（SPM モード）
```
Xcode で:
1. **`VisionOcrPlugin.swift` が App ターゲットに含まれているか確認**（File Inspector → Target Membership）。
   Xcode 16 の同期フォルダなら自動で入る。入っていなければターゲットに追加する。
2. 署名（Signing & Capabilities）→ 実機で Run（無料 Apple ID 可）。
3. 支出タブ右下の **スキャンボタン**（虫眼鏡/ScanLine）→ レシート撮影 → フォームに
   金額・店名・日付がプレフィルされることを確認。低信頼度の項目は「要確認」表示。

## 動作確認のポイント
- `VisionOcr` プラグインが登録されているか（未登録だと `recognizeText` で reject）。
  `CAPBridgedPlugin` 準拠なので Capacitor 6+ は起動時に自動登録するはず。されない場合は
  `CAPBridgeViewController` を継承して `capacitorDidLoad()` で
  `bridge?.registerPluginType(VisionOcrPlugin.self)` を呼ぶ（フォールバック）。
- カメラ/写真の権限ダイアログが出るか（Info.plist の説明文）。
- 取れ方が悪い実レシートが出たら、その OCR 結果を fixture 化して
  `scripts/check-ocr.mts` のケースに足し、`src/lib/ocr/parse.ts` を改善する
  （Vision 自体の精度はスパイクで確認済み・§11.7）。

## 検証コマンド（TS 側・端末不要）
```bash
pnpm check:ocr   # 実レシートの固定OCR結果で parseReceipt を検証
pnpm verify      # tsc + eslint
```

## スコープ外（このフェーズではやらない）
- 店名→カテゴリの自動推定（§11.6 未決）。
- 接近ナッジ／位置情報（§11.5 C・任意レイヤー）。
