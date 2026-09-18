#!/usr/bin/env bash
# Safe live deploy: pull code, build frontend, run migrations — never touch UPLOADS_DIR.
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull origin main

echo "==> backend install + migrate"
cd "$ROOT/Backend"
npm install
npx prisma generate
npx prisma migrate deploy

echo "==> frontend build"
cd "$ROOT/Frontend"
npm install
npm run build

echo "==> restart app"
cd "$ROOT/Backend"
pm2 restart all || npm start

echo "==> uploads info"
curl -s "http://127.0.0.1:${PORT:-4000}/api/uploads-info" || true
echo
echo "Deploy done. Uploads folder is NOT managed by git."
