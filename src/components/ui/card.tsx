import { cn } from "@/lib/utils";

/** Midnight Ledger の面カード（surface 層）。データを載せる基本コンテナ。 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface",
        className,
      )}
      {...props}
    />
  );
}
