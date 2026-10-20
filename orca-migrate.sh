#!/bin/bash
# orca-migrate.sh - Move an old container's Claude/gh state into a state volume
# Usage: orca-migrate.sh <old-container> <project-path | repo-url>
#   Pass what you'll pass to orca-start.sh (project path) or orca-clone.sh (repo URL);
#   it determines the new container's name, so the new container finds the state.
#
# Containers created before the state volume existed keep Claude/gh logins, memory,
# sessions, plugins and settings inside the container, where removing it loses them.
# This script:
#   1. Backs up the whole old container as an image (orca-backup/<old>:pre-migration)
#   2. Copies its state into the <new-container>_state volume (and, for orca-clone.sh
#      containers, its cloned repo into orca-vol-<repo>)
#   3. Re-reads the old container and checks every copied file against it
# It never changes or removes the old container. Requires the orca-claude image
# (docker build -t orca-claude .) and the old container stopped.

set -euo pipefail

IMAGE="orca-claude:latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPERS="$SCRIPT_DIR/migrate"

die() { echo "❌ $*" >&2; exit 1; }

OLD="${1:-}"
TARGET="${2:-}"
if [ -z "$OLD" ] || [ -z "$TARGET" ]; then
    echo "Usage: orca-migrate.sh <old-container> <project-path | repo-url>"
    echo ""
    echo "Containers without a state volume:"
    for c in $(docker ps -a --format '{{.Names}}'); do
        docker inspect -f '{{range .Mounts}}{{.Destination}} {{end}}' "$c" | grep -q '/home/node/state' || echo "  $c"
    done
    exit 1
fi

docker image inspect "$IMAGE" >/dev/null 2>&1 || die "Build the image first: docker build -t orca-claude ."
docker container inspect "$OLD" >/dev/null 2>&1 || die "No container named '$OLD'"
[ "$(docker inspect -f '{{.State.Running}}' "$OLD")" = "false" ] || die "Stop '$OLD' first (exit it, or: docker stop $OLD)"

# How the old container got its project: a mounted folder (orca-start.sh) or a cloned volume (orca-clone.sh)
WS_TYPE=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Type}}{{end}}{{end}}' "$OLD")
OLD_WS_VOLUME=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Name}}{{end}}{{end}}' "$OLD")

# Name the new container exactly as orca-start.sh / orca-clone.sh will
if [[ "$TARGET" == *://* || "$TARGET" == git@* ]]; then
    [ "$WS_TYPE" = "volume" ] || die "'$OLD' mounts a project folder; pass the project path instead of a URL"
    REPO_NAME=$(basename "$TARGET" .git)
    NEW="orca-${REPO_NAME}"
    NEW_WS_VOLUME="orca-vol-${REPO_NAME}"
    NEXT="$SCRIPT_DIR/orca-clone.sh $TARGET"
else
    [ "$WS_TYPE" = "bind" ] || die "'$OLD' clones its project into a volume; pass the repo URL instead of a path"
    PROJECT_PATH=$(cd "$TARGET" && pwd) || die "Project path '$TARGET' does not exist"
    FOLDER_NAME=$(basename "$PROJECT_PATH")
    if [ -z "$FOLDER_NAME" ] || [ "$FOLDER_NAME" = "/" ]; then
        FOLDER_NAME="project"
    fi
    NEW="orca-${FOLDER_NAME}"
    NEW_WS_VOLUME=""
    NEXT="$SCRIPT_DIR/orca-start.sh $PROJECT_PATH"
fi
STATE="${NEW}_state"
BACKUP="orca-backup/$(echo "$OLD" | tr '[:upper:]' '[:lower:]'):pre-migration"

# Never merge into something already in use; a leftover from a failed run is safe to remove
docker container inspect "$NEW" >/dev/null 2>&1 && die "Container '$NEW' already exists"
docker volume inspect "$STATE" >/dev/null 2>&1 && die "Volume '$STATE' already exists (from an earlier run? remove it: docker volume rm $STATE)"
if [ -n "$NEW_WS_VOLUME" ]; then
    docker volume inspect "$NEW_WS_VOLUME" >/dev/null 2>&1 && die "Volume '$NEW_WS_VOLUME' already exists (from an earlier run? remove it: docker volume rm $NEW_WS_VOLUME)"
fi

echo "🔀 Migrating $OLD → $NEW"

echo "💾 Backing up the whole container: $BACKUP"
docker commit "$OLD" "$BACKUP" >/dev/null

# Helpers run as the node user, like Claude does; mounting at /home/node/state gives a
# new volume the image's ownership of that dir.
run_helper() {  # run_helper <script> [docker run options...] - stdin is passed through
    local script="$1"; shift
    docker run --rm -i "$@" -v "$HELPERS:/migrate:ro" "$IMAGE" bash "/migrate/$script"
}

echo "📦 Copying state into volume $STATE"
docker export "$OLD" | run_helper copy-state.sh -v "$STATE:/home/node/state"

echo "🔍 Checking the copy against $OLD"
docker export "$OLD" | run_helper verify-state.sh -v "$STATE:/home/node/state:ro"

if [ -n "$NEW_WS_VOLUME" ]; then
    echo "📦 Copying cloned repo: $OLD_WS_VOLUME → $NEW_WS_VOLUME"
    run_helper copy-volume.sh --user root -v "$OLD_WS_VOLUME:/from:ro" -v "$NEW_WS_VOLUME:/to" </dev/null
fi

echo ""
echo "✅ Migrated. $OLD is unchanged and still runs: docker start -ai $OLD"
echo ""
echo "Next (don't run $OLD and $NEW at the same time — they share the project):"
echo "  1. Create the new container:  $NEXT"
echo "  2. Inside it, check: claude starts logged in; /memory; claude --resume; gh auth status"
if [ -z "$NEW_WS_VOLUME" ]; then
    echo "     node_modules starts empty (it's per container): run npm install if the project uses it"
fi
echo "  3. When satisfied:  docker rm $OLD"
echo "     The backup image stays until: docker rmi $BACKUP"
echo "     (restore from it with: docker run -it $BACKUP bash)"
