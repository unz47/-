# CLAUDE.md — 開発ハーネス

> このファイルは毎セッション読み込まれる**規範**。実装の唯一の仕様源（SoT）は
> [`PROJECT_PLAN.md`](./PROJECT_PLAN.md)。本書は計画を複製せず、**計画を安全に実行させるための足場**だけを書く。
> 仕様が衝突したら PROJECT_PLAN.md が優先。本書は「どう進めるか」だけを定める。

## 0. 作業プロトコル（毎回これに従う）

1. **PROJECT_PLAN.md を開き、§7 のチェックボックスで現在地を確認**してから着手する。
2. フェーズは上から順に。**完了 = そのフェーズの「受け入れ条件」を満たす**こと。自己申告で完了にしない。
3. 1タスク = 「実装 → `pnpm verify` 緑 → 受け入れ条件を満たすことを確認 → チェックボックスを `[x]`」。
4. **迷ったら §10 設計判断ログに従う。勝手に拡張しない**（§3 のガードレール参照）。
5. 重要な設計判断・方針変更をしたら、PROJECT_PLAN.md の該当箇所と本書「現在地」を更新する。

## 1. コマンド（検証ゲート）

> scaffold（Phase 1）完了までは未整備。Phase 1 で package.json に下記スクリプトを定義する。

```bash
pnpm install          # 依存導入
pnpm dev              # 開発サーバ
pnpm verify           # ★完了判定ゲート: typecheck && lint （= tsc --noEmit && next lint）
pnpm build            # 本番ビルド（最終確認）
```

- **`pnpm verify` が緑であることがコード変更の完了の最低条件**。赤のまま次タスクに進まない。
- パッケージマネージャは **pnpm 固定**（npm/yarn を混ぜない）。

## 2. ディレクトリ規約

実体は §8 を SoT とする。要点のみ:
- `src/lib/` … DB(`db.ts`) / プリセット(`presets.ts`) / 月次合算(`aggregate.ts`)
- `src/store/` … Zustand ストア（Dexie ライブクエリと配線）
- `src/components/{charts,forms,ui}/` … `ui/` は shadcn 生成物
- 既存ファイルの構成・命名・コメント密度に合わせて書く。

## 3. ガードレール（越えてはならない壁）

### やらないこと（§9 スコープ外 / v0.1）
- レシートOCR・Claude Vision 連携 / 月予算・予算アラート / CSV取込 / クラウド同期 / PWA・通知 / 複数ユーザー・認証。
- これらを「足しやすい形」に設計するのは可。**実装はしない**。要望が来たら v0.2 案件として切り出す。

### 必ず守る設計判断（§10）
- **サブスクは Expense に実体を作らない**。月集計時に動的合算（§4）。二重計上を避ける。
- **プリセット価格は固定初期値**。最新価格を調べに行かない。ユーザー上書き前提。
- **永続化は IndexedDB のみ**。サーバー送信・外部API送信は一切しない（プライバシー優先）。
- **赤(`--color-danger`)は値上げ/予算超過専用**。装飾に赤を使わない。改定: 増額=danger / 減額=success。
- **解約は論理削除**（`canceledAt` セット）。レコードは消さない。
- **金額は円・整数**。小数を持たない。

### コード規約 / デザイン規約（skill に分離）
- コード記述スタイル（TS strict・円整数・色は CSS 変数経由・date-fns・データ層、
  §10 がコードにどう効くかの例）→ **`coding-conventions` skill**。
- UI/UX（Midnight Ledger ダークテーマ・シグナル色の規律・カテゴリパレット・画面別レイアウト・
  shadcn/Recharts/lucide の使い方）→ **`design-conventions` skill**。
- 該当作業の前にそれぞれ参照する。汎用のモダン規約は `modern-web-guidance` /
  `vercel-react-best-practices` / `frontend-design` skill が自動で補う。

## 4. フェーズ別 完了の定義（受け入れ条件は §7 が SoT）

| Phase | 完了の決め手 |
|---|---|
| 1 基盤 | DBにレコードを入れてリロード後も残る + `pnpm verify` 緑 |
| 2 都度支出 | 追加→一覧反映→編集→削除が一通り動く |
| 3 ダッシュボード | サブスク分が当月合計に正しく合算される（§4 合成ルール） |
| 4 サブスク | プリセットから3タップで契約登録、月額合計が正しい |
| 5 変更ログ | 金額変更でログ+1、増額=赤/減額=緑で表示 |
| 6 設定・バックアップ | エクスポート→DBクリア→インポートで復元できる |

## 5. コミット規約

- ユーザーが明示したときだけコミット/プッシュする。
- 1コミット = 1論理単位（理想は1タスク or 1受け入れ条件）。
- メッセージは日本語可。先頭に対象フェーズを添える例: `Phase1: Dexie スキーマと初期カテゴリ seed`。

