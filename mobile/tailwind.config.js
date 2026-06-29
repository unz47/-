/**
 * Midnight Ledger / Daylight Ledger テーマ（PROJECT_PLAN §3）。
 * 実際の色値は src/global.css の CSS 変数（ライト :root / ダーク .dark）。ここでは名前→変数の対応だけ。
 * rgb(var(--x) / <alpha-value>) 形式にして透明度修飾子（bg-accent/15 等）を効かせる。
 * @type {import('tailwindcss').Config}
 */
const c = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class", // colorScheme(dark/light) で .dark を切替
  theme: {
    extend: {
      colors: {
        base: c("base"),
        surface: { DEFAULT: c("surface"), raised: c("surface-raised") },
        border: c("border"),
        text: {
          primary: c("text-primary"),
          secondary: c("text-secondary"),
          muted: c("text-muted"),
        },
        accent: {
          DEFAULT: c("accent"),
          dim: c("accent-dim"),
          glow: c("accent-glow"),
        },
        "on-accent": c("on-accent"),
        success: c("success"), // 減額・予算内
        danger: c("danger"), // 増額・予算超過 専用
        warning: c("warning"), // 予算接近
        info: c("info"),
      },
    },
  },
  plugins: [],
};
