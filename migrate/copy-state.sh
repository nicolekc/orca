# Container export on stdin → old state copied into $STATE_DIR in the new layout
set -euo pipefail
source "$(dirname "$0")/common.sh"
STATE_DIR="${STATE_DIR:-/home/node/state}"

old=$(mktemp -d)
extract_state "$old"
home="$old/home/node"
for p in .claude .claude.json .config/gh; do
    if [ -e "$home/$p" ]; then echo "   found ~/$p ($(du -sh "$home/$p" | cut -f1))"; else echo "   no ~/$p (skipped)"; fi
done
map_state "$home" "$STATE_DIR"
