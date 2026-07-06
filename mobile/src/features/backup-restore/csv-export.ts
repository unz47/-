// 支出の CSV エクスポート（スプレッドシート・確定申告用途）。端末内で生成し
// 共有シートで渡すだけ＝外部送信なし。金額は円・整数のまま出力する。
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { db } from "@/shared/db/client";
import { categories, expenses } from "@/shared/db/schema";

/** RFC4180 に沿って値をクオートする（カンマ・改行・引用符を含む場合）。 */
function csvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 支出全件を CSV 文字列にする（日付降順）。 */
export async function buildExpensesCsv(): Promise<string> {
  const [exp, cats] = await Promise.all([
    db.select().from(expenses),
    db.select().from(categories),
  ]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  const header = ["date", "amount", "category", "merchant", "memo", "occurredAt"];
  const rows = exp
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((e) =>
      [
        e.date,
        e.amount,
        catName.get(e.categoryId) ?? e.categoryId,
        e.merchant,
        e.memo,
        e.occurredAt,
      ]
        .map(csvField)
        .join(","),
    );
  return [header.join(","), ...rows].join("\r\n");
}

/** CSV を書き出して共有シートで送る（保存先はユーザーが選ぶ）。 */
export async function exportExpensesCsv(): Promise<void> {
  const csv = await buildExpensesCsv();
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `expenses-${stamp}.csv`);
  file.create({ overwrite: true });
  // BOM 付き UTF-8（Excel の文字化け対策）
  file.write(`﻿${csv}`);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: "支出CSVを保存",
      UTI: "public.comma-separated-values-text",
    });
  }
}
