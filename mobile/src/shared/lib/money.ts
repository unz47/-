// 金額表示（円・整数）。Hermes の Intl 差異を避け、手動で 3 桁区切りする。
// 不変条件: 金額は円・整数。小数を持たない（PROJECT_PLAN §10）。

/** 1234 → "¥1,234"、-500 → "-¥500"。 */
export function formatYen(amount: number): string {
  const n = Math.round(amount);
  const sign = n < 0 ? "-" : "";
  const body = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}¥${body}`;
}
