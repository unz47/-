import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-text-primary placeholder:text-text-muted outline-none transition-colors focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30",
        className,
      )}
      {...props}
    />
  );
}
