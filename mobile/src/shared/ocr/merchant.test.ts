import { describe, expect, it } from "vitest";

import { merchantKey } from "./merchant";

describe("merchantKey", () => {
  it("小文字化・全半角統一・記号/空白除去", () => {
    expect(merchantKey("ＦａｍｉｌｙＭａｒｔ")).toBe("familymart");
    expect(merchantKey("セブン-イレブン ")).toBe("セブンイレブン");
  });

  it("店舗番号（No.123 / #123 / N号店）を除去する", () => {
    expect(merchantKey("ローソン No.585")).toBe("ローソン");
    expect(merchantKey("マツキヨ #12")).toBe("マツキヨ");
    expect(merchantKey("スギ薬局 3号店")).toBe("スギ薬局");
  });

  it("支店名（地名）は統合しない（誤マージ回避 §11.4）", () => {
    expect(merchantKey("セブンイレブン渋谷店")).not.toBe(
      merchantKey("セブンイレブン新宿店"),
    );
  });

  it("空・記号のみは undefined", () => {
    expect(merchantKey("")).toBeUndefined();
    expect(merchantKey("  ---  ")).toBeUndefined();
    expect(merchantKey(null)).toBeUndefined();
  });
});
