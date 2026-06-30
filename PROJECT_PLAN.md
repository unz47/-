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
  解約済みカードの ⋯ には「再契約する」を出し、**新しい契約レコード**を作って再有効化（§10 / `reactivateSubscription`、
  過去・空白期間の整合性を保つ。元の解約レコードは履歴として残す）。
  e2e は `⋯ → 編集/改定ログ/解約・再契約` の新フローに更新済み。

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

- レシートOCR → v0.2 で別フェーズ。本命は **写真→OCR→〈金額・店名・購入日時〉→ 店名ベースの散財インサイト**
  （§11 設計メモ参照）。座標/EXIF は使わない。
  - **OCR エンジンは端末内**（外部送信なし）。iOS 専用で配布する（§11.9, 2026-06-28 確定）。
    抽出は端末の能力で分岐: **対応機（A17 Pro〜/iOS26+）= Apple Vision + Foundation Models（端末内LLM）**、
    **非対応機 = Apple Vision + ヒューリスティックパース**。クラウドは検証用ベンチのみ（出荷に含めない）。
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
- **永続化は IndexedDB のみ。出荷アプリはサーバー送信・外部API送信を一切しない**（個人用・プライバシー優先）。
  OCR も**端末内完結**（Apple Vision + 対応機は Foundation Models、§11.9）＝外部送信ゼロを維持。
  - 補足: クラウド OCR（`ocr-proxy/`、Bedrock Claude Vision）も試作したが、ストア公開には不適（§11.9）として
    **2026-06-28 に全撤去済み**（AWS デプロイ・ローカルコードとも削除）。OCR は端末内のみ。
- **赤は値上げ/超過専用**。装飾に赤を使わない。
- **解約は論理削除**（canceledAt をセット）。レコードは消さない（履歴・ログ保持のため）。
- **再契約は新しい契約レコードを作る**（解約レコードは履歴として残す）。理由: 集計は動的（§4）なので、
  canceledAt をクリアすると空白期間まで遡って計上され、startedAt をずらすと過去の契約期間が計上されなくなる。
  契約期間の不連続（有効→無効→有効）を単一レコードで表せないため、再契約日を startedAt とする別レコードにする。
  金額は元契約から引き継ぐ（価格が変わっていれば ⋯ → 編集 で上書き）。`useSubscriptionStore.reactivateSubscription`。
  - **解約済みの表示は積み上げない**: 一覧の「解約済み」は、現在アクティブなサービスを除外し、同名サービスを
    1 枚に集約（代表＝最新の解約。`計N契約` を併記）。データ層は履歴レコードを残すが、表示だけ束ねる。
    再契約するとそのサービスは解約済みから外れてアクティブへ移る。`app/subscriptions/page.tsx` の集約ロジック。
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

---

## 11. v0.2 設計メモ：レシートOCR → 店名ベースの散財インサイト（決定日 2026-06-15）

> 起点は「OCRつけたい」。本命は **支出を店ごとにまとめて「どこで散財しているか」を見える化**すること。
> v0.2 の正式フィーチャーとして OCR を解禁する（§9 スコープ外を v0.2 で開ける宣言）。
> 本節は設計メモ（仕様の種）。実装フェーズ化は別途 §7 に切り出す。

### 11.0 検討の経緯（なぜ「座標」をやめ「店名」にしたか）
当初は「写真→金額(OCR)＋場所(EXIF)→接近ナッジ」を構想したが、2段の気づきで**座標ベースを棄却**した:
1. **記録時GPSは自宅になりがち**: レシート登録は帰宅後が多く、記録時の端末GPSは店でなく自宅を指す。
2. **写真EXIFも同じ穴に落ちる**: そもそも**写真を撮るのも家でのことが多い** → EXIF の座標＝自宅、EXIF の時刻＝家で撮った時刻。
   → 「写真→場所(EXIF)」は主要ユースケースで崩れる。
