# PROJECT_PLAN.md — サブスク対応 個人支出管理アプリ

> Claude Code 引き継ぎ用ドキュメント / v0.1
> 作成日: 2026-06-14

## 0. このドキュメントの使い方（Claude Code向け）

- このファイルを repo ルートに置き、上から順に実装する。
- 各タスクは「受け入れ条件」を満たしたら完了とみなす。
- 仕様で迷ったら §10 の設計判断ログに従う。勝手に拡張しない。
- v0.1 のスコープ外（§9）には手を出さない。

---

## 1. プロダクト概要

個人専用の支出管理アプリ。普通の都度支出に加えて、**サブスク（月額固定費）を契約として登録し、毎月自動計上**できるのが特徴。サブスクの金額・プランはユーザーが上書きでき、**上書き時に変更ログを残して価格改定を検知**できる。

- シングルユーザー / 認証なし
- データは端末内（IndexedDB）に永続化
- OCR・クラウド同期・課金は v0.1 対象外（§9 将来拡張）

### コア価値
1. 都度支出をサッと記録 → 一覧・カテゴリ別集計で見える化
2. サブスクをプリセットから数タップで契約登録 → 月額合計が常に見える
3. サブスク価格を上書きすると改定ログが残り、値上げ/値下げを追える

---

## 2. 技術スタック

| 領域 | 採用 | 備考 |
|---|---|---|
| フレームワーク | Next.js (App Router) | SSGベース、個人用なのでサーバー不要 |
| 言語 | TypeScript | strict |
| 永続化 | IndexedDB（Dexie.js） | 端末内。手動エクスポートでバックアップ |
| 状態管理 | Zustand | 軽量。Dexie のライブクエリと併用 |
| グラフ | Recharts | 円グラフ・棒グラフ |
| スタイル | Tailwind CSS v4 | CSS変数でテーマ管理 |
| UI | shadcn/ui | 必要分のみ導入 |
| アイコン | lucide-react | |
| 日付 | date-fns | 月境界・フォーマット |

> ともやの既存環境（Nix / ghq / Claude Code）前提。`pnpm` を使用。

---

## 3. カラーパレット「Midnight Ledger」

`globals.css` に CSS 変数で定義。Tailwind v4 の `@theme` で参照する。

```css
:root {
  /* 背景・面 */
  --color-base: #0B0E14;
  --color-surface: #151A23;
  --color-surface-raised: #1E242F;
  --color-border: #2A313D;
  /* テキスト */
  --color-text-primary: #E6EAF0;
  --color-text-secondary: #9BA4B4;
  --color-text-muted: #5C6678;
  /* アクセント */
  --color-accent: #2DD4BF;
  --color-accent-dim: #14B8A6;
  --color-accent-glow: #5EEAD4;
  /* 機能色（シグナル：絞って使う） */
  --color-success: #34D399; /* 減額・予算内 */
  --color-danger:  #F87171; /* 増額・予算超過 */
  --color-warning: #FBBF24; /* 予算接近 */
  --color-info:    #60A5FA;
}
```

カテゴリ別グラフ用パレット（順番に割り当て）:
`#2DD4BF #818CF8 #F472B6 #FBBF24 #34D399 #22D3EE`

ルール:
- 赤は「値上げ・予算超過」だけに使う。装飾に使わない。
- サブスク改定ログ: 増額=danger、減額=success。

---

## 4. データモデル（IndexedDB / Dexie）

