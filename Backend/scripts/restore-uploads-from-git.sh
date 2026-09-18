#!/usr/bin/env bash
# Restore Backend/uploads from last git commit that tracked them.
# Safe to run on live after uploads were removed from repo by .gitignore.
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/Backend/.env"
if [ -f "$ENV_FILE" ] && grep -q '^UPLOADS_DIR=' "$ENV_FILE"; then
  UPLOADS_DIR="$(grep '^UPLOADS_DIR=' "$ENV_FILE" | tail -1 | cut -d= -f2-)"
else
  UPLOADS_DIR="$ROOT/Backend/uploads"
fi
# Default: last commit before uploads were removed from git.
# On live you can pass your commit that still has files, e.g. a25086d
SOURCE_COMMIT="${1:-807cdc4}"

cd "$ROOT"

if ! git cat-file -e "${SOURCE_COMMIT}^{commit}" 2>/dev/null; then
  echo "Commit not found: $SOURCE_COMMIT"
  exit 1
fi

mkdir -p "$UPLOADS_DIR"
TMP_RESTORE="$ROOT/.upload-restore-tmp"
rm -rf "$TMP_RESTORE"
mkdir -p "$TMP_RESTORE"

echo "Restoring uploads from commit $SOURCE_COMMIT ..."
git archive "$SOURCE_COMMIT" Backend/uploads | tar -x -C "$TMP_RESTORE"
cp -an "$TMP_RESTORE/Backend/uploads/." "$UPLOADS_DIR/" 2>/dev/null || true
rm -rf "$TMP_RESTORE"

git reset HEAD -- Backend/uploads >/dev/null 2>&1 || true

count="$(find "$UPLOADS_DIR" -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d ' ')"
chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || true

echo "Done. Restored $count file(s) under $UPLOADS_DIR"
echo "Restart the Node backend if images still do not load."
