import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none",
  {
    variants: {
      variant: {
        // 値上げ専用（赤）。装飾には使わない
        danger: "bg-danger/15 text-danger",
        // 値下げ（緑）
        success: "bg-success/15 text-success",
        // 中立（プラン変更・自動計上など）
        neutral: "bg-info/15 text-info",
        // 解約済み・非アクティブ
        muted: "bg-surface-raised text-text-muted",
        // アクセント（契約開始など）
        accent: "bg-accent/15 text-accent",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
