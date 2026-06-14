import { getServiceIcon } from "@/lib/brands";
import { cn } from "@/lib/utils";

interface ServiceLogoProps {
  serviceName: string;
  /** プリセット由来なら presetId を渡すと確実にロゴが当たる。 */
  presetId?: string;
  /**
   * チップ（丸）に当てるクラス。サイズ・背景・文字サイズはここで指定する。
   * 既定は size-10 / bg-surface-raised。glyph はチップの 1/2 で追従する。
   */
  className?: string;
}

/**
 * サブスクのサムネ。ブランドが分かれば simple-icons の単色シルエット、
 * 無ければサービス名の頭文字アバターにフォールバックする。
 * ロゴは装飾（隣にサービス名テキストがある）なので aria-hidden。
 * 色は付けず currentColor（テーマ色）で描く＝赤シグナル規律を崩さない。
 */
export function ServiceLogo({
  serviceName,
  presetId,
  className,
}: ServiceLogoProps) {
  const icon = getServiceIcon({ presetId, serviceName });
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised font-semibold text-text-secondary",
        className,
      )}
    >
      {icon ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-1/2">
          <path d={icon.path} />
        </svg>
      ) : (
        serviceName.charAt(0)
      )}
    </span>
  );
}