- 家撮り前提で**端末内だけ**で確実に取れるのは、結局**レシート印字＝OCRの中身**:
  **店名**（印字、住所OCRより安定）と**購入日時**（印字、構造化されている）。
- 「店名→座標」を自動化するには外部ジオコーディングAPIが要り、**不変条件（外部送信しない）を破る**ため不採用。
- 結論: 軸を**座標から店名へ移す**。接近ナッジは前提が弱いので主役から外し、任意レイヤーに格下げ（§11.5 C）。

### 11.1 中核：写真 → OCR →〈金額・店名・購入日時〉→ 店/カテゴリ別インサイト
- 1枚のレシート写真から OCR で **金額 / 店名 / 購入日時** を抽出し、支出フォームに**自動入力（確認して保存・自動保存しない）**。
- 抽出した**店名で支出を名寄せ・集計** → 「コンビニで今月¥X」「この店は金曜に多い」等の散財インサイト。
- **座標は使わない**＝家撮りでも成立し、**外部送信ゼロ**で不変条件と完全整合。EXIF/GPSは扱わない（§11.5 C の任意レイヤーを除く）。

### 11.2 プライバシー不変条件との整合（死守）
- 「外部送信は一切しない」を**崩さない**。OCR・名寄せ・集計・保存はすべて**端末内完結**。逆ジオコーディング等の外部API呼び出しは**しない**。
- **OCR エンジン = 端末内（iOS 専用配布）**。当初の Apple Vision 確定（§11.7 スパイク）を維持しつつ、抽出の知能を端末の能力で分岐する（§11.9）。
  - 2026-06-28: クラウド OCR（Bedrock）も検討・試作したが、ストア公開ではコスト（全ユーザー分を開発者負担）・
    トークン悪用・他人の財務データ預かりの3点が問題で**出荷には採らない**。試作の `ocr-proxy/` は**全撤去済み**（再検討は不要）。

### 11.3 データモデル拡張（v0.2 で追加、後方互換）
- `Expense` に任意フィールドを追加（未設定は従来どおり = v0.1 データはそのまま有効）:
  - `merchant?: string` … OCR で得た店名（生）。
  - `merchantKey?: string` … 名寄せ用の正規化キー（表記ゆれ・店舗番号を吸収。集計はこれで束ねる）。
  - `occurredAt?: string` … レシート印字の購入日時（ISO）。`date`（家計簿上の日付）は従来どおり維持。
  - `receiptParsed?: boolean` 等、OCR由来かの目印（任意・デバッグ/再編集用）。
- 派生データ（実体は持たず端末内で集計、再計算可能）: 店/カテゴリ別の合計・件数・時間帯分布。

### 11.4 店名の名寄せ（merchantKey）方針
- レシートの店名は表記ゆれ・店舗番号・全半角差が大きい。**正規化して束ねる**:
  小文字化 / 全半角・記号正規化 / 「○○店」「No.123」等の店舗識別の除去 / 既知チェーンの別名辞書（任意）。
- ユーザーが**店名を手動で統合/リネーム**できる導線を用意（自動名寄せの取りこぼし救済）。

### 11.5 段階（MVP→拡張、各段で価値が独立して出る）
- **A. レシートOCRパイプライン**: 撮影/選択 → OCRで **金額・店名・購入日時** を抽出 → フォーム自動入力（確認して保存）。エンジンは端末内。
- **B. 店名ベースの散財インサイト**: `merchantKey` で集計し、店/カテゴリ別の支出・頻度・時間帯を可視化。**v0.2 の主役**。
- **C.（任意・後回し）接近ナッジ**: どうしてもやるなら座標は自動取得せず、**店ごとに一度だけ手動で地図ピン登録**するか、
  たまたま店で記録したときの**ライブGPSを日和見的に拾う**。その座標で iOS リージョン監視＋ローカル通知（端末内完結）。
  位置常時許可/バックグラウンド/電池/通知頻度の設計が要るため最後に判断。

