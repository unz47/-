# iOS ネイティブ化 / TestFlight 配布手順

このアプリ（Next.js の Web アプリ）を **Capacitor** で iOS ネイティブにラップし、
実機インストール or TestFlight 配布する手順。Web 側の設定（静的書き出し＋Capacitor）は
セットアップ済み。残りは Mac 上の対話作業（CocoaPods / Xcode / Apple アカウント）。

## 仕組み
- `next.config.ts` の `output: "export"` で全ルートを静的書き出し → `out/`
- `capacitor.config.ts` が `webDir: "out"` を参照し、`out/` を WKWebView に同梱
- データは従来どおり端末内 IndexedDB（外部送信なしの方針は維持）

## 前提
- ✅ Xcode（26.x 確認済み）
- ❌ **CocoaPods**（未インストール。下記で入れる）
- 配布形態に応じて Apple アカウント
  - **実機に直接入れるだけ** → 無料の Apple ID で可（アプリは7日で失効、再ビルドで延長）
  - **TestFlight** → 有料の **Apple Developer Program（年 $99）** が必要

## 1. CocoaPods を入れる（初回のみ）
システム Ruby は 2.6 で古いため、Homebrew 経由が安全。

```bash
# Homebrew（未導入なら）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# CocoaPods
brew install cocoapods
pod --version   # 確認
```

> `sudo gem install cocoapods` でも入るが、Ruby 2.6 だと失敗しがちなので Homebrew 推奨。

## 2. iOS プロジェクトを生成（初回のみ）
```bash
pnpm build                 # out/ を作る
pnpm exec cap add ios      # ios/ プロジェクト生成（pod install が走る）
```
`ios/` が作られる。以後この中の Xcode プロジェクトを使う。

## 3. ビルド & 実機インストール
```bash
pnpm ios:sync   # next build + cap sync ios（Web の変更を ios/ に反映）
pnpm ios:open   # Xcode で ios/App/App.xcworkspace を開く
```
Xcode 側:
1. 左ペインで **App** ターゲット → **Signing & Capabilities**
2. **Team** に自分の Apple ID を選択（無料 Apple ID 可）。Bundle Identifier は
   `com.unz47.expensetracker`（必要なら変更）
3. 上部で接続した iPhone を選び ▶︎ Run → 実機にインストール
   - 初回は iPhone 側で「設定 → 一般 → VPN とデバイス管理」で自分の開発者証明書を信頼

## 4. TestFlight 配布（有料 Developer Program が必要）
1. Bundle ID `com.unz47.expensetracker` を [App Store Connect](https://appstoreconnect.apple.com) で登録
2. Xcode: 上部のデバイスを **Any iOS Device** にして **Product → Archive**
3. Organizer → **Distribute App → App Store Connect → Upload**
4. App Store Connect の対象アプリ → **TestFlight** タブにビルドが上がる
5. 自分をテスターに追加 → iPhone の **TestFlight アプリ**からインストール

## Web を更新したら
`pnpm ios:sync` を流せば `out/` の最新が `ios/` に反映される（毎回 `cap add` は不要）。
ネイティブ設定（署名・アイコン等）を変えたときだけ Xcode を触る。

## 仕上げ（任意・未対応）
- **セーフエリア**: 下部タブバーが `fixed bottom-0` のため、ホームインジケータに重なる。
  `env(safe-area-inset-bottom)` 対応 or `@capacitor/status-bar` の導入が望ましい（要望あれば対応）。
- **アプリアイコン**: 既定は Capacitor のプレースホルダ。`npx @capacitor/assets generate`
  か Xcode の Assets で差し替え。
- **データ移行**: 既存データは PC のブラウザにあるので、**設定 → エクスポート**で JSON を出し、
  iPhone のアプリで**インポート**すれば移せる（端末をまたぐ自動同期はしない方針）。

## 補足
- `out/` `ios/Pods` などビルド生成物は git 管理外（`ios/` の `.gitignore` は cap が用意）。
- 静的書き出しのため `/subscriptions/[id]/logs` は `/subscriptions/logs?id=...` に変更済み
  （動的ルートは静的書き出しできないため）。
