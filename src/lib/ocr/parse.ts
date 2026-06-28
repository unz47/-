// レシートOCR → 支出素案（§11.7 スパイクで確立した型）。
// ・日付/時刻行を先に確定し、金額候補から除外（年や時刻の誤検出を防ぐ）
// ・「合計」等のキーワード行と **y 座標が近い** ¥候補を金額に採用（お預り/お釣り/税の罠回避）
// ・各フィールドに信頼度を添える（低いものだけ UI で「要確認」にする）
import type { OcrLine, OcrResult, ParsedReceipt } from "./types";

// 最終支払額（税込）を指すラベル。"計" 単体は "小計"(税抜) に誤マッチするので入れない。
const TOTAL_KEYWORDS = ["合計", "お会計", "お支払", "ご請求", "総額"];
// 税抜・小計は最終支払額ではないので合計候補から除外する（§11.9: 税抜を拾う誤りを防ぐ）。
const TAX_EXCLUDED_KEYWORDS = ["小計", "税抜", "税抜き", "本体価格"];
// 税込が明示されている合計行を優先するためのヒント。
const TAX_INCLUDED_HINT = ["税込", "税込み"];
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

  // --- 金額（税込の合計を優先。税抜/小計は除外。同一行の¥候補をy座標で拾う）---
  let amount: number | undefined;
  let amountConfidence: number | undefined;

  // 合計系の行から、税抜/小計を除外。税込が明示された行があればそれを優先する。
  const totalLines = lines.filter(
    (l) =>
      TOTAL_KEYWORDS.some((k) => l.text.includes(k)) &&
      !TAX_EXCLUDED_KEYWORDS.some((s) => l.text.includes(s)),
  );
  const taxIncluded = totalLines.filter((l) =>
    TAX_INCLUDED_HINT.some((h) => l.text.includes(h)),
  );
  const candidates = taxIncluded.length ? taxIncluded : totalLines;

  // 下（レシート末尾）にある合計ほど最終支払額に近いので、末尾から探す。
  for (let i = candidates.length - 1; i >= 0; i--) {
    const kw = candidates[i];
    // ラベルと金額が同じ行に入っているケース（"合計 ¥1,683"）。
    const inline = yenOf(kw.text);
    if (inline !== null) {
      amount = inline;
      amountConfidence = kw.confidence;
      break;
    }
    // ラベルと金額が別行（左右）なケース。y 座標が近い ¥候補を採用。
    const sameRow = lines
      .map((l) => ({ line: l, v: yenOf(l.text), dy: Math.abs(l.y - kw.y) }))
      .filter((c) => c.v !== null && c.dy < SAME_ROW_DY)
      .sort((a, b) => a.dy - b.dy)[0];
    if (sameRow) {
      amount = sameRow.v!;
      amountConfidence = sameRow.line.confidence;
      break;
    }
  }

  // フォールバック: 合計行から取れなければ最大値。
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
