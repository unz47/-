// NativeWind v4: global.css を入力に Tailwind を Metro へ統合。
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Drizzle のマイグレーション(.sql)を import できるように Metro に拡張子を追加。
config.resolver.sourceExts.push("sql");

module.exports = withNativeWind(config, { input: "./src/global.css" });
