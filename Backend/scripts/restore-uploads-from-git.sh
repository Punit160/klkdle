#!/usr/bin/env bash
# Restore Backend/uploads from last git commit that tracked them.
# Safe to run on live after uploads were removed from repo by .gitignore.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
UPLOADS_DIR="$ROOT/Backend/uploads"
# Default: last commit before uploads were removed from git.
# On live you can pass your commit that still has files, e.g. a25086d
SOURCE_COMMIT="${1:-807cdc4}"

cd "$ROOT"

if ! git cat-file -e "${SOURCE_COMMIT}^{commit}" 2>/dev/null; then
  echo "Commit not found: $SOURCE_COMMIT"
  exit 1
fi

mkdir -p "$UPLOADS_DIR"

echo "Restoring uploads from commit $SOURCE_COMMIT ..."
git restore --source="$SOURCE_COMMIT" --worktree -- Backend/uploads/

# Keep .gitignore behaviour — do not leave uploads staged for commit
git reset HEAD -- Backend/uploads >/dev/null 2>&1 || true

count="$(find "$UPLOADS_DIR" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')"
chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || true

echo "Done. Restored $count file(s) under Backend/uploads/"
echo "Restart the Node backend if images still do not load."
