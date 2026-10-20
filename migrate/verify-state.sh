# Container export on stdin → check $STATE_DIR holds exactly the old container's state
set -euo pipefail
source "$(dirname "$0")/common.sh"
STATE_DIR="${STATE_DIR:-/home/node/state}"

old=$(mktemp -d); expected=$(mktemp -d)
extract_state "$old"
map_state "$old/home/node" "$expected"
compare "$expected" "$STATE_DIR" "state"