## 6. 現在地（セッション間で引き継ぐ）

- **Phase 1〜6 すべて完了（v0.1 スコープ達成）**。全フェーズの受け入れ条件を実ブラウザ E2E で検証済み。
  - 全 E2E: `pnpm e2e:{expenses,dashboard,subscriptions,changelog,settings}` + データ層 `pnpm check:db`（Playwright/Chromium）。
  - 完了ゲート: `pnpm verify`（tsc + eslint）/ `pnpm build` 緑。
  - 今後（v0.2 以降の要望が来たら）: §9 スコープ外（OCR/予算/CSV/クラウド同期/PWA/認証）を別フェーズで切り出す。
  - 不変条件の再掲: 円整数 / 色は CSS 変数経由 / 赤=値上げ・超過専用 / サブスクは集計時動的合算（実体作らない）/
    解約=論理削除 / 永続化は IndexedDB のみ・外部送信なし / React key は一意 ID。
  - **v0.1.x 改修（2026-06-14）**: サブスクに請求周期を追加（`billingCycle` 'monthly'|'yearly' + `billingMonth?`、db v2 マイグレーション）。
    集計は「月額換算(monthlyEquivalent)」と「当月実請求(actualChargeInMonth)」の2系統（aggregate.ts）。
    ダッシュボード当月総支出・月推移・カテゴリ別は当月実請求基準（年額は請求月にスパイク）、UI に月額換算を併記。PROJECT_PLAN §4/§10 更新済み。
  - 進行中: サブスクのプリセット拡張（約66サービス、`docs/subscription-research.md`）と
    ロゴ表示（`simple-icons` バンドル＋頭文字アバター。外部CDN不可）。**未着手**。プリセットを cycle-aware で投入する。
  - **手入力導線改善（2026-06-14）**: 登録フローのサービス選択画面の先頭に「＋ 手入力で追加」を独立配置。
    プリセット一覧からは custom を除外し手入力ボタンに集約（`subscription-new-flow.tsx`）。実ブラウザ検証済み。
  - **カレンダー実装済み（2026-06-14, v0.1.x）**: `/calendar` を**読み取り専用ビュー**として実装。
    当月実請求（§4）を `lib/calendar.ts`（`buildCalendarMonth`）で日グリッドへ並べ替えるだけ
    （`billingDay`/`billingMonth` と `Expense.date` を使用、スキーマ変更・新エンティティなし）。
    `components/calendar/{calendar-grid,day-detail}.tsx` + `app/calendar/page.tsx`、
    タブバーに「カレンダー」追加（全5タブ）。Figma（node 26:15）準拠。月合計は `monthSummary.total` と一致。
    検証: `pnpm e2e:calendar` + `pnpm verify`/`pnpm build` 緑。
    予算は **v0.2**。「日別予算割当」は採らず、月予算＋カレンダー上の消化ペース（バーンダウン、超過=danger）で設計。
  - **サブスク導線改善（2026-06-14）**: 編集・解約が埋もれていた問題を解消。カードは全体が単一タップ標的になり、
    右の「⋯」から **アクションシート（改定ログ / 編集 / 解約）** を開く（`components/subscriptions/subscription-actions.tsx`、
    Dialog ボトムシート流用）。解約は確認 1 段の論理削除で、**赤は値上げ専用のため destructive でも赤を使わない**。
    `SubscriptionCard` は `onEdit`/`onShowLogs` を `onOpenActions` に集約。e2e:subscriptions / e2e:changelog を新フローに更新。物理削除は未提供（方針未確定）。
- 確定した環境/規約:
  - Next.js **16**（Turbopack 既定）/ React 19 / Tailwind v4。`next lint` は廃止のため
    **`pnpm verify` = `tsc --noEmit && eslint`**（CLAUDE.md §1 の表記より実体はこちら）。
  - globals.css は `src/styles/globals.css`（`@theme` に Midnight Ledger パレット）。
  - shadcn は init を使わず、`src/components/ui/` に Midnight Ledger 準拠で手配線
    （Radix プリミティブ + `cn`）。テーマ衝突回避のため。
  - データ層検証は **`pnpm check:db`**（fake-indexeddb / `scripts/check-db.mts`）。
  - PostToolUse 型チェック hook 設置済み（`.claude/hooks/typecheck.sh`、ts/tsx 編集時 tsc）。
- 既存実体: `src/lib/{db,presets,aggregate,colors,seed,utils}.ts`、
  `src/store/{useExpenseStore,useSubscriptionStore}.ts`、`src/components/ui/{tab-bar,card}.tsx`、
  各ルートの暫定ページ（`/` はカテゴリ表示の暫定ダッシュボード）。
