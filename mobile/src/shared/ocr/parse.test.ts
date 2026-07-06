import { describe, expect, it } from "vitest";

import type { OcrLine, OcrResult } from "./types";
import { parseReceipt } from "./parse";

// y は正規化座標・原点左下（Apple Vision 規約）。大きいほど上。
function line(text: string, y: number, confidence = 0.9): OcrLine {
  return { text, confidence, x: 0.1, y, width: 0.8, height: 0.03 };
}

const RECEIPT: OcrResult = {
  lines: [
    line("zaim マート", 0.95),
    line("2026年6月14日 11:55", 0.9),
    line("小計 ¥1,560", 0.5),
    line("合計", 0.4),
    line("¥1,683", 0.401), // 「合計」と同じ視覚行（y が近い）
    line("お預り ¥2,000", 0.3),
    line("お釣り ¥317", 0.25),
  ],
};

describe("parseReceipt（§11.7 スパイクで確立した型）", () => {
  it("お預り/お釣り/小計の罠を避けて合計を取る", () => {
    const r = parseReceipt(RECEIPT);
    expect(r.amount).toBe(1683);
  });

  it("店名は上部の意味ある行、日時は印字から ISO で組む", () => {
    const r = parseReceipt(RECEIPT);
    expect(r.merchant).toBe("zaim マート");
    expect(r.occurredAt).toBe("2026-06-14T11:55:00");
  });

  it("時刻が無ければ日付のみ（時間帯集計で深夜に誤集計しないための規約）", () => {
    const r = parseReceipt({
      lines: [
        line("テスト商店", 0.95),
        line("2026.6.14", 0.9),
        line("合計 ¥500", 0.4),
      ],
    });
    expect(r.occurredAt).toBe("2026-06-14");
    expect(r.amount).toBe(500);
  });

  it("合計行が無ければ最大金額へフォールバック", () => {
    const r = parseReceipt({
      lines: [line("テスト商店", 0.95), line("¥120", 0.5), line("¥980", 0.45)],
    });
    expect(r.amount).toBe(980);
  });
});
