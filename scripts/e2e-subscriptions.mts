/**
 * Phase 4 受け入れ確認（サブスク: プリセットから3タップ登録・月額合計が正しい）。
 * 事前に dev サーバ（http://localhost:3000）を起動しておくこと。
 * 実行: pnpm tsx scripts/e2e-subscriptions.mts
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

  try {
    await page.goto(`${BASE}/subscriptions`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "サブスク" }).waitFor();

    // 3タップ登録: 追加 → サービス → プラン → 登録
    await page.getByRole("button", { name: "追加" }).click();
    await page.getByRole("button", { name: /Netflix/ }).click(); // tap1: サービス
    await page.getByRole("button", { name: /¥1,590/ }).click(); // tap2: プラン（金額自動入力）
    await page.getByRole("button", { name: "登録", exact: true }).click(); // tap3: 登録
    await page
      .getByRole("button", { name: "登録", exact: true })
      .waitFor({ state: "hidden" });

    await page.getByText("1件 契約中").waitFor();
    await page.getByText("年間 ¥19,080").waitFor(); // 1590*12
    console.log("✓ プリセットから3タップで登録（Netflix スタンダード ¥1,590）");

    // 2件目を登録し、月額合計が合算される
    await page.getByRole("button", { name: "追加" }).click();
    await page.getByRole("button", { name: /Spotify/ }).click();
    await page.getByRole("button", { name: /¥980/ }).click();
    await page.getByRole("button", { name: "登録", exact: true }).click();
    await page
      .getByRole("button", { name: "登録", exact: true })
      .waitFor({ state: "hidden" });

    await page.getByText("2件 契約中").waitFor();
    await page.getByText("¥2,570").first().waitFor(); // 1590 + 980
    console.log("✓ 月額合計が正しく合算（¥2,570 / 2件）");

    // 編集: Spotify の金額を変更
    await page.getByRole("button", { name: "Spotify を編集" }).click();
    await page.locator("#e-amt").fill("1280");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await page
      .getByRole("button", { name: "保存", exact: true })
      .waitFor({ state: "hidden" });
    await page.getByText("¥2,870").first().waitFor(); // 1590 + 1280
    console.log("✓ 編集で金額更新 → 月額合計も更新（¥2,870）");

    // 解約: Netflix を解約 → 月額合計から外れ、解約済みに移る
    await page.getByRole("button", { name: "Netflix を編集" }).click();
    await page.getByRole("button", { name: "このサブスクを解約" }).click();
    await page
      .getByRole("button", { name: "このサブスクを解約" })
      .waitFor({ state: "hidden" });
    await page.getByText("1件 契約中").waitFor();
    await page.getByText("¥1,280").first().waitFor(); // Spotify のみ
    assert.ok(
      (await page.getByText("解約済み").count()) > 0,
      "解約済みセクションに移る",
    );
    console.log("✓ 解約（論理削除）→ 月額合計から外れ解約済みへ");

    // 年額プラン: 月額換算で合算され、カードに「/年」と月額換算が出る（§4 v2）
    await page.getByRole("button", { name: "追加" }).click();
    await page.getByRole("button", { name: /Amazon Prime/ }).click();
    await page.getByRole("button", { name: /¥5,900/ }).click(); // 年額プラン
    await page.getByRole("button", { name: "登録", exact: true }).click();
    await page
      .getByRole("button", { name: "登録", exact: true })
      .waitFor({ state: "hidden" });
    await page.getByText("2件 契約中").waitFor();
    // 月額合計（月額換算）= Spotify 1280 + Amazon 年額5900/12(=492) = 1772
    await page.getByText("¥1,772").first().waitFor();
    await page.getByText("≈ ¥492/月").waitFor(); // カードの月額換算
    console.log("✓ 年額プラン登録 → 月額換算で合算（¥1,772 / カードに ≈¥492/月）");

    console.log("\n✓ Phase 4 受け入れ条件 全項目パス");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("✗ E2E 失敗:", err);
  process.exit(1);
});
