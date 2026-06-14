# iOS ネイティブ化 / TestFlight 配布手順

Next.js の Web アプリを **Capacitor（SPM モード）**で iOS ネイティブにラップする。
**CocoaPods / Homebrew は不要**（Swift Package Manager を使うため Xcode が依存を解決する）。
Web 側の設定と `ios/` プロジェクトは生成済み。残りは Xcode 上の署名とビルドだけ。

## 仕組み
- `next.config.ts` の `output: "export"` で全ルートを静的書き出し → `out/`
- `capacitor.config.ts`（`webDir: "out"`）が `out/` を WKWebView に同梱
- `ios/App/App.xcodeproj` … Xcode プロジェクト（**`.xcworkspace` ではない**＝CocoaPods なし）
- データは端末内 IndexedDB（外部送信なしの方針は維持）

## 前提
- ✅ Xcode（26.x 確認済み）
- ✅ iOS プロジェクト生成済み（`pnpm exec cap add ios --packagemanager SPM` 実行済み）
- 配布形態に応じた Apple アカウント
  - **実機に入れるだけ** → 無料の Apple ID で可（アプリは7日で失効、再ビルドで延長）
  - **TestFlight** → 有料の **Apple Developer Program（年 $99）**

## ビルド & 実機インストール
```bash
pnpm ios:sync   # next build + cap sync ios（Web の変更を ios/App/App/public に反映）
pnpm ios:open   # Xcode で ios/App/App.xcodeproj を開く
```
Xcode 側:
1. 左ペインで **App** ターゲット → **Signing & Capabilities**
2. **Team** に自分の Apple ID を選択（無料 Apple ID 可）。Bundle Identifier は
   `com.unz47.expensetracker`（必要なら変更）
3. 初回はパッケージ解決（Swift Package）が走るので少し待つ
4. 上部で接続した iPhone を選び ▶︎ Run → 実機にインストール
   - 初回は iPhone 側「設定 → 一般 → VPN とデバイス管理」で自分の開発者証明書を信頼

## TestFlight 配布（有料 Developer Program が必要）
1. Bundle ID `com.unz47.expensetracker` を [App Store Connect](https://appstoreconnect.apple.com) で登録
2. Xcode 上部のデバイスを **Any iOS Device** にして **Product → Archive**
3. Organizer → **Distribute App → App Store Connect → Upload**
4. App Store Connect の対象アプリ → **TestFlight** タブにビルドが上がる
5. 自分をテスターに追加 → iPhone の **TestFlight アプリ**からインストール

## Web を更新したら
`pnpm ios:sync` を流せば最新の `out/` が `ios/` に反映される（`cap add` は不要）。
ネイティブ設定（署名・アイコン等）を変えたときだけ Xcode を触る。

## 仕上げ（任意）
- **セーフエリア**: 対応済み。`viewport-fit=cover` ＋ `pt-safe`/`pb-safe`（globals.css）で
  ノッチ・ホームインジケータに重ならないようにしてある。実機で最終確認を。
- **アプリアイコン**: 既定は Capacitor のプレースホルダ。`npx @capacitor/assets generate`
  （元画像 1024×1024 を用意）か Xcode の Assets で差し替え。
- **データ移行**: 既存データは PC のブラウザにあるので、**設定 → エクスポート**で JSON を出し、
  iPhone のアプリで**インポート**すれば移せる（端末をまたぐ自動同期はしない方針）。

## 補足
- `out/` と `ios/` のビルド生成物（`App/App/public`・`DerivedData` 等）は git 管理外
  （`ios/.gitignore` を Capacitor が用意）。`ios/` プロジェクト本体はコミット対象。
- 静的書き出しのため `/subscriptions/[id]/logs` は `/subscriptions/logs?id=...` に変更済み。
