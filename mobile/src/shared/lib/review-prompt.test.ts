import { describe, expect, it } from "vitest";

import { shouldRequestReview, type ReviewPromptInput } from "./review-prompt";

const NOW = new Date("2026-11-23T12:00:00Z");

const base: ReviewPromptInput = {
  now: NOW,
  records: 12,
  firstRecordAt: "2026-11-01T00:00:00Z",
  lastPromptAt: null,
  lastPromptVersion: null,
  version: "1.2.0",
};

describe("shouldRequestReview", () => {
  it("十分使い込んでいて未依頼なら依頼する", () => {
    expect(shouldRequestReview(base)).toBe(true);
  });

  it("記録が少ない・記録なしでは依頼しない", () => {
    expect(shouldRequestReview({ ...base, records: 9 })).toBe(false);
    expect(shouldRequestReview({ ...base, firstRecordAt: null })).toBe(false);
  });

  it("最初の記録から7日未満では依頼しない", () => {
    expect(
      shouldRequestReview({ ...base, firstRecordAt: "2026-11-17T12:00:01Z" }),
    ).toBe(false);
    expect(
      shouldRequestReview({ ...base, firstRecordAt: "2026-11-16T12:00:00Z" }),
    ).toBe(true);
  });

  it("同じバージョンでは2回目を出さない", () => {
    expect(
      shouldRequestReview({
        ...base,
        lastPromptAt: "2026-01-01T00:00:00Z",
        lastPromptVersion: "1.2.0",
      }),
    ).toBe(false);
  });

  it("前回から120日空いていなければ新バージョンでも出さない", () => {
    expect(
      shouldRequestReview({
        ...base,
        lastPromptAt: "2026-09-01T00:00:00Z",
        lastPromptVersion: "1.1.0",
      }),
    ).toBe(false);
    expect(
      shouldRequestReview({
        ...base,
        lastPromptAt: "2026-07-01T00:00:00Z",
        lastPromptVersion: "1.1.0",
      }),
    ).toBe(true);
  });

  it("不正な日付は依頼しない側に倒す", () => {
    expect(shouldRequestReview({ ...base, firstRecordAt: "bad" })).toBe(false);
  });
});
