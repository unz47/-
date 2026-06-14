---
name: coding-conventions
description: >-
  expense-tracker リポジトリのコーディング規約。このリポジトリ内で TypeScript /
  React / Next.js のコードを書く・直す・レビューする・リファクタするときは必ず参照する。
  金額(円・整数)・日付(date-fns)・色(CSS変数)・Dexie/IndexedDB・サブスク集計など、
  ドメイン固有の決まりが多いので、コンポーネント追加、フォーム実装、db.ts や
  aggregate.ts の編集、Zustand ストア配線、shadcn/ui コンポーネント追加の前に開くこと。
  「規約に沿ってる?」「このコードでいい?」と聞かれたときもこれで確認する。
---

# expense-tracker コーディング規約

ローカル・シングルユーザーの個人支出管理アプリ。仕様の SoT は
[`PROJECT_PLAN.md`](../../../PROJECT_PLAN.md)、運用ルールは
[`CLAUDE.md`](../../../CLAUDE.md)。本 skill は**コードをどう書くか**に集中する。
迷ったら PROJECT_PLAN.md §10「設計判断ログ」が最終的に優先。

## 完了の最低条件

コード変更は `pnpm verify`（= `tsc --noEmit && next lint`）が緑で初めて完了扱い。
赤のまま次に進まない。pnpm 固定（npm/yarn を混ぜない）。

## TypeScript

- **strict 前提**。`any` を使わない。外部由来で型が不明なら `unknown` で受けて絞り込む。
- 関数の境界（公開関数・ストア・lib）は引数と戻り値に型を付ける。内部の自明な推論は任せてよい。
- ドメイン型（`Expense` / `Category` / `Subscription` / `SubscriptionChangeLog`）は
  `src/lib/db.ts` を単一の定義源にし、各所で再定義しない。import して使う。

## 金額は「円・整数」

小数を持たない。これはデータモデルの不変条件。

```ts
// Bad — 小数や浮動小数の計算を持ち込む
const tax = amount * 0.1;            // 端数が混入する
const total = items.reduce((a, b) => a + b.amount, 0) / 12;  // 月割で小数化

// Good — 整数で完結させ、割る場合は丸めを明示
const monthly = Math.round(yearly / 12);   // 年額→月割は整数に丸める(§5 Amazon年額の例)
```

表示整形は `Intl.NumberFormat('ja-JP')` 等で行い、保持する値は整数のまま。

## 日付

- `date-fns` を使う。月境界・当月判定・フォーマットを自前の文字列操作でやらない。
- モデルの形式を守る: `Expense.date` / `Subscription.startedAt` などは `YYYY-MM-DD`、
  `createdAt` / `changedAt` などタイムスタンプは ISO 文字列。
- 月次集計の境界は date-fns の `startOfMonth` / `endOfMonth` で。

## 色・テーマ

- 色は `src/styles/globals.css` の CSS 変数経由（`var(--color-...)` / Tailwind `@theme` 参照）。
  生のカラーコード（`#2DD4BF` 等）をコンポーネントに直書きしない。
- **赤 `--color-danger` は「値上げ・予算超過」専用**。装飾・通常の強調に赤を使わない。
- サブスク改定の表示: 増額 = `--color-danger`、減額 = `--color-success`、プラン変更 = ニュートラル。
- カテゴリ別グラフは PROJECT_PLAN §3 のパレットを順番に割り当てる。

## ドメインのルール（§10 がコードにどう効くか）

これらは設計判断であり、コードで破ってはいけない。

### 1. サブスクは Expense に実体を作らない
月次集計時に動的合算する（二重計上・解約整合性の回避）。サブスクの月額を
`expenses` テーブルへ INSERT しない。

```ts
// Bad — 毎月サブスクを Expense として書き込む
await db.expenses.add({ ...sub, date: `${ym}-${sub.billingDay}` });

// Good — 集計時にアクティブなサブスクを合算（src/lib/aggregate.ts）
// 条件: startedAt <= 月末 かつ (canceledAt 未設定 or canceledAt >= 月初)
const subTotal = activeSubs(subs, ym).reduce((a, s) => a + s.amount, 0);
const monthTotal = expenseTotal + subTotal;
```

### 2. 解約は論理削除
`canceledAt` に日付をセットする。レコードを物理削除しない（履歴・改定ログ保持のため）。

### 3. プリセット価格は固定初期値
`src/lib/presets.ts` の値は目安。最新価格を取得しに行かない。ユーザー上書き前提。

### 4. 永続化は IndexedDB のみ
サーバー送信・外部 API 送信を一切しない（プライバシー優先）。`fetch` で
ユーザーデータを外へ出すコードを書かない。バックアップは手動 JSON エクスポート。

### 5. サブスク更新時は changelog を残す
`amount` / `planName` を変更したら `subChangeLogs` に diff を1件記録する
（価格改定検知のため）。変更なしのときは記録しない。

## データ層 / 状態

- DB アクセスは Dexie（`src/lib/db.ts`）。スキーマ変更は `version().stores()` で
  バージョンを上げる。
- 状態は Zustand。一覧系は Dexie のライブクエリと配線し、手動リフェッチを増やさない。
- 月次合算ロジックは `src/lib/aggregate.ts` に集約し、コンポーネントへ散らさない。

## ディレクトリ・スタイル

- 配置は PROJECT_PLAN §8 に従う（`src/lib` / `src/store` / `src/components/{charts,forms,ui}`）。
- `src/components/ui/` は shadcn/ui 生成物。必要分だけ導入する。
- 既存ファイルの命名・構成・コメント密度に合わせる。周囲のコードと読み味を揃える。

## スコープ外（書かない）

PROJECT_PLAN §9 の v0.2 以降機能（OCR/Vision、予算アラート、CSV取込、クラウド同期、
PWA・通知、認証）は v0.1 では実装しない。「足しやすい設計」にするのは可。
要望が来たら v0.2 案件として切り出す。
