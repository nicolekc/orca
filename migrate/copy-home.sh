# Container export on stdin → the old container's home copied into $DEST
set -euo pipefail
source "$(dirname "$0")/common.sh"
DEST="${DEST:-/dest}"

old=$(mktemp -d)
extract_home "$old"
echo "   $(du -sh "$old/home/node" | cut -f1) in $(find "$old/home/node" -mindepth 1 -maxdepth 1 | wc -l) top-level entries: $(cd "$old/home/node" && ls -A | tr '\n' ' ')"
clashes=$(case_collisions "$old/home/node")
if [ -n "$clashes" ]; then
    echo "❌ The Mac's disk doesn't tell upper from lower case, and these paths in the old home differ only in case:" >&2
    echo "$clashes" | head -20 | sed 's/^/   /' >&2
    echo "   Nothing was copied. Remove one of each from the old container, or if the folder can be rebuilt, add it to SKIP in migrate/common.sh; then run this again." >&2
    exit 1
fi
cp -a "$old/home/node/." "$DEST/"
