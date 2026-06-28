// NativeWind v4: babel-preset-expo に jsxImportSource を渡し、nativewind/babel を追加。
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Drizzle のマイグレーション .sql を文字列としてインライン取り込み（expo-sqlite migrator 用）。
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