```ts
// db.ts
import Dexie, { Table } from 'dexie';

export interface Expense {
  id: string;            // uuid
  date: string;          // YYYY-MM-DD
  amount: number;        // 円（整数）
  categoryId: string;
  memo?: string;
  createdAt: string;     // ISO
}

export interface Category {
  id: string;
  name: string;
  color: string;         // パレットから
  isDefault: boolean;
}

export type BillingCycle = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  serviceName: string;   // "Netflix"
  planName: string;      // "スタンダード"
  amount: number;        // その請求周期 1 回あたりの実額（円・整数）。yearly なら年額そのもの。
  billingCycle: BillingCycle; // 'monthly' | 'yearly'（v2 で追加。既存は monthly に移行）
  categoryId: string;    // 既定: "サブスク"
  billingDay: number;    // 1-31 課金日
  billingMonth?: number; // 1-12。yearly のとき請求月。未設定なら startedAt の月にフォールバック
  startedAt: string;     // YYYY-MM-DD 契約開始
  canceledAt?: string;   // 解約日。あれば以降は計上しない
  presetId?: string;     // プリセット由来なら参照
  createdAt: string;
}

// サブスク変更ログ（価格改定検知）
export interface SubscriptionChangeLog {
  id: string;
  subscriptionId: string;
  field: 'amount' | 'planName';
  oldValue: string | number;
  newValue: string | number;
  changedAt: string;     // ISO
}

export class AppDB extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  subscriptions!: Table<Subscription, string>;
  subChangeLogs!: Table<SubscriptionChangeLog, string>;
  constructor() {
    super('expense-tracker');
    this.version(1).stores({
      expenses: 'id, date, categoryId',
      categories: 'id',
      subscriptions: 'id, serviceName, canceledAt',
      subChangeLogs: 'id, subscriptionId, changedAt',
    });
    // v2: billingCycle / billingMonth を追加。既存サブスクは monthly に移行。
    this.version(2).upgrade(async (tx) => {
      await tx.table('subscriptions').toCollection().modify((s) => {
        if (s.billingCycle === undefined) s.billingCycle = 'monthly';
      });
    });
  }
}
export const db = new AppDB();
```

### 月次支出の合成ルール（重要）
サブスクは請求周期（monthly / yearly）を持つ。集計は **2 系統** を用意する:

- **月額換算 (monthlyEquivalent)**: ランニングコスト。yearly は `Math.round(amount / 12)`、monthly は `amount`。
  サブスク一覧の「月額合計」や、ダッシュボードの「サブスク月額換算」に使う。
- **当月実請求 (actualChargeInMonth)**: 実キャッシュフロー。monthly はその月アクティブなら `amount`、
  yearly は **請求月（`billingMonth` ?? `startedAt` の月）に一致する月だけ `amount`**、他月は 0。

ある月 `YYYY-MM` の**当月総支出（実支出）** =
1. その月に属する `Expense` の合計（date が当月）
2. ＋ アクティブな `Subscription` の **当月実請求** 合計
   - アクティブ条件: `startedAt <= 月末` かつ（`canceledAt` 未設定 or `canceledAt >= 月初`）
   - サブスクは Expense テーブルに**実体を作らず**、月集計時に動的に合算する（二重計上を避ける）。
   - 月推移・カテゴリ別内訳も「当月実請求」で算出する（年額は請求月にスパイクとして現れる）。
   - 表示上は一覧で「サブスク（自動）」セクションとして分けて見せ、月額換算を併記する。

---

## 5. プリセット（初期サブスク候補）

`presets.ts` に定数で持つ。価格は**目安初期値**でユーザー上書き前提。
2026年時点の目安。Claude Code は実装時に最新価格を確認せず、この値で固定してよい（ユーザーが直す）。

```ts
export const SUBSCRIPTION_PRESETS = [
  { id: 'netflix', service: 'Netflix', plans: [
    { name: '広告つきスタンダード', amount: 890 },
    { name: 'スタンダード', amount: 1590 },
    { name: 'プレミアム', amount: 2290 },
  ]},
  { id: 'spotify', service: 'Spotify', plans: [
    { name: 'Standalone', amount: 980 },
    { name: 'Duo', amount: 1280 },
    { name: 'Family', amount: 1580 },
  ]},
  { id: 'amazon-prime', service: 'Amazon Prime', plans: [
    { name: '月額', amount: 600 },
    { name: '年額(月割)', amount: 492 },
  ]},
  { id: 'youtube-premium', service: 'YouTube Premium', plans: [
    { name: '個人', amount: 1280 },
    { name: 'ファミリー', amount: 2280 },
  ]},
  { id: 'chatgpt', service: 'ChatGPT', plans: [
    { name: 'Plus', amount: 3000 },
  ]},
  { id: 'apple-music', service: 'Apple Music', plans: [
    { name: '個人', amount: 1080 },
    { name: 'ファミリー', amount: 1680 },
  ]},
  { id: 'custom', service: 'その他（手入力）', plans: [] },
];
```

