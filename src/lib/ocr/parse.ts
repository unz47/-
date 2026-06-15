// レシートOCR → 支出素案（§11.7 スパイクで確立した型）。
// ・日付/時刻行を先に確定し、金額候補から除外（年や時刻の誤検出を防ぐ）
// ・「合計」等のキーワード行と **y 座標が近い** ¥候補を金額に採用（お預り/お釣り/税の罠回避）
// ・各フィールドに信頼度を添える（低いものだけ UI で「要確認」にする）
import type { OcrLine, OcrResult, ParsedReceipt } from "./types";

const TOTAL_KEYWORDS = ["合計", "お会計", "総額", "ご請求", "計"];
const STORE_BLOCKLIST = [
  ...TOTAL_KEYWORDS,
  "領収",
  "レシート",
  "TEL",
  "電話",
  "ポイント",
  "お預",
  "お釣",
  "おつり",
  "現金",
  "クレジット",
  "ありがとう",
];

const DATE_RE = /(20\d{2})[年/.\-]\s*(\d{1,2})[月/.\-]\s*(\d{1,2})/;
const TIME_RE = /(\d{1,2}):(\d{2})/;
/** 同じ視覚行とみなす y 距離のしきい値（正規化座標）。 */
const SAME_ROW_DY = 0.02;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 行から金額（円・整数）を取り出す。日付/時刻行は除外。 */
function yenOf(line: string): number | null {
  if (DATE_RE.test(line) || TIME_RE.test(line)) return null;
  const m = line.match(/[0-9][0-9,]{2,8}/); // 3桁以上
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isDateOrTimeLine(line: string): boolean {
  return DATE_RE.test(line) || TIME_RE.test(line);
}

export function parseReceipt(result: OcrResult): ParsedReceipt {
  // Vision は原点左下＝y 降順で上→下。
  const lines = [...result.lines].sort((a, b) => b.y - a.y);
  const texts = lines.map((l) => l.text);

  // --- 日付・時刻（先に確定）---
  let occurredAt: string | undefined;
  let dateConfidence: number | undefined;
  const dateLine = lines.find((l) => DATE_RE.test(l.text));
  if (dateLine) {
    const d = dateLine.text.match(DATE_RE)!;
    const [y, mo, da] = [Number(d[1]), Number(d[2]), Number(d[3])];
    // 時刻は日付行か、その近くの別行から拾う。
    const timeLine =
      (TIME_RE.test(dateLine.text) ? dateLine : undefined) ??
      lines.find((l) => TIME_RE.test(l.text));
    const t = timeLine?.text.match(TIME_RE);
    occurredAt = t
      ? `${y}-${pad2(mo)}-${pad2(da)}T${pad2(Number(t[1]))}:${t[2]}:00`
      : `${y}-${pad2(mo)}-${pad2(da)}`;
    dateConfidence = dateLine.confidence;
  }

  // --- 金額（合計のy座標マッチ → 同一行の¥候補。なければ最大値）---
  let amount: number | undefined;
  let amountConfidence: number | undefined;
  const kw = lines.find((l) =>
    TOTAL_KEYWORDS.some((k) => l.text.includes(k)),
  );
  if (kw) {
    const sameRow = lines
      .map((l) => ({ line: l, v: yenOf(l.text), dy: Math.abs(l.y - kw.y) }))
      .filter((c) => c.v !== null && c.dy < SAME_ROW_DY)
      .sort((a, b) => a.dy - b.dy)[0];
    if (sameRow) {
      amount = sameRow.v!;
      amountConfidence = sameRow.line.confidence;
    } else if (yenOf(kw.text) !== null) {
      amount = yenOf(kw.text)!;
      amountConfidence = kw.confidence;
    }
  }
  if (amount === undefined) {
    let best: { v: number; conf: number } | undefined;
    for (const l of lines) {
      const v = yenOf(l.text);
      if (v !== null && (!best || v > best.v)) best = { v, conf: l.confidence };
    }
    if (best) {
      amount = best.v;
      amountConfidence = best.conf;
    }
  }

  // --- 店名（上部の、金額/日付/ブロック語でない最初の意味ある行）---
  let merchant: string | undefined;
  let merchantConfidence: number | undefined;
  const head: OcrLine[] = lines.slice(0, 6);
  const store = head.find((l) => {
    const t = l.text.trim();
    return (
      t.length >= 2 &&
      yenOf(t) === null &&
      !isDateOrTimeLine(t) &&
      !STORE_BLOCKLIST.some((b) => t.includes(b))
    );
  });
  if (store) {
    merchant = store.text.trim();
    merchantConfidence = store.confidence;
  }

  return {
    amount,
    amountConfidence,
    merchant,
    merchantConfidence,
    occurredAt,
    dateConfidence,
    rawLines: texts,
  };
}
