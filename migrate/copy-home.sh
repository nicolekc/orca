# Container export on stdin → the old container's home copied into $DEST
set -euo pipefail
source "$(dirname "$0")/common.sh"
DEST="${DEST:-/dest}"

old=$(mktemp -d)
extract_home "$old"
echo "   $(du -sh "$old/home/node" | cut -f1) in $(find "$old/home/node" -mindepth 1 -maxdepth 1 | wc -l) top-level entries: $(cd "$old/home/node" && ls -A | tr '\n' ' ')"
cp -a "$old/home/node/." "$DEST/"
