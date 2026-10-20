# Container export on stdin → check $DEST holds exactly the old container's home
set -euo pipefail
source "$(dirname "$0")/common.sh"
DEST="${DEST:-/dest}"

old=$(mktemp -d)
extract_home "$old"
compare "$old/home/node" "$DEST"
