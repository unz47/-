/**
 * Phase 2 受け入れ確認（都度支出: 追加→一覧反映→編集→削除→リロード永続化）。
 * 事前に dev サーバ（http://localhost:3000）を起動しておくこと。
 * 実行: pnpm tsx scripts/e2e-expenses.mts
 */
import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function addExpense(page: Page, amount: string) {
  await page.getByRole("button", { name: "支出を追加" }).click();
  await page.locator("#amount").fill(amount);
  await page.getByRole("button", { name: "追加", exact: true }).click();
  // ダイアログが閉じるのを待つ
  await page.getByRole("button", { name: "追加", exact: true }).waitFor({
    state: "hidden",
  });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

  try {
    await page.goto(`${BASE}/expenses`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "支出" }).waitFor();

    // 初期は空メッセージ
    await page.getByText("この月の支出はまだありません。").waitFor();

    // 一覧の行（button）に限定したロケータ
    const row = (amount: string) =>
      page.getByRole("button").filter({ hasText: amount });

    // 1. 追加 → 一覧反映
    await addExpense(page, "1234");
    await row("¥1,234").first().waitFor();
    console.log("✓ 追加 → 一覧に反映");

    // 2. 編集（行をタップ → 金額変更 → 保存）
    await row("¥1,234").first().click();
    await page.locator("#amount").fill("5678");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page.getByRole("button", { name: "保存", exact: true }).waitFor({
      state: "hidden",
    });
    await row("¥5,678").first().waitFor();
    assert.equal(await row("¥1,234").count(), 0, "旧金額の行が消える");
    console.log("✓ 編集 → 金額が更新される");

    // 3. 削除
    await row("¥5,678").first().click();
    await page.getByRole("button", { name: "この支出を削除" }).click();
    await page.getByText("この月の支出はまだありません。").waitFor();
    console.log("✓ 削除 → 一覧から消える");

    // 4. リロード永続化
    await addExpense(page, "9999");
    await row("¥9,999").first().waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await row("¥9,999").first().waitFor();
    console.log("✓ リロード後も残る（IndexedDB 永続化）");

    console.log("\n✓ Phase 2 受け入れ条件 全項目パス");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("✗ E2E 失敗:", err);
  process.exit(1);
});
