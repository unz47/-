// 店名の名寄せ（§11.4）。表記ゆれ・店舗番号・記号差を吸収した正規化キーを作る。
// 集計（店/カテゴリ別の散財インサイト）はこの merchantKey で束ねる。

/** 全角英数を半角へ。 */
function toHalfWidth(s: string): string {
  return s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
}

/**
 * 店名 → 名寄せキー。
 * 確実にできることだけやる: 小文字化 / 全半角統一 / 店舗番号(No.123 等)除去 / 記号・空白除去。
 * **支店名（地名）の統合はしない**——「セブンイレブン渋谷店」のどこまでがチェーン名かは
 * 辞書なしには一般に判定できず、誤マージのリスクが高い（§11.4）。支店違いの統合は
 * ユーザーの手動マージに委ねる前提。空文字になったら undefined（キーにしない）。
 */
export function merchantKey(name: string | undefined | null): string | undefined {
  if (!name) return undefined;
  let s = toHalfWidth(name).toLowerCase();
  // 店舗番号だけ除去（明確に番号と分かるもの）
  s = s
    .replace(/no\.?\s*\d+/g, "") // No.585 等
    .replace(/[#＃]\s*\d+/g, "")
    .replace(/\d+\s*号店/g, "");
  // 記号・空白をすべて除去（日本語の文字と英数字だけ残す）
  s = s.replace(/[^\p{Letter}\p{Number}]/gu, "");
  return s.length > 0 ? s : undefined;
}
