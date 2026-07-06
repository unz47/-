import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

import { formatYen } from "@/shared/lib/money";

/**
 * 金額のカウントアップ表示。値が変わると現在表示から目標値へ ease-out で追従する。
 * 桁ブレを防ぐため tabular-nums で描く。表示専用（保持する値は常に円・整数）。
 */
interface AnimatedYenProps {
  value: number;
  className?: string;
  durationMs?: number;
}

function useCountUp(target: number, durationMs: number): number {
  const [display, setDisplay] = useState(target);
  // 直近の表示値。ref の更新は effect/コールバック内だけで行う（レンダー中は触らない）。
  const latestRef = useRef(target);

  useEffect(() => {
    const from = latestRef.current;
    if (from === target) return;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      latestRef.current = value;
      setDisplay(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

export function AnimatedYen({
  value,
  className,
  durationMs = 550,
}: AnimatedYenProps) {
  const display = useCountUp(value, durationMs);
  return (
    <Text
      className={className}
      style={{ fontVariant: ["tabular-nums"] }}
      accessibilityLabel={formatYen(value)}
    >
      {formatYen(display)}
    </Text>
  );
}