---

## 6. 画面構成

```
/                ダッシュボード（当月サマリー + カテゴリ円グラフ + 月推移）
/expenses        支出一覧（月フィルタ・編集・削除）
/expenses/new    支出追加（モーダル or ページ）
/subscriptions   サブスク一覧（月額合計・契約/解約・編集）
/subscriptions/new  プリセット選択フロー
/subscriptions/[id]/logs  改定ログ
/calendar        カレンダー（当月の課金日・支出を月グリッドで可視化）★v0.1.x
/settings        カテゴリ管理・データのエクスポート/インポート
```

### ダッシュボード（/）
- 当月の総支出（都度＋サブスク）を大きく表示、アクセント色
- サブスク月額合計を併記
- カテゴリ別 円グラフ（Recharts, パレット適用）
- 直近6ヶ月の月推移 棒グラフ

### サブスク一覧（/subscriptions）
- 上部に「月額合計 ¥X,XXX / Y件」
- 各行: サービス名・プラン・金額・課金日・編集・解約
- 金額編集時 → 変更があれば changelog に記録
- 「改定あり」バッジ（直近30日で amount 変更があった契約）

### プリセット選択フロー（/subscriptions/new）
1. サービス選択（プリセット一覧 + 「その他」）
2. プラン選択 → 金額自動入力（編集可）
3. 課金日・開始日入力
4. 登録

### 改定ログ（/subscriptions/[id]/logs）
- 時系列リスト。増額=赤、減額=緑、プラン変更=ニュートラル
- 「890円 → 1,590円（+700）2026-05-01」形式

### カレンダー（/calendar）★v0.1.x（読み取り専用ビュー）
- 当月の月グリッド。各日に「その日に発生する支出・サブスク課金」をドット/金額で表示。
- データソースは既存集計の **当月実請求（actualChargeInMonth, §4）** をそのまま時間軸へ並べ替えるだけ。
  サブスクは `billingDay`（月額）/ `billingMonth`＋`billingDay`（年額の請求月）から課金日を決定。
  `canceledAt` 済みは除外。`Expense` は `date` で配置。
- **スキーマ変更なし・マイグレーション不要**。新エンティティを作らない＝v0.1 ガードレール（集計時動的合算）を維持。
- 予算機能はここに**載せない**（§9 参照。予算は v0.2 で月予算＋消化ペースとして別設計）。

---

## 7. 実装フェーズとタスク

### Phase 1: 基盤
- [x] Next.js + TS + Tailwind v4 + shadcn/ui セットアップ（Next 16 / React 19 / Tailwind 4）
- [x] Midnight Ledger パレットを globals.css / theme に反映（`src/styles/globals.css`、`@theme`）
- [x] Dexie スキーマ実装（§4）、初期カテゴリ seed（食費/日用品/交通/娯楽/サブスク/その他）
- [x] Zustand ストア + Dexie ライブクエリ配線（`src/store/`、`dexie-react-hooks`）
- 受け入れ条件: DBにレコードを入れてリロード後も残る
  → ✅ `pnpm check:db`（fake-indexeddb）で seed 冪等性・読み戻し・§4 合算・論理削除を検証。
    `pnpm verify` / `pnpm build` 緑、dev サーバ起動・全ルート 200。

### Phase 2: 都度支出
- [x] 支出追加フォーム（日付・金額・カテゴリ・メモ）— `components/forms/expense-form.tsx`（追加/編集兼用ダイアログ）
- [x] 支出一覧（月フィルタ・編集・削除）— `app/expenses/page.tsx` + `components/expenses/expense-list.tsx`（日別グルーピング・FAB）
- 受け入れ条件: 追加→一覧反映→編集→削除が一通り動く
  → ✅ `pnpm e2e:expenses`（Playwright）で 追加→反映→編集→削除→リロード永続化 を実ブラウザ検証。
- 補足: Category に `order` を追加し、選択肢/凡例/グラフで安定した表示順を共有（食費→日用品→交通→娯楽→サブスク→その他）。

