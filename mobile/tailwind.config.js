/**
 * Midnight Ledger テーマ（PROJECT_PLAN §3）を NativeWind に移植。
 * 生のカラーコードはここ以外に直書きしない。Web版 globals.css の @theme と同値。
 * シグナル色: danger=増額/超過, success=減額/予算内（装飾に赤緑を使わない）。
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // 背景・面（base→surface→surface-raised の3層で奥行き）
        base: "#0b0e14",
        surface: { DEFAULT: "#151a23", raised: "#1e242f" },
        border: "#2a313d",
        // テキスト
        text: {
          primary: "#e6eaf0",
          secondary: "#9ba4b4",
          muted: "#5c6678",
        },
        // 主アクセント（teal）
        accent: { DEFAULT: "#2dd4bf", dim: "#14b8a6", glow: "#5eead4" },
        "on-accent": "#07120f",
        // 機能色（シグナル：意味のあるときだけ）
        success: "#34d399", // 減額・予算内
        danger: "#f87171", // 増額・予算超過
        warning: "#fbbf24", // 予算接近
        info: "#60a5fa",
      },
    },
  },
  plugins: [],
};