### 11.6 未決事項（実装フェーズ化の前に詰める）
- ~~OCR エンジン確定~~ → **端末内に確定（§11.9, 2026-06-28）**: Apple Vision（文字起こし）＋ 端末能力で抽出を分岐
  （対応機=Foundation Models / 非対応機=ヒューリスティックパース）。iOS 専用配布。クラウド案は試作後に全撤去済み（§11.9）。
  まず**非対応機経路（Vision+パース）から実装**する（開発機 iPhone 11 Pro Max が A13＝LLM非対応のため、ここが自分の動作確認経路にもなる）。
- 店名抽出の安定度（レシートの「どの行が店名か」の特定）と `merchantKey` 正規化ルールの実データ検証（要・複数店の実レシート）。
- カテゴリ自動推定をやるか（店名→カテゴリの対応。やるなら端末内辞書・ユーザー上書き前提）。
- C（接近ナッジ）を v0.2 に入れるか v0.3 送りか。手動ジオタグのUX。

### 11.7 スパイク記録（2026-06-15・`scripts/spikes/vision-ocr.swift`）
macOS の Apple Vision（iOS と同一フレームワーク）でレシート画像を OCR する投げ捨て CLI で検証。
- **合成レシート**: 店名・金額・日付・時刻すべて正確に抽出。
- **実レシート（劣化・一部潰し）**: 店名「zaim マート」/ 合計「¥1,683」/ 時刻「11:55」を正取得。
  日付は汚れで日の桁が欠けたが年月は正確。**お預り/お釣り/税の罠に釣られず合計を選べた**のが要点。
- 確立した型: ①日付/時刻行を先に確定し金額候補から除外、②`合計`等キーワード行と **y 座標が近い** ¥候補を金額に採用、
  ③Vision の **信頼度を「要確認」シグナル**に使う（低conf フィールドだけ確認を促す＝自動入力＋確認保存と整合）。
- 結論: **エンジンは実用十分**。次は複数店での `merchantKey` 検証 → スパイク2（Capacitor プラグインでネイティブ Vision を JS へ）。

### 11.8 実装状況（2026-06-15・段階A/B 着手）
**TS コア（検証済み・端末不要）:**
- データ層: `Expense` に `merchant?/merchantKey?/occurredAt?` を追加（db v3、`merchantKey` インデックス。任意・移行不要）。
- `src/lib/ocr/`: `types`（OcrLine/OcrResult/ParsedReceipt/OcrProvider）/ `parse`（スパイクの型を移植）/
  `merchant`（名寄せ。書式・店舗番号のみ正規化、支店統合はしない）/ `visionProvider` / `capture` / `index`（`scanReceipt`）。
- 検証: `pnpm check:ocr`（実レシートの固定OCR結果 `scripts/fixtures/zaim-receipt.ocr.json` で
  合計¥1,683・店名・日時の抽出と名寄せを assert）。`pnpm verify`/`build`/`e2e:expenses` 緑。

**UI:**
- `ReceiptScanButton`（支出タブ FAB 左。OCR非対応環境では非表示）→ 撮影→OCR→`ExpenseForm` にプレフィル。
- `ExpenseForm` に店名フィールド＋「要確認」表示（低信頼度フィールド）。**自動保存せずユーザー確認して保存**。

**ネイティブ（要・実機検証）:** `ios/App/App/VisionOcrPlugin.swift`（CAPPlugin+CAPBridgedPlugin）、
Info.plist にカメラ/写真の権限文。手順は `docs/ocr-native.md`。実機で Run して撮影→プレフィルを確認するのが残タスク。
> このネイティブ（Apple Vision）経路が**出荷経路**（§11.9 で端末内に確定）。要改善: ①撮影をドキュメントスキャナ化
> （`VNDocumentCameraViewController`）②`usesLanguageCorrection=false` 等のチューニング ③対応機向け Foundation Models 抽出の追加。

**未了:** 複数店での `merchantKey` 実データ検証 / 店別インサイト画面（段階B本体）/ カテゴリ自動推定（§11.6）。

### 11.9 OCR エンジン確定：端末内・iOS 専用・LLM 能力で分岐（決定日 2026-06-28）

