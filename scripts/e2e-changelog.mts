/**
 * Phase 5 受け入れ確認（変更ログ: 金額変更でログ+1、増額=赤/減額=緑で表示）。
 * 事前に dev サーバ（http://localhost:3000）を起動しておくこと。
 * 実行: pnpm tsx scripts/e2e-changelog.mts
 */
import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

/** カードの「⋯」からアクションシートを開く。 */
async function openActions(page: Page, service: string) {
  await page.getByRole("button", { name: `${service} の操作` }).click();
}

async function editAmount(page: Page, service: string, amount: string) {
  await openActions(page, service);
  await page.getByRole("button", { name: "編集", exact: true }).click();
  await page.locator("#e-amt").fill(amount);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page
    .getByRole("button", { name: "保存", exact: true })
    .waitFor({ state: "hidden" });
}

async function showLogs(page: Page, service: string) {
  await openActions(page, service);
  await page.getByRole("button", { name: "改定ログ", exact: true }).click();
  await page.getByRole("heading", { name: "改定ログ" }).waitFor();
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

  try {
    await page.goto(`${BASE}/subscriptions`, { waitUntil: "networkidle" });

    // 登録（Netflix スタンダード ¥1,590）
    await page.getByRole("button", { name: "追加" }).click();
    await page.getByRole("button", { name: /Netflix/ }).click();
    await page.getByRole("button", { name: /¥1,590/ }).click();
    await page.getByRole("button", { name: "登録", exact: true }).click();
    await page
      .getByRole("button", { name: "登録", exact: true })
      .waitFor({ state: "hidden" });

    // 増額 1590 → 1990
    await editAmount(page, "Netflix", "1990");

    // 一覧に「値上げ」バッジが出る（直近30日の増額）
    await page.getByText("値上げ").first().waitFor();
    console.log("✓ 増額 → 一覧に「値上げ」バッジ");

    // 改定ログへ（⋯ → 改定ログ）
    await showLogs(page, "Netflix");

    await page.getByText("改定 1 回").waitFor();
    await page.getByText(/¥1,590 → ¥1,990/).waitFor();
    // 増額の差分が赤（--color-danger = rgb(248, 113, 113)）
    const raiseColor = await page
      .getByText("+400")
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    assert.ok(
      raiseColor.includes("248, 113, 113"),
      `増額の差分が赤であること（実際: ${raiseColor}）`,
    );
    console.log("✓ 改定ログに記録+1、増額の差分が赤");

    // 契約開始エントリ
    await page.getByText("契約開始", { exact: true }).first().waitFor();
    await page.getByText(/¥1,590 で契約開始/).waitFor();
    console.log("✓ 契約開始エントリを合成表示");

    // 減額 1990 → 1490
    await page.getByRole("button", { name: "戻る" }).click();
    await page.getByRole("heading", { name: "サブスク" }).waitFor();
    await editAmount(page, "Netflix", "1490");
    await showLogs(page, "Netflix");
    await page.getByText("改定 2 回").waitFor();
    await page.getByText(/¥1,990 → ¥1,490/).waitFor();
    // 減額の差分が緑（--color-success = rgb(52, 211, 153)）
    const cutColor = await page
      .getByText(/[−-]500/)
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    assert.ok(
      cutColor.includes("52, 211, 153"),
      `減額の差分が緑であること（実際: ${cutColor}）`,
    );
    console.log("✓ 改定ログ+1（計2回）、減額の差分が緑");

    console.log("\n✓ Phase 5 受け入れ条件 全項目パス");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("✗ E2E 失敗:", err);
  process.exit(1);
});
