import { describe, expect, it } from "vitest";

import { formatYen } from "./money";

describe("formatYen", () => {
  it("3桁区切りで ¥ を付ける", () => {
    expect(formatYen(0)).toBe("¥0");
    expect(formatYen(1234)).toBe("¥1,234");
    expect(formatYen(1234567)).toBe("¥1,234,567");
  });
  it("負数は先頭に -", () => {
    expect(formatYen(-500)).toBe("-¥500");
    expect(formatYen(-12345)).toBe("-¥12,345");
  });
});