**ストア公開（iOS）を前提に、OCR は端末内完結に確定**した。クラウド案も試作したが出荷には採らない。

**なぜ端末内（クラウドを出荷に採らない理由）**
- **コスト**: 公開すると全ユーザーの OCR が開発者の AWS で課金される（上限なし）。端末内なら 0。
- **悪用**: 公開アプリに埋め込む共有トークンは抽出可能で、Bedrock をタダ食いされる。端末内ならエンドポイント自体が無い。
- **プライバシー/責任**: 他人の財務画像を開発者が預かることになる。端末内なら画像が端末から出ず責任が発生しない。
- **将来の位置アラート（§11.5 C）とも一貫**: ジオフェンス＋ローカル通知は元々端末内。OCR も端末内で全機能が一本化。

**構成（出荷経路・すべて端末内 / 外部送信ゼロ）**
```
撮影      VisionKit ドキュメントスキャナ（VNDocumentCameraViewController。台形補正・コントラスト強調）
文字起こし Apple Vision（VNRecognizeTextRequest。.accurate / ja+en / usesLanguageCorrection=false）
抽出      ┌ 対応機（A17 Pro〜 / iOS26+）= Foundation Models（端末内LLM。Guided Generation で構造化）
         └ 非対応機              = ヒューリスティックパース（parse.ts。既存）
名寄せ・保存 既存 TS（merchantKey / IndexedDB）
```
- **能力分岐**: ネイティブが「端末内LLMが使えるか」を返し、TS 側が抽出方式を選ぶ。**まず非対応機経路（Vision+パース）から実装**
  （開発機 iPhone 11 Pro Max = A13 が LLM 非対応で、これが自分の動作確認経路にもなる）。Foundation Models 検証は Apple Silicon Mac でも可。
- **「精度クソ」の主因と対策**: 生写真OCR（補正なし）＋`usesLanguageCorrection=true` が原因。①ドキュメントスキャナ化 ②補正オフ で底上げ。

**クラウド `ocr-proxy/`（試作）= 全撤去済み（2026-06-28）**
- 一度 AWS SAM で Lambda+Function URL を作り（Bedrock `jp.anthropic.claude-haiku-4-5-20251001-v1:0`、ap-northeast-1）、疎通確認まで実施。
  だが出荷に採らない方針が固まったため **`sam delete` でデプロイ削除＋ローカル `ocr-proxy/` ディレクトリも削除**。再導入は不要。

**進捗（2026-06-28）**:
- ①ドキュメントスキャナ実装: `VisionOcrPlugin.scanDocument`（VisionKit、補正済み画像を temp に書き出し path 返却）＋
  `capture.ts` を iOS=スキャナ／失敗時・Web=`@capacitor/camera` のフォールバックに。プラグイン登録は `src/lib/ocr/plugin.ts` に集約。
- ②TS の能力分岐シーム（`extractionTier`/`extractReceipt`、`OcrProvider.capabilities`）。
- Swift: `getCapabilities`（現状 `onDeviceLLM:false`）＋ `usesLanguageCorrection=false`。`pnpm verify`/`check:ocr` 緑。**ネイティブは要 Xcode 再ビルド**。
**未了**: ③対応機向け Foundation Models 抽出 ④実機（iPhone 11 Pro Max）で撮影→プレフィル精度確認（スキャナ＋補正オフの効果測定）
⑤`merchantKey` 複数店検証 / 店別インサイト画面（段階B本体）。

---

## 12. React Native (Expo) 移行（決定日 2026-06-29, ブランチ `rn-migration`）

Capacitor(WebView) から **React Native (Expo)** へ移行。理由: ストア公開前提で**速度（ネイティブUI）重視**、
古い端末(iPhone 11 Pro Max)での WebView の重さを解消するため。Web資産は捨てるが**ロジックは移植**。

