# expense-tracker

プライバシー優先の個人向け家計簿アプリ。都度支出とサブスクリプションを記録し、
月次のダッシュボード・カレンダー・値上げ（改定）ログで支出を可視化する。

## 特徴

- **完全ローカル動作**: 永続化は端末内のみ（Web=IndexedDB / モバイル=SQLite）。外部送信は一切しない。レシートOCRも端末内（Apple Vision）で完結する。
- **サブスクの二重計上なし**: サブスクは支出レコードを作らず、月集計時に動的合算する。年額プランは請求月にのみ実請求として計上（月額換算も併記）。
- **値上げの追跡**: サブスクの金額変更を改定ログとして記録。増額=赤 / 減額=緑（赤は値上げ・予算超過専用のシグナル色）。
- **金額は円・整数**: 小数は扱わない。
- **解約は論理削除**: 履歴を保持したまま集計から除外。再契約は新レコードとして作成。

## リポジトリ構成

| ディレクトリ | 内容 | 状態 |
|---|---|---|
| `/`（ルート） | **Web版 v0.1** — Next.js 16 / React 19 / Tailwind v4 / Dexie(IndexedDB) / Zustand / Recharts。Capacitor で iOS ラップ済み | v0.1 スコープ完了。RN 移行後に出荷停止予定 |
| `mobile/` | **React Native (Expo) 版** — Expo SDK 56 / expo-router / NativeWind v4 / expo-sqlite + Drizzle。ストア公開に向けた移行先（本命） | 移行進行中（ブランチ `rn-migration`） |

`mobile/` は Bulletproof React 構成（`src/{screens,features,entities,shared}`）。
Web 版のドメインロジック（月次合算・日付・プリセット・OCRパース等）を純ロジックとして移植済み。

## セットアップ

パッケージマネージャは **pnpm 固定**（npm/yarn を混ぜない）。

### Web版（ルート）

```bash
pnpm install
pnpm dev              # 開発サーバ (http://localhost:3000)
pnpm verify           # 完了判定ゲート: tsc --noEmit && eslint
pnpm build            # 本番ビルド（out/ に静的書き出し）
pnpm check:db         # データ層検証（fake-indexeddb）
pnpm e2e:expenses     # 実ブラウザ E2E（Playwright）。他: dashboard / subscriptions / changelog / settings / calendar
```

iOS（Capacitor, SPM モード・CocoaPods 不要）:

```bash
pnpm ios:sync         # next build && cap sync ios
pnpm ios:open         # Xcode で ios/App/App.xcodeproj を開く
```

詳細は `docs/ios-build.md`。

### モバイル版（mobile/）

**注意**: `mobile/` では pnpm に `--ignore-workspace` が必要（`mobile/.npmrc` 設定済み。`mobile/` ディレクトリ内で実行すれば自動適用）。

```bash
cd mobile
pnpm install
pnpm start                  # Expo 開発サーバ（i で iOS シミュレータ。ブラウザ/w は非対応: DB が expo-sqlite のため）
pnpm exec tsc --noEmit      # 型チェック
pnpm lint                   # ESLint
pnpm test                   # vitest（純ロジックのユニットテスト）
npx expo export --platform ios   # ビルド検証
```

実機ビルド（ネイティブモジュールを含むため Expo Go 不可、dev build が必要）:

```bash
pnpm build:ios:device       # tsc && expo prebuild && expo run:ios --device
```

## ドキュメント

- **[`PROJECT_PLAN.md`](./PROJECT_PLAN.md)** — 仕様の唯一のソース（SoT）。フェーズ計画・受け入れ条件・設計判断ログ・RN 移行計画（§12）
- **[`CLAUDE.md`](./CLAUDE.md)** — 開発ハーネス（作業プロトコル・ガードレール・現在地）
- `docs/` — iOS ビルド手順、サブスクプリセット調査など

## 主な機能

- **ダッシュボード**: 当月総支出（都度＋サブスク実請求）、カテゴリ別ドーナツ、月推移、月予算バーンダウン、時間帯インサイト、よく行く店 TOP5、今年の改定影響
- **支出**: 追加・編集・削除、店名記録、レシートOCR読み取り（端末内 Apple Vision → フォームにプレフィル・確認保存）
- **サブスク**: プリセットから3タップ登録、月額/年額周期、改定ログ、解約（論理削除）・再契約、ブランドロゴ（simple-icons 同梱）
- **カレンダー**: 日別の支出＋サブスク請求の読み取り専用ビュー
- **設定**: JSON バックアップ/復元、CSV エクスポート、テーマ、週次インサイト通知（端末内ローカル通知）
