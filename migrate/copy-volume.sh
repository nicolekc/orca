# Copy a workspace volume ($FROM) into a new one ($TO), then check the copy. Runs as root.
set -euo pipefail
source "$(dirname "$0")/common.sh"
FROM="${FROM:-/from}"; TO="${TO:-/to}"

cp -a "$FROM/." "$TO/"
# The new volume's own root dir is created root-owned; match the original
chown --reference="$FROM" "$TO"
chmod --reference="$FROM" "$TO"
compare "$FROM" "$TO" "repo"
