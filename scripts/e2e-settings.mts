/**
 * Phase 6 受け入れ確認（設定・バックアップ）。
 * - カテゴリ管理（追加・削除）
 * - エクスポート → 全データ削除 → インポートで復元できる
 * 事前に dev サーバ（http://localhost:3000）を起動しておくこと。
 * 実行: pnpm tsx scripts/e2e-settings.mts
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const BACKUP_PATH = "/tmp/expense-backup-e2e.json";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

  try {
    // --- カテゴリ管理: 追加 → 削除 ---
    await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "設定" }).waitFor();

    await page.getByPlaceholder("新しいカテゴリ名").fill("テスト");
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await page.getByText("テスト", { exact: true }).waitFor();
    console.log("✓ カテゴリ追加");

    await page.getByRole("button", { name: "テスト を削除" }).click();
    await page.getByText("テスト", { exact: true }).waitFor({ state: "detached" });
    console.log("✓ カテゴリ削除（既定カテゴリは削除ボタンなし）");

    // --- 支出を1件作る ---
    await page.goto(`${BASE}/expenses`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "支出を追加" }).click();
    await page.locator("#amount").fill("5000");
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await page
      .getByRole("button", { name: "追加", exact: true })
      .waitFor({ state: "hidden" });
    await page.getByRole("button").filter({ hasText: "¥5,000" }).first().waitFor();

    // --- エクスポート ---
    await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "エクスポート" }).click(),
    ]);
    await download.saveAs(BACKUP_PATH);
    console.log("✓ エクスポート（JSON ダウンロード）");

    // --- 全データ削除 ---
    await page.getByRole("button", { name: "全データを削除" }).click();
    await page.getByRole("button", { name: "削除する" }).click();
    await page.getByText("全データを削除しました。").waitFor();

    await page.goto(`${BASE}/expenses`, { waitUntil: "networkidle" });
    await page.getByText("この月の支出はまだありません。").waitFor();
    console.log("✓ 全データ削除 → 支出が空になる");

    // --- インポートで復元 ---
    await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
    await page.setInputFiles('input[type="file"]', BACKUP_PATH);
    await page.getByText("インポートが完了しました。").waitFor();

    await page.goto(`${BASE}/expenses`, { waitUntil: "networkidle" });
    await page.getByRole("button").filter({ hasText: "¥5,000" }).first().waitFor();
    console.log("✓ インポートで支出が復元される");

    console.log("\n✓ Phase 6 受け入れ条件 全項目パス");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("✗ E2E 失敗:", err);
  process.exit(1);
});
