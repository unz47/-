// ストアレビュー依頼を出してよいかの判定（純ロジック）。
// iOS 側も年3回までに制限するが、こちらでも「使い込んでくれた人に・保存直後の良い瞬間に・
// バージョンごとに最大1回・間隔を空けて」に絞る。押し付けない。

const DAY_MS = 24 * 60 * 60 * 1000;

export const REVIEW_RULES = {
  /** 最初の記録からの経過日数 */
  minDaysSinceFirstRecord: 7,
  /** 支出＋サブスクの記録件数 */
  minRecords: 10,
  /** 前回依頼からの最短間隔 */
  minDaysBetweenPrompts: 120,
} as const;

export interface ReviewPromptInput {
  now: Date;
  /** 支出＋サブスクの件数 */
  records: number;
  /** 最初の記録の作成時刻（ISO）。記録なしは null */
  firstRecordAt: string | null;
  /** 前回依頼した時刻（ISO）。未依頼は null */
  lastPromptAt: string | null;
  /** 前回依頼したアプリのバージョン */
  lastPromptVersion: string | null;
  /** 現在のアプリのバージョン */
  version: string;
}

export function shouldRequestReview(i: ReviewPromptInput): boolean {
  if (i.records < REVIEW_RULES.minRecords || !i.firstRecordAt) return false;
  const since = i.now.getTime() - new Date(i.firstRecordAt).getTime();
  if (!(since >= REVIEW_RULES.minDaysSinceFirstRecord * DAY_MS)) return false;
  if (i.lastPromptVersion === i.version) return false;
  if (i.lastPromptAt) {
    const gap = i.now.getTime() - new Date(i.lastPromptAt).getTime();
    if (!(gap >= REVIEW_RULES.minDaysBetweenPrompts * DAY_MS)) return false;
  }
  return true;
}
