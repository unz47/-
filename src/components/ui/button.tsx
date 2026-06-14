import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // 主アクセント（プライマリ操作）
        accent: "bg-accent text-on-accent hover:bg-accent-glow",
        // 面の上の控えめなボタン
        surface:
          "bg-surface-raised text-text-primary hover:bg-surface-raised/70 border border-border",
        ghost: "text-text-secondary hover:bg-surface-raised hover:text-text-primary",
        // 破壊的操作（削除）。赤は値上げ専用なので削除には danger を使わず控えめ色にする
        subtle: "text-text-muted hover:text-text-primary hover:bg-surface-raised",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "surface", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
