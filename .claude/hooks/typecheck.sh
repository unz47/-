#!/usr/bin/env bash
# PostToolUse hook: TypeScript ファイルを編集したら型チェックを走らせる。
# .ts / .tsx 以外の編集では何もしない。tsc が赤なら非ゼロ終了して Claude に差し戻す。
set -uo pipefail

file_path="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"

case "$file_path" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

cd "$(dirname "$0")/../.." || exit 0

# mobile/ は独立プロジェクト（--ignore-workspace）なので、そちらの tsc で検査する。
case "$file_path" in
  */mobile/*) cd mobile || exit 0 ;;
esac

# 依存未導入（node_modules 無し）なら検査できないので素通しする。
[ -d node_modules ] || exit 0

# 出力は stderr に集約（PostToolUse は非ゼロ時に stderr を Claude へ渡す）。
if ! out="$(pnpm -s typecheck 2>&1)"; then
  echo "型チェック (tsc --noEmit) が失敗しました:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
