#!/usr/bin/env bash
# 同步根目录源码页面 → workers/public（Workers 静态托管）
# 改完根目录页面后跑一次，再 wrangler deploy
set -e
cd "$(dirname "$0")/.."
cp index.html product-explorer.html virtual-tour.html thank-you.html admin.html workers/public/
rsync -a --delete assets/ workers/public/assets/
echo "✓ 已同步 workers/public（记得 cd workers && wrangler deploy）"
