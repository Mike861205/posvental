#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/posvental"

if [ ! -d "$APP_DIR" ]; then
  echo "App directory not found: $APP_DIR"
  echo "Clone first: git clone https://github.com/Mike861205/posvental.git $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[1/6] Pull latest"
git pull origin main

echo "[2/6] Install deps"
npm ci

echo "[3/6] Prisma sync"
npm run db:push
npx prisma generate --no-engine

echo "[4/6] Build"
npm run build

echo "[5/6] Restart PM2"
if pm2 describe posexercise >/dev/null 2>&1; then
  pm2 restart posexercise
else
  pm2 start deploy/liquidweb/ecosystem.config.cjs
fi

echo "[6/6] Save PM2"
pm2 save

echo "Done. Check: pm2 status && pm2 logs posexercise --lines 80"
