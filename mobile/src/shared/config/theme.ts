// JS の style 用パレット（タブバー/インジケータ/アイコン等、className を使えない箇所のみ）。
// className で着色できるものは tailwind トークン（CSS変数）を使うこと。生HEXはここに集約。
import { useColorScheme } from "nativewind";

export const THEME = {
  dark: {
    base: "#0B0E14",
    surface: "#151A23",
    surfaceRaised: "#1E242F",
    border: "#2A313D",
    textPrimary: "#E6EAF0",
    textSecondary: "#9BA4B4",
    textMuted: "#5C6678",
    accent: "#2DD4BF",
    onAccent: "#07120F",
  },
  light: {
    base: "#EDF0F4",
    surface: "#F6F8FB",
    surfaceRaised: "#FFFFFF",
    border: "#DCE1E8",
    textPrimary: "#1B2330",
    textSecondary: "#586071",
    textMuted: "#97A0AE",
    accent: "#0D9488",
    onAccent: "#FFFFFF",
  },
} as const;

export type ThemeColors = { [K in keyof (typeof THEME)["dark"]]: string };

/** 現在のスキームの生HEX。JS style 専用（className では使わない）。 */
export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return THEME[colorScheme === "light" ? "light" : "dark"];
}
