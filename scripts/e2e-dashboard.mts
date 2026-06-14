/**
 * Phase 3 受け入れ確認（ダッシュボード: サブスク分が当月合計に正しく合算される §4）。
 * 事前に dev サーバ（http://localhost:3000）を起動しておくこと。
 * サブスク登録 UI は Phase 4 のため、ここではサブスクを IndexedDB に直接注入して
 * 「都度 + サブスク」の合算表示を検証する。
 * 実行: pnpm tsx scripts/e2e-dashboard.mts
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function injectSubscription(page: Page) {
  await page.evaluate(
    (sub) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("expense-tracker");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("subscriptions", "readwrite");
          tx.objectStore("subscriptions").put(sub);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      }),
    {
      id: "sub-test-1",
      serviceName: "Netflix",
      planName: "スタンダード",
      amount: 1590,
      categoryId: "cat-subscription",
      billingDay: 15,
      startedAt: "2023-06-01",
      createdAt: new Date().toISOString(),
    },
  );
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

  try {
    // 1. /expenses で都度支出 ¥1,000 を追加（実 UI 経由）
    await page.goto(`${BASE}/expenses`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "支出を追加" }).click();
    await page.locator("#amount").fill("1000");
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await page
      .getByRole("button", { name: "追加", exact: true })
      .waitFor({ state: "hidden" });

    // 2. サブスク ¥1,590 を IndexedDB に注入
    await injectSubscription(page);

    // 3. ダッシュボードで合算を確認
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "カテゴリ別支出" }).waitFor();

    // ヒーローの総支出 = 都度1,000 + サブスク1,590 = 2,590
    await page.getByText("¥2,590").first().waitFor();
    console.log("✓ 当月総支出 = 都度 + サブスク（¥2,590）");

    // サブスク月額が併記される
    const subMonthly = page.getByText("¥1,590").first();
    await subMonthly.waitFor();
    console.log("✓ サブスク月額 ¥1,590 を併記");

    // カテゴリ別凡例にサブスク分が合算される（1590/2590 = 61%。タブバー等と被らない固有値）
    await page.getByText("61%").first().waitFor();
    console.log("✓ カテゴリ別内訳にサブスクが合算（サブスク 61%）");

    console.log("\n✓ Phase 3 受け入れ条件 全項目パス");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("✗ E2E 失敗:", err);
  process.exit(1);
});
