import { View, type ViewProps } from "react-native";

import { cn } from "@/shared/lib/cn";

/** Midnight Ledger の面カード（surface-raised + border）。 */
export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        "rounded-2xl border border-border bg-surface-raised p-4",
        className,
      )}
      {...props}
    />
  );
}