### 12.1 構成（Bulletproof React = feature-based）
`mobile/` サブフォルダ（Web版と並走。最終的にルート昇格して Web版削除）。
```
app/(expo-router routes・薄い)  src/{screens, features, entities, shared/{ui,lib,db,config,ocr}}
```
- スタック: Expo SDK 56 / expo-router / React 19 / **NativeWind v4**(Midnight Ledger移植) /
  **expo-sqlite + Drizzle ORM**(useLiveQuery でリアクティブ) / @expo/vector-icons。
- UI: 重いライブラリを入れず `shared/ui` に自前プリミティブ（Web版の手配線shadcn思想を踏襲）。
- **pnpm 注意**: 親に pnpm-workspace.yaml があるため mobile は `node-linker=hoisted` +
  インストール時 `--ignore-workspace` 必須（`mobile/.npmrc` に明記）。
- 検証: `cd mobile && pnpm exec tsc --noEmit`（型）＋ `npx expo export --platform ios`（バンドル）。

### 12.2 進捗（コミット #1〜#7, rn-migration）
- #1 スケルトン+純ロジック移植（aggregate/date/presets/colors/ocr parse・merchant/型）
- #2 NativeWind(テーマ) + SQLite/Drizzle データ層（schema/client/migration/seed/起動ゲート）
- #3 支出の縦串（repo+useLiveQuery, 自前UI Card/Button, 追加フォーム, 一覧）
- #4 5タブ・ナビ(expo-router Tabs) + ダッシュボード実データ(monthSummary/categoryBreakdown)
- #5 サブスク 追加/解約/再契約
- #6 カレンダー（読み取り専用ビュー移植）
- #7 設定（件数・カテゴリ・全削除）
- #8 ライト/ダーク両対応のテーマ基盤（Daylight + Midnight Ledger、CSS変数化、設定で切替）
- #9 編集フロー（支出/サブスク）+ 改定ログ（増額=danger/減額=success）
- #10 OCR（Expoローカルネイティブモジュール VisionOcr）
- #11 OCR撮影を単写真+自動台形補正に（1枚→確認画面）
- #12 レシートから住所も抽出・保存（db migration 0001 で address 列）
- #13 バックアップ/復元（JSONエクスポート・インポート）

### 12.3 未了（多くは実機検証が必要）
- ~~OCR ネイティブモジュール~~ → #10 で実装（`mobile/modules/vision-ocr`、Expoローカルモジュール。
  VNDocumentCameraViewController + Vision、Capacitor版Swiftを移植）。**要 dev build（`expo run:ios`）で実機検証**。
  対応機向け Foundation Models 抽出は未（getCapabilities は false 固定）。
- ~~バックアップ/復元~~ → #13 で実装（expo-file-system/sharing/document-picker）。**要実機検証**。
- ~~支出/サブスクの編集フロー、改定ログ~~ → #9 で実装済み。
- **OCR の実機検証**（#10〜#12: 撮影→台形補正→金額/店名/住所抽出。Swiftは未コンパイル検証部分あり）。
- **テーマ設定の永続化**（再起動後も保持。settings テーブルへ保存）。
- **対応機向け Foundation Models 抽出**（getCapabilities は false 固定）。
- **全画面の実機目視**（NativeWind描画・SQLite動作はバンドル検証のみ＝実機未確認）。
- **カットオーバー**: mobile/ をルート昇格 → Web版削除（feature parity 到達後・ユーザー同席で）。

### 12.5 機能パリティ状況（2026-06-30）
v0.1 Web版の全機能を RN へ移植完了（#1〜#13）。ダッシュボード/支出CRUD/サブスクCRUD・解約再契約/
改定ログ/カレンダー/設定/テーマ/バックアップ/**OCR（金額・店名・住所・日時）**。
残りは実機検証・永続化・LLM抽出・カットオーバー。

### 12.4 実機での動かし方
更新版 Expo Go で `cd mobile && pnpm start`（OCR等カスタムネイティブ前は可）、
または dev build `npx expo run:ios`（CocoaPods 要: `brew install cocoapods`。OCR以降は必須）。
