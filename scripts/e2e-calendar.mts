/**
 * カレンダー（v0.1.x 読み取り専用ビュー）受け入れ確認。
 * 当月実請求（§4）を時間軸へ並べ替え、日グリッド＋選択日内訳に
 * 都度支出とサブスク課金が正しく出ることを実ブラウザで検証する。
 * 事前に dev サーバ（http://localhost:3000）を起動しておくこと。
 * 実行: pnpm tsx scripts/e2e-calendar.mts
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// 今日（システム日付）。サブスクは今日の「日」に課金されるよう注入する。
const today = new Date();
const billingDay = today.getDate();

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
      id: "sub-cal-1",
      serviceName: "Netflix",
      planName: "スタンダード",
      amount: 1590,
      billingCycle: "monthly",
      categoryId: "cat-subscription",
      billingDay,
      startedAt: "2023-01-01",
      createdAt: new Date().toISOString(),
    },
  );
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });

  try {
    // 1. 今日の都度支出 ¥1,234（メモ: ランチ）を実 UI で追加
    await page.goto(`${BASE}/expenses`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "支出を追加" }).click();
    await page.locator("#amount").fill("1234");
    await page.locator("#memo").fill("ランチ");
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await page
      .getByRole("button", { name: "追加", exact: true })
      .waitFor({ state: "hidden" });

    // 2. 今日課金のサブスク ¥1,590 を IndexedDB に注入
    await injectSubscription(page);

    // 3. カレンダーを開く
    await page.goto(`${BASE}/calendar`, { waitUntil: "networkidle" });
    await page.getByText("当月の支出（実請求）").waitFor();

    // ヒーロー: 当月実請求 = 都度1,234 + サブスク1,590 = 2,824
    await page.getByText("¥2,824").first().waitFor();
    console.log("✓ ヒーロー当月実請求 = 都度 + サブスク（¥2,824）");

    // 内訳併記: 都度 ¥1,234 / サブスク ¥1,590
    await page.getByText("都度 ¥1,234").waitFor();
    await page.getByText("サブスク ¥1,590").waitFor();
    console.log("✓ 都度 / サブスク の内訳を併記");

    // 既定で今日が選択され、内訳に都度支出とサブスク課金が並ぶ
    await page.getByRole("heading", { name: /月.+日/ }).waitFor();
    await page.getByText("今日").first().waitFor();
    await page.getByText("ランチ").waitFor();
    await page.getByText("Netflix").waitFor();
    await page.getByText("自動").first().waitFor();
    console.log("✓ 選択日内訳に 都度(ランチ) + サブスク課金(Netflix/自動) が並ぶ");

    // サブスク課金マーカー（凡例）が出ている
    await page.getByText("サブスク課金").waitFor();
    console.log("✓ 凡例（カテゴリ別支出 / サブスク課金）を表示");

    console.log("\n✓ カレンダー受け入れ確認 全項目パス");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("✗ E2E 失敗:", err);
  process.exit(1);
});
