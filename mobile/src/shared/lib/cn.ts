/** className を条件付きで連結する小さなヘルパー（NativeWind 用）。 */
export function cn(
  ...parts: (string | false | null | undefined)[]
): string {
  return parts.filter(Boolean).join(" ");
}
