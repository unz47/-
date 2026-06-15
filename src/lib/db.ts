import Dexie, { type Table } from "dexie";

// ドメイン型の単一定義源（PROJECT_PLAN §4）。各所で再定義せず、ここから import する。

export interface Expense {
  id: string; // uuid
  date: string; // YYYY-MM-DD
  amount: number; // 円（整数）
  categoryId: string;
  memo?: string;
  createdAt: string; // ISO
  // v3: レシートOCR由来（任意・§11）。merchant は印字された店名（生）、
  // merchantKey は名寄せ用の正規化キー（店/カテゴリ別集計はこれで束ねる）。
  merchant?: string;
  merchantKey?: string;
  // 実際の購入日時（ISO）。OCR由来。date（家計簿上の日付）とは別物。
  occurredAt?: string;
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
  billingCycle: BillingCycle; // 'monthly' | 'yearly'（v2 で追加。既存は monthly に移行）
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

export class AppDB extends Dexie {
  expenses!: Table<Expense, string>;
  categories!: Table<Category, string>;
  subscriptions!: Table<Subscription, string>;
  subChangeLogs!: Table<SubscriptionChangeLog, string>;

  constructor() {
    super("expense-tracker");
    this.version(1).stores({
      expenses: "id, date, categoryId",
      categories: "id",
      subscriptions: "id, serviceName, canceledAt",
      subChangeLogs: "id, subscriptionId, changedAt",
    });
    // v2: billingCycle / billingMonth を追加。既存サブスクは monthly に移行。
    this.version(2).upgrade(async (tx) => {
      await tx
        .table("subscriptions")
        .toCollection()
        .modify((s: Partial<Subscription>) => {
          if (s.billingCycle === undefined) s.billingCycle = "monthly";
        });
    });
    // v3: 支出に merchantKey を追加（OCR名寄せ・店別集計用のインデックス）。
    // 既存レコードは merchant 系未設定のまま有効（任意フィールド・移行不要）。
    this.version(3).stores({
      expenses: "id, date, categoryId, merchantKey",
    });
  }
}

export const db = new AppDB();
