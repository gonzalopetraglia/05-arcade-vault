#!/usr/bin/env bash
# PostToolUse hook: format the file Claude just wrote with Prettier, then
# auto-fix it with ESLint. Scoped to this repository via .claude/settings.json.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

payload=$(cat)
file=$(printf '%s' "$payload" | node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(raw);
    process.stdout.write((data.tool_input && data.tool_input.file_path) || "");
  } catch {
    process.stdout.write("");
  }
});
' 2>/dev/null)

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

# Only touch files inside this project.
case "$file" in
  "$PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

case "$file" in
  */node_modules/*|*/.next/*|*/references/*|*/.git/*) exit 0 ;;
esac

ext="${file##*.}"
case "$ext" in
  ts|tsx|js|jsx|mjs|cjs|json|css|md|mdx|yml|yaml) ;;
  *) exit 0 ;;
esac

cd "$PROJECT_DIR" || exit 0

if ! out=$(npx --no-install prettier --write "$file" 2>&1); then
  echo "prettier failed on $file:" >&2
  echo "$out" >&2
  exit 2
fi

case "$ext" in
  ts|tsx|js|jsx|mjs|cjs)
    if ! out=$(npx --no-install eslint --fix "$file" 2>&1); then
      echo "eslint reported problems in $file that could not be auto-fixed:" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac

exit 0
