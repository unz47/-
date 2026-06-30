// ドメイン型の単一定義源（PROJECT_PLAN §4）。各所で再定義せず、ここから import する。
// DB 実装（SQLite/Drizzle）からは独立した純粋な型。Web 版では Dexie の db.ts にあったもの。

export interface Expense {
  id: string; // uuid
  date: string; // YYYY-MM-DD
  amount: number; // 円（整数）
  categoryId: string;
  memo?: string;
  createdAt: string; // ISO
  // レシートOCR由来（任意・§11）。merchant は印字された店名（生）、
  // merchantKey は名寄せ用の正規化キー（店/カテゴリ別集計はこれで束ねる）。
  merchant?: string;
  merchantKey?: string;
  // 実際の購入日時（ISO）。OCR由来。date（家計簿上の日付）とは別物。
  occurredAt?: string;
  // 店の位置（§11.5 C）。lat/lng が真実（ジオフェンス用）、address は逆ジオの表示キャッシュ。
  address?: string;
  lat?: number;
  lng?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string; // パレットから
  isDefault: boolean;
  order: number; // 表示順（選択肢・凡例・グラフで共有する安定した順序）
}

export type BillingCycle = "monthly" | "yearly";

export interface Subscription {
  id: string;
  serviceName: string; // "Netflix"
  planName: string; // "スタンダード"
  amount: number; // その請求周期 1 回あたりの実額（円・整数）。yearly なら年額そのもの。
  billingCycle: BillingCycle; // 'monthly' | 'yearly'
  categoryId: string; // 既定: "サブスク"
  billingDay: number; // 1-31 課金日
  billingMonth?: number; // 1-12。yearly のとき請求月。未設定なら startedAt の月にフォールバック
  startedAt: string; // YYYY-MM-DD 契約開始
  canceledAt?: string; // 解約日。あれば以降は計上しない（論理削除）
  presetId?: string; // プリセット由来なら参照
  createdAt: string;
}

// サブスク変更ログ（価格改定検知）
export interface SubscriptionChangeLog {
  id: string;
  subscriptionId: string;
  field: "amount" | "planName";
  oldValue: string | number;
  newValue: string | number;
  changedAt: string; // ISO
}
