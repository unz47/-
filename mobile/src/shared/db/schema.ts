// SQLite スキーマ（Drizzle）。ドメイン型（types.ts）と対応。Web版 Dexie db.ts の移行先。
// 不変条件: 金額は円・整数（amount は integer）。日付は文字列（ISO / YYYY-MM-DD）で保持。
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull(),
  // "order" は SQL 予約語なので列名は sort_order（プロパティは order のまま）。
  order: integer("sort_order").notNull(),
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(), // YYYY-MM-DD
    amount: integer("amount").notNull(), // 円・整数
    categoryId: text("category_id").notNull(),
    memo: text("memo"),
    createdAt: text("created_at").notNull(),
    // レシートOCR由来（任意・§11）
    merchant: text("merchant"),
    merchantKey: text("merchant_key"),
    occurredAt: text("occurred_at"),
    // 店の位置（§11.5 C）。lat/lng が真実（ジオフェンス用）、address は逆ジオの表示キャッシュ。
    address: text("address"),
    lat: real("lat"),
    lng: real("lng"),
  },
  (t) => ({
    dateIdx: index("expenses_date_idx").on(t.date),
    categoryIdx: index("expenses_category_idx").on(t.categoryId),
    merchantKeyIdx: index("expenses_merchant_key_idx").on(t.merchantKey),
  }),
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    serviceName: text("service_name").notNull(),
    planName: text("plan_name").notNull(),
    amount: integer("amount").notNull(), // 周期1回あたりの実額（円・整数）
    billingCycle: text("billing_cycle", {
      enum: ["monthly", "yearly"],
    }).notNull(),
    categoryId: text("category_id").notNull(),
    billingDay: integer("billing_day").notNull(),
    billingMonth: integer("billing_month"),
    startedAt: text("started_at").notNull(),
    canceledAt: text("canceled_at"), // 論理削除
    presetId: text("preset_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    serviceIdx: index("subscriptions_service_idx").on(t.serviceName),
    canceledIdx: index("subscriptions_canceled_idx").on(t.canceledAt),
  }),
);

export const subChangeLogs = sqliteTable(
  "sub_change_logs",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id").notNull(),
    field: text("field", { enum: ["amount", "planName"] }).notNull(),
    // oldValue/newValue は string|number。SQLite には text として保持し、読み出し側で解釈する。
    oldValue: text("old_value").notNull(),
    newValue: text("new_value").notNull(),
    changedAt: text("changed_at").notNull(),
  },
  (t) => ({
    subIdx: index("sub_change_logs_sub_idx").on(t.subscriptionId),
    changedIdx: index("sub_change_logs_changed_idx").on(t.changedAt),
  }),
);
