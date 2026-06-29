import { Pressable, Text } from "react-native";

import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
}

// 赤(danger)は値上げ/破壊操作のシグナル専用。装飾には使わない（PROJECT_PLAN §3）。
const BG: Record<Variant, string> = {
  primary: "bg-accent",
  ghost: "bg-surface-raised border border-border",
  danger: "bg-danger",
};
const FG: Record<Variant, string> = {
  primary: "text-on-accent",
  ghost: "text-text-primary",
  danger: "text-on-accent",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  className,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "items-center justify-center rounded-xl px-5 py-3 active:opacity-80",
        BG[variant],
        disabled && "opacity-40",
        className,
      )}
    >
      <Text className={cn("text-base font-semibold", FG[variant])}>{label}</Text>
    </Pressable>
  );
}
