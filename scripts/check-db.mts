/**
 * データ層の健全性チェック（Phase 1 受け入れ確認の自動化版）。
 * fake-indexeddb で Dexie を Node 上に再現し、seed の冪等性とレコードの読み戻し、
 * 月次合算ロジック（§4）を検証する。実行: pnpm tsx scripts/check-db.mts
 */
import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { seedDefaultCategories, DEFAULT_CATEGORIES } from "../src/lib/seed";
import { monthSummary, activeSubsInMonth } from "../src/lib/aggregate";

async function main() {
  // 1. 初回 seed
  await seedDefaultCategories();
  let cats = await db.categories.toArray();
  assert.equal(cats.length, DEFAULT_CATEGORIES.length, "初期カテゴリ件数");

  // 2. seed は冪等（リロード相当で再実行しても重複しない）
  await seedDefaultCategories();
  await seedDefaultCategories();
  cats = await db.categories.toArray();
  assert.equal(cats.length, DEFAULT_CATEGORIES.length, "再 seed で重複しない");

  // 3. 支出を書いて読み戻せる（永続レコードのラウンドトリップ）
  await db.expenses.add({
    id: "e1",
    date: "2026-06-10",
    amount: 1200,
    categoryId: "cat-food",
    memo: "ランチ",
    createdAt: new Date().toISOString(),
  });
  const e = await db.expenses.get("e1");
  assert.equal(e?.amount, 1200, "支出の読み戻し");

  // 4. サブスクは実体を作らず、集計時に動的合算（§4）
  await db.subscriptions.add({
    id: "s1",
    serviceName: "Netflix",
    planName: "スタンダード",
    amount: 1590,
    billingCycle: "monthly",
    categoryId: "cat-subscription",
    billingDay: 15,
    startedAt: "2023-06-01",
    createdAt: new Date().toISOString(),
  });
  const expenses = await db.expenses.toArray();
  const subs = await db.subscriptions.toArray();
  const sum = monthSummary(expenses, subs, "2026-06");
  assert.equal(sum.expenseTotal, 1200, "都度合計");
  assert.equal(sum.subscriptionActual, 1590, "サブスク当月実請求（月額）");
  assert.equal(sum.subscriptionMonthly, 1590, "サブスク月額換算（月額）");
  assert.equal(sum.total, 2790, "当月総支出 = 都度 + サブスク");

  // 4b. 年額サブスク: 請求月だけ全額計上、他月は 0。月額換算は ÷12。
  await db.subscriptions.add({
    id: "s2",
    serviceName: "Amazon Prime",
    planName: "年額",
    amount: 5900,
    billingCycle: "yearly",
    categoryId: "cat-subscription",
    billingDay: 1,
    billingMonth: 3, // 3月に請求
    startedAt: "2024-03-01",
    createdAt: new Date().toISOString(),
  });
  const subsY = await db.subscriptions.toArray();
  const mar = monthSummary(expenses, subsY, "2026-03");
  const jun = monthSummary(expenses, subsY, "2026-06");
  assert.equal(mar.subscriptionActual, 1590 + 5900, "3月は年額が全額計上");
  assert.equal(jun.subscriptionActual, 1590, "6月は年額が計上されない");
  assert.equal(
    jun.subscriptionMonthly,
    1590 + Math.round(5900 / 12),
    "月額換算は年額÷12を常時含む",
  );
  await db.subscriptions.delete("s2");

  // 5. 解約済みは当月集計から外れる（論理削除）
  await db.subscriptions.update("s1", { canceledAt: "2026-05-20" });
  const subs2 = await db.subscriptions.toArray();
  assert.equal(activeSubsInMonth(subs2, "2026-06").length, 0, "解約後は非アクティブ");
  assert.equal(activeSubsInMonth(subs2, "2026-05").length, 1, "解約月はアクティブ");

  console.log("✓ データ層チェック 全項目パス");
}

main().catch((err) => {
  console.error("✗ データ層チェック失敗:", err);
  process.exit(1);
});
