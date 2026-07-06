import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useThemeColors } from "@/shared/config/theme";

/**
 * ドーナツチャート（カテゴリ別内訳）。react-native-svg の stroke-dasharray で
 * スライスを描く自前実装（重いチャートライブラリは入れない方針 / §12.1）。
 * 配色は呼び出し側がカテゴリパレット（colors.ts）から渡す。
 */
export interface DonutSlice {
  key: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  /** 中央に重ねる内容（合計金額など）。 */
  children?: ReactNode;
}

export function DonutChart({
  slices,
  size = 168,
  strokeWidth = 22,
  children,
}: DonutChartProps) {
  const colors = useThemeColors();
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  // スライス間の視覚ギャップ（弧長）。1 スライスのときは不要。
  const gap = slices.length > 1 ? 3 : 0;

  // 各スライスの弧長と開始位置（先頭からの累積）。再代入なしの純計算（n は高々カテゴリ数）。
  const lens = slices.map((s) => (total > 0 ? (s.value / total) * c : 0));
  const arcs = slices.map((s, i) => ({
    ...s,
    start: lens.slice(0, i).reduce((a, b) => a + b, 0),
    len: Math.max(0, lens[i] - gap),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel="カテゴリ別の内訳グラフ"
    >
      <Svg width={size} height={size}>
        {/* 下地のリング（データ 0 のときも面が出る） */}
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {arcs.map(
          (a) =>
            a.len > 0 && (
              <Circle
                key={a.key}
                cx={center}
                cy={center}
                r={r}
                stroke={a.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="butt"
                strokeDasharray={`${a.len} ${c - a.len}`}
                strokeDashoffset={-a.start}
                transform={`rotate(-90 ${center} ${center})`}
              />
            ),
        )}
      </Svg>
      {children && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}