### Phase 3: ダッシュボード
- [x] 当月サマリー（都度＋サブスク合算ロジック §4）— `app/page.tsx` ヒーロー（総支出/サブスク月額/前月比）
- [x] カテゴリ別円グラフ — `components/charts/category-donut.tsx`（Recharts ドーナツ + カスタム凡例）
- [x] 月推移棒グラフ — `components/charts/month-trend-bars.tsx`（直近6ヶ月、当月をアクセント色）
- 受け入れ条件: サブスク分が当月合計に正しく合算される
  → ✅ `pnpm e2e:dashboard`（Playwright）で 都度+サブスク=総支出・凡例合算 を実ブラウザ検証。
- 注意: 凡例/Cell の React key は `categoryId`（name だと未ロード時に全て「不明」で key 衝突→重複描画）。
  前月比は赤を使わず ▲▼＋ニュートラル色（赤=値上げ/超過専用のため）。

### Phase 4: サブスク（コア機能）
- [x] プリセット定義（§5）— `lib/presets.ts`
- [x] プリセット選択フロー（サービス→プラン→金額自動入力）— `components/forms/subscription-new-flow.tsx`（3ステップ・ダイアログ）
- [x] サブスク一覧（月額合計・課金日・解約）— `app/subscriptions/page.tsx` + `components/subscriptions/subscription-card.tsx`
- [x] 金額/プラン編集 — `components/forms/subscription-edit-form.tsx`（解約=論理削除も）
- 受け入れ条件: プリセットから3タップで契約登録、月額合計が正しい
  → ✅ `pnpm e2e:subscriptions`（Playwright）で 3タップ登録・月額合計合算・編集反映・解約 を実ブラウザ検証。
- 注: 登録フローは /subscriptions/new ページではなくボトムシート型ダイアログで実装（モバイルUX/3タップ感優先）。
- 手入力導線: サービス選択画面の先頭に「＋ 手入力で追加」を独立配置（プリセットに無いサービス用）。
  プリセット一覧からは custom（その他）を除外し、手入力ボタンに集約。`pnpm e2e:subscriptions` 緑を維持。

### Phase 5: 変更ログ（改定検知）
- [x] サブスク更新時に diff を検知し changelog 記録 — `useSubscriptionStore.updateSubscription`（amount/planName）
- [x] 改定ログ画面（増減色分け・差分表示）— `app/subscriptions/[id]/logs/page.tsx`（時系列・契約開始を合成）
- [x] 一覧に「改定あり」バッジ — `useRecentlyRaisedSubIds`（直近30日の増額）→ カードに値上げバッジ
- 受け入れ条件: 金額を変更するとログが1件増え、増額が赤・減額が緑で表示
  → ✅ `pnpm e2e:changelog`（Playwright）で ログ+1・増額=赤/減額=緑（computed color 検証）・契約開始合成 を実ブラウザ検証。
- 導線（更新）: サブスクカードは全体が単一のタップ標的で、右の「⋯」からアクションシート
  （改定ログ / 編集 / 解約）を開く（`subscription-actions.tsx`）。編集・解約が埋もれていた問題を解消。
  解約は確認を 1 段挟む論理削除（赤は値上げ専用のため destructive でも赤は使わない）。
  e2e は `⋯ → 編集/改定ログ/解約` の新フローに更新済み。

### Phase 6: 設定・バックアップ
- [x] カテゴリ管理（追加・色変更・削除）— `app/settings/page.tsx`（既定カテゴリは削除不可、色はパレットから選択）
- [x] 全データ JSON エクスポート / インポート — `lib/backup.ts`（export/import/clearAll、形式バリデーション付）
- 受け入れ条件: エクスポート→DBクリア→インポートで復元できる
  → ✅ `pnpm e2e:settings`（Playwright）で カテゴリ追加/削除・エクスポート→全削除→インポート復元 を実ブラウザ検証。

### v0.1.x: カレンダー（読み取り専用ビュー / §6 ・§10）
- [x] カレンダー集計 — `lib/calendar.ts`（`buildCalendarMonth`。当月実請求 §4 を日グリッドへ並べ替え。
  サブスクは `billingDay`/`billingMonth`、Expense は `date` で配置。スキーマ変更・新エンティティなし）
