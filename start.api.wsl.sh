#!/usr/bin/env bash
# ==========================================================================
# Bootstrap chạy FULL stack trong WSL khi source nằm trên ổ Windows (/mnt/...).
#
# I/O trên /mnt/<drive> từ WSL rất chậm (drvfs/9p) → script này ĐỒNG BỘ source
# sang filesystem ext4 của WSL ($HOME/thang-long), cài deps Linux ở đó rồi chạy
# stack. Nhanh hơn nhiều so với chạy trực tiếp trên /mnt.
#
# Dùng (CHẠY TRONG WSL, từ thư mục dự án trên /mnt):
#   bash start.api.win.sh              # đồng bộ + (cài deps lần đầu) + BE + FE
#   bash start.api.win.sh --no-web     # chỉ backend
#   bash start.api.win.sh --s3         # kèm LocalStack
#   bash start.api.win.sh --fresh      # tạo lại schema (xoá data)
#   bash start.api.win.sh --reinstall  # ép cài lại node_modules sạch
#
# Quy trình: SỬA CODE + GIT trên Windows (/mnt) → chạy lại script để đồng bộ &
# khởi động trong WSL. (Watch không phản ánh sửa đổi giữa chừng; sửa xong chạy lại.)
#
# Đổi thư mục đích:  TLCV_WSL_DIR=~/duan bash start.api.win.sh
# ==========================================================================

# (Dọn tiến trình/cổng cũ do start.api.sh xử lý ở bước 0 — không cần pkill ở đây.)

set -e

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${TLCV_WSL_DIR:-$HOME/thang-long}"

case "$SRC" in
  /mnt/*) ;;  # đúng kịch bản: source trên ổ Windows
  *) echo "ℹ️  Source đã ở ext4 ($SRC) — không cần script này, dùng ./start.api.sh."; ;;
esac

# Tách cờ --reinstall (riêng của script này) khỏi các cờ chuyển cho start.api.sh
REINSTALL="0"; ARGS=()
for a in "$@"; do
  if [ "$a" = "--reinstall" ]; then REINSTALL="1"; else ARGS+=("$a"); fi
done

echo "==> Đồng bộ source:  $SRC  ->  $DEST"
echo "    (bỏ qua node_modules, dist, .nuxt, .output, vendor, .git)"
mkdir -p "$DEST"
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.nuxt' \
  --exclude '.output' \
  --exclude 'vendor' \
  --exclude '.git' \
  "$SRC/" "$DEST/"

cd "$DEST"

if [ "$REINSTALL" = "1" ] || [ ! -d node_modules ]; then
  echo "==> Cài dependencies trong WSL/ext4 (Linux binaries — nhanh)"
  rm -rf node_modules apps/*/node_modules pnpm-lock.yaml
  pnpm install
fi

echo "==> Khởi động stack tại $DEST"
exec ./start.api.sh "apps"


