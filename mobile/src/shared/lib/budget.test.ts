import { describe, expect, it } from "vitest";

import { budgetStatus } from "./budget";

// 2026-07-15: 31日中15日経過
const MID_JULY = new Date(2026, 6, 15);

describe("budgetStatus", () => {
  it("超過は over（danger 専用シグナル）", () => {
    const st = budgetStatus(30000, 31000, MID_JULY);
    expect(st.level).toBe("over");
    expect(st.remaining).toBe(-1000);
  });

  it("消化 80% 以上は warn", () => {
    const st = budgetStatus(30000, 24000, MID_JULY);
    expect(st.level).toBe("warn");
  });

  it("ペース超（月末見込みが予算超え）も warn", () => {
    // 15/31 経過で 20000 消化 → 見込み 41,333 > 30,000
    const st = budgetStatus(30000, 20000, MID_JULY);
    expect(st.level).toBe("warn");
    expect(st.projected).toBe(Math.round(20000 / (15 / 31)));
  });

  it("ペース内は ok", () => {
    const st = budgetStatus(30000, 10000, MID_JULY);
    expect(st.level).toBe("ok");
  });

  it("now なし（過去月）は経過割合 1・見込み=実績", () => {
    const st = budgetStatus(30000, 25000);
    expect(st.elapsedRatio).toBe(1);
    expect(st.projected).toBe(25000);
    expect(st.level).toBe("warn"); // 83%
  });
});