- [x] 月グリッド — `components/calendar/calendar-grid.tsx`（日曜始まり・カテゴリ色ドット＋サブスク課金アイコン・
  今日=アクセント・選択日=リング）
- [x] 選択日内訳 — `components/calendar/day-detail.tsx`（都度 ＋ サブスク課金「自動」を一覧）
- [x] ページ＋月ナビ — `app/calendar/page.tsx`（`< 月 >` ＋「今月」、ヒーローに当月実請求と都度/サブスク併記）
- [x] タブ追加 — `components/ui/tab-bar.tsx` に「カレンダー」（ホームの次・全5タブ）
- 受け入れ条件: 当月の課金日・支出が月グリッドに並び、選択日内訳に都度＋サブスクが出る。月合計は `monthSummary.total` と一致。
  → ✅ `pnpm e2e:calendar`（Playwright）で ヒーロー実請求合算・内訳併記・選択日内訳（都度＋サブスク課金）を実ブラウザ検証。
    `pnpm verify` / `pnpm build` 緑。Figma（node 26:15）とレイアウト一致を確認。

---

## 8. ディレクトリ構成（目安）

```
src/
  app/
    page.tsx                 # ダッシュボード
    expenses/
    subscriptions/
    settings/
  lib/
    db.ts                    # Dexie
    presets.ts
    aggregate.ts             # 月次合算ロジック
  store/
    useExpenseStore.ts
    useSubscriptionStore.ts
  components/
    charts/
    forms/
    ui/                      # shadcn
  styles/globals.css
```

---

## 9. v0.1 スコープ外（将来拡張・実装しない）

- レシートOCR（Claude Vision API連携）→ v0.2 で別フェーズ
- 月予算・予算アラート → v0.2。**設計方針: 「日別予算割当」は採らない**（入力負荷が高くニッチ）。
  代わりに **月予算（任意でカテゴリ別）1本＋カレンダー上の消化ペース（バーンダウン）** で見せる。
  超過表示には予約済みの `--color-danger`（＝超過専用）を用いる。新エンティティ `budgets` を v0.2 で追加。
- CSV取込 → v0.2
- クラウド同期（AWS/Supabase）→ 将来。エクスポート/インポートで移行容易にしておく
- PWA化・プッシュ通知
- 複数ユーザー・認証

> 設計はこれらを足しやすい形にするが、v0.1 では作らない。

---

## 10. 設計判断ログ（迷ったらこれに従う）

- **サブスクは Expense に実体を作らない**。月集計時に動的合算（§4）。理由: 二重計上・解約時の整合性回避。
- **プリセット価格は固定初期値**。Claude Code は最新価格を調べに行かない。ユーザーが上書きする前提。
- **永続化は IndexedDB のみ**。サーバー送信は一切しない（個人用・プライバシー優先）。
- **赤は値上げ/超過専用**。装飾に赤を使わない。
- **解約は論理削除**（canceledAt をセット）。レコードは消さない（履歴・ログ保持のため）。
- 金額は**円・整数**で保持。小数を持たない。
- **サブスクは請求周期（monthly / yearly）を持つ**（v2 で追加）。`amount` は周期 1 回あたりの実額。
  「月額換算」と「当月実請求」の 2 系統で集計し、**両方を UI に併記**する（§4 合成ルール）。
  理由: 年額プランは実際には請求月に一括で出るため、月割ならしだけでは実キャッシュフローが見えない。
  ダッシュボードの当月総支出・月推移・カテゴリ別内訳は「当月実請求」基準（年額は請求月にスパイク）。
- **カレンダーは v0.1.x の読み取り専用ビュー**（§6 /calendar）。既存の当月実請求集計を時間軸に並べ替えるだけで、
  スキーマ変更・新エンティティを作らない。理由: コア価値「いつ何が引き落とされるか」を低コストで可視化し、
  v0.1 のガードレール（サブスクは集計時動的合算・実体を作らない）を崩さないため。
- **予算は v0.2。日別予算割当は採らない**（§9）。月予算＋カレンダー上の消化ペース（バーンダウン）で表現し、
  超過は `--color-danger` を使う。理由: 日別固定枠は入力負荷が高くニッチ。需要の本体は「今月あといくら／ペースは速いか」。
  決定日 2026-06-14。
