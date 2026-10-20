#!/bin/bash
# orca-migrate.sh - Move an old container's Claude/gh state into a state volume
# Usage: orca-migrate.sh [project-path] [--from <old-path>]
#   project-path  defaults to the current folder; the old container is the one mounting it
#   --from        the folder the old container mounted, if the project has been renamed
#                 since (e.g. orca-migrate.sh ~/orca --from ~/ralph-docker)
#
# Containers created before the state volume existed keep Claude/gh logins, memory,
# sessions, plugins and settings inside the container, where removing it loses them.
# This script:
#   1. Backs up the whole old container as an image (orca-backup/<old>:pre-migration)
#   2. Copies its state into the <new-container>_state volume
#   3. Re-reads the old container and checks every copied file against it
# It never changes or removes the old container. Requires the orca image
# (docker build -t orca .) and the old container stopped.

set -euo pipefail

IMAGE="orca:latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPERS="$SCRIPT_DIR/migrate"
source "$HELPERS/host.sh"

die() { echo "❌ $*" >&2; exit 1; }

TARGET="."
FROM=""
while [ $# -gt 0 ]; do
    case "$1" in
        --from) FROM="${2:-}"; [ -n "$FROM" ] || die "--from needs the old folder path"; shift 2 ;;
        -h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) TARGET="$1"; shift ;;
    esac
done

PROJECT_PATH=$(cd "$TARGET" 2>/dev/null && pwd) || die "Project path '$TARGET' does not exist"
docker image inspect "$IMAGE" >/dev/null 2>&1 || die "Build the image first: docker build -t orca ."

# The old container is the pre-migration one mounting the project (or its old path)
LOOKUP=$(abs_path "${FROM:-$PROJECT_PATH}")
OLD=$(legacy_on "$LOOKUP")
if [ "$(echo "$OLD" | grep -c . || true)" -ne 1 ]; then
    if [ -z "$OLD" ]; then
        echo "❌ No pre-migration container mounts $LOOKUP" >&2
        [ -n "$FROM" ] || echo "   Renamed the project folder? Pass its old path: --from <old-path>" >&2
    else
        echo "❌ Several pre-migration containers mount $LOOKUP; move the unwanted ones aside (docker rename <name> <name>-unused)" >&2
    fi
    echo "   Pre-migration containers:" >&2
    list_legacy >&2
    exit 1
fi
[ "$(docker inspect -f '{{.State.Running}}' "$OLD")" = "false" ] || die "Stop '$OLD' first (exit it, or: docker stop $OLD)"

# Name the new container exactly as orca-start.sh will
FOLDER_NAME=$(basename "$PROJECT_PATH")
if [ -z "$FOLDER_NAME" ] || [ "$FOLDER_NAME" = "/" ]; then
    FOLDER_NAME="project"
fi
NEW="orca-${FOLDER_NAME}"
STATE="${NEW}_state"
BACKUP="orca-backup/$(echo "$OLD" | tr '[:upper:]' '[:lower:]'):pre-migration"

# Never merge into something already in use; a leftover from a failed run is safe to remove
docker container inspect "$NEW" >/dev/null 2>&1 && die "Container '$NEW' already exists"
docker volume inspect "$STATE" >/dev/null 2>&1 && die "Volume '$STATE' already exists (from an earlier run? remove it: docker volume rm $STATE)"

echo "🔀 Migrating $OLD → $NEW"

echo "💾 Backing up the whole container: $BACKUP"
docker commit "$OLD" "$BACKUP" >/dev/null

# Helpers run as the node user, like Claude does; mounting at /home/node/state gives a
# new volume the image's ownership of that dir.
run_helper() {  # run_helper <script> <volume-mount> - stdin is passed through
    docker run --rm -i -v "$2" -v "$HELPERS:/migrate:ro" "$IMAGE" bash "/migrate/$1"
}

echo "📦 Copying state into volume $STATE"
docker export "$OLD" | run_helper copy-state.sh "$STATE:/home/node/state"

echo "🔍 Checking the copy against $OLD"
docker export "$OLD" | run_helper verify-state.sh "$STATE:/home/node/state:ro"

echo ""
if [ -d "$LOOKUP" ]; then
    echo "✅ Migrated. $OLD is unchanged and still runs:  cd $LOOKUP && $SCRIPT_DIR/orca-legacy.sh"
else
    echo "✅ Migrated. $OLD is unchanged, but can't start now its folder is renamed; the backup below can."
fi
echo ""
echo "Next (don't run $OLD and $NEW at the same time — they share the project):"
echo "  1. Start the new container:  cd $PROJECT_PATH && $SCRIPT_DIR/orca-start.sh ."
echo "  2. Inside it, check: claude starts logged in; /memory; claude --resume; gh auth status"
echo "     node_modules starts empty (it's per container): run npm install if the project uses it"
echo "  3. When satisfied:  docker rm $OLD"
echo "     The backup image stays until: docker rmi $BACKUP"
echo "     (restore from it with: docker run -it -v \"$PROJECT_PATH:/workspace\" $BACKUP bash)"
