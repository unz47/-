/**
 * レシートOCR パース層の検証（§11.7）。
 * 実機 Apple Vision で実レシートを OCR した結果（座標つき）を固定フィクスチャにし、
 * parseReceipt が〈金額・店名・購入日時〉を正しく抜けることを assert する。
 * これで Vision を実行せずにパース・名寄せのリグレッションを検出できる。
 * 実行: pnpm tsx scripts/check-ocr.mts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { OcrResult } from "../src/lib/ocr/types";
import { parseReceipt } from "../src/lib/ocr/parse";
import { merchantKey } from "../src/lib/ocr/merchant";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, "fixtures/zaim-receipt.ocr.json"), "utf8"),
) as OcrResult;

function main() {
  // 1. 実レシート（劣化・一部潰し）から抽出
  const r = parseReceipt(fixture);
  assert.equal(r.amount, 1683, "合計（お預り/お釣り/税に釣られない）");
  assert.equal(r.merchant, "zaim マート", "店名（ロゴ行）");
  assert.ok(r.occurredAt?.startsWith("2012-09-19"), `購入日: ${r.occurredAt}`);
  assert.ok(r.occurredAt?.includes("11:55"), `購入時刻: ${r.occurredAt}`);
  assert.ok(r.rawLines.length >= 30, "全認識行を保持");
  console.log("✓ 実レシート: 合計¥1,683 / 店名 zaim マート / 2012-09-19T11:55");

  // 2. 名寄せ（merchantKey）— 書式と店舗番号を確実に正規化（支店統合はしない方針）
  assert.equal(merchantKey("zaim マート"), "zaimマート", "空白除去");
  assert.equal(
    merchantKey("セブン-イレブン 渋谷店"),
    merchantKey("セブンイレブン　渋谷店"),
    "同一店の記号/空白/全半角差は吸収して一致",
  );
  assert.equal(merchantKey("ローソン No.585"), "ローソン", "店舗番号を除去");
  assert.equal(merchantKey("ＦＡＭＩＬＹＭＡＲＴ"), "familymart", "全角→半角・小文字");
  assert.equal(merchantKey(""), undefined, "空文字はキーにしない");
  console.log("✓ 名寄せ: 書式/店舗番号を正規化（支店統合は手動マージに委ねる）");

  // 3. 金額の罠（お預り・お釣り・税）に引っかからない（fixture で担保済みの再確認）
  const amounts = fixture.lines
    .map((l) => l.text)
    .filter((t) => /[¥￥]\s*2,083|400|124/.test(t));
  assert.ok(amounts.length > 0, "罠となる金額行が fixture に存在する前提");
  assert.equal(r.amount, 1683, "それでも合計を選ぶ");
  console.log("✓ 罠回避: お預り¥2,083 / お釣り¥400 / 税¥124 を退け合計を採用");

  console.log("\n✓ OCR パース層 全項目パス");
}

main();
