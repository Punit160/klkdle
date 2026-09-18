#!/usr/bin/env bash
# One-time on live: move uploads outside git repo and point Node at UPLOADS_DIR.
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PERSISTENT_DIR="${1:-/var/www/klkdle-data/uploads}"
REPO_UPLOADS="$ROOT/Backend/uploads"
ENV_FILE="$ROOT/Backend/.env"

echo "Persistent uploads dir: $PERSISTENT_DIR"
mkdir -p "$PERSISTENT_DIR"/{light-amc,user/profile,bihar/ssl/amc/doc,bihar/ssl/amc/invoice,up/ssl/amc/doc,up/ssl/amc/invoice}

if [ -d "$REPO_UPLOADS" ]; then
  echo "Copying existing repo uploads (no overwrite)..."
  cp -an "$REPO_UPLOADS/." "$PERSISTENT_DIR/" 2>/dev/null || true
fi

touch "$ENV_FILE"
if grep -q '^UPLOADS_DIR=' "$ENV_FILE"; then
  sed -i.bak "s|^UPLOADS_DIR=.*|UPLOADS_DIR=$PERSISTENT_DIR|" "$ENV_FILE"
else
  echo "UPLOADS_DIR=$PERSISTENT_DIR" >> "$ENV_FILE"
fi

chmod -R 755 "$PERSISTENT_DIR"

count="$(find "$PERSISTENT_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "UPLOADS_DIR set in Backend/.env"
echo "Total files in persistent uploads: $count"
echo "Restart backend: pm2 restart all"
