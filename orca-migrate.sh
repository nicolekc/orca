#!/bin/bash
# orca-migrate.sh - Move an old container's Claude/gh state into a state volume
# Usage: orca-migrate.sh [project-path] [--from <old-path | old-container>]
#        orca-migrate.sh <repo-url> --from <old-container>      (orca-clone.sh projects)
#   project-path  defaults to the current folder; the old container is the one mounting it
#   --from        where the old container is, if not there: the folder it mounted before a
#                 rename (e.g. orca-migrate.sh ~/orca --from ~/ralph-docker), or its name
#
# Containers created before the state volume existed keep Claude/gh logins, memory,
# sessions, plugins and settings inside the container, where removing it loses them.
# This script:
#   1. Backs up the whole old container as an image (orca-backup/<old>:pre-migration)
#   2. Copies its state into the <new-container>_state volume (and, for orca-clone.sh
#      containers, its cloned repo into orca-vol-<repo>)
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
        --from) FROM="${2:-}"; [ -n "$FROM" ] || die "--from needs an old folder path or container name"; shift 2 ;;
        -h|--help) sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) TARGET="$1"; shift ;;
    esac
done
IS_URL=false
if [[ "$TARGET" == *://* || "$TARGET" == git@* ]]; then IS_URL=true; fi

no_old() {  # no_old <message>: explain, list the candidates, exit
    echo "❌ $1" >&2
    echo "   Pre-migration containers:" >&2
    list_legacy >&2
    echo "   Say which with --from <old-folder-path | container-name>" >&2
    exit 1
}

docker image inspect "$IMAGE" >/dev/null 2>&1 || die "Build the image first: docker build -t orca ."

# Find the old container: by name, else by the folder it mounts
if [ -n "$FROM" ] && docker container inspect "$FROM" >/dev/null 2>&1; then
    OLD="$FROM"
elif [ -n "$FROM" ] || [ "$IS_URL" = false ]; then
    LOOKUP=$(abs_path "${FROM:-$TARGET}")
    FOUND=$(legacy_on "$LOOKUP")
    case "$(echo "$FOUND" | grep -c . || true)" in
        0) if [ -n "$FROM" ]; then no_old "No pre-migration container mounts $LOOKUP"; fi
           no_old "No pre-migration container mounts $LOOKUP (renamed the folder? pass its old path with --from)" ;;
        1) OLD="$FOUND" ;;
        *) no_old "Several pre-migration containers mount $LOOKUP" ;;
    esac
else
    no_old "For a repo URL, say which container it was cloned in"
fi

[ "$(docker inspect -f '{{.State.Running}}' "$OLD")" = "false" ] || die "Stop '$OLD' first (exit it, or: docker stop $OLD)"

# How the old container got its project: a mounted folder (orca-start.sh) or a cloned volume (orca-clone.sh)
WS_TYPE=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Type}}{{end}}{{end}}' "$OLD")
OLD_WS_VOLUME=$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Name}}{{end}}{{end}}' "$OLD")

# Name the new container exactly as orca-start.sh / orca-clone.sh will
if [ "$IS_URL" = true ]; then
    [ "$WS_TYPE" = "volume" ] || die "'$OLD' mounts a project folder; pass the project path instead of a URL"
    REPO_NAME=$(basename "$TARGET" .git)
    NEW="orca-${REPO_NAME}"
    NEW_WS_VOLUME="orca-vol-${REPO_NAME}"
    NEXT="$SCRIPT_DIR/orca-clone.sh $TARGET"
    RUN_OLD="docker start -ai $OLD"
else
    [ "$WS_TYPE" = "bind" ] || die "'$OLD' clones its project into a volume; pass the repo URL instead of a path"
    PROJECT_PATH=$(cd "$TARGET" && pwd) || die "Project path '$TARGET' does not exist"
    FOLDER_NAME=$(basename "$PROJECT_PATH")
    if [ -z "$FOLDER_NAME" ] || [ "$FOLDER_NAME" = "/" ]; then
        FOLDER_NAME="project"
    fi
    NEW="orca-${FOLDER_NAME}"
    NEW_WS_VOLUME=""
    NEXT="cd $PROJECT_PATH && $SCRIPT_DIR/orca-start.sh ."
    RUN_OLD="cd $PROJECT_PATH && $SCRIPT_DIR/orca-legacy.sh"
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
echo "✅ Migrated. $OLD is unchanged and still runs:  $RUN_OLD"
echo ""
echo "Next (don't run $OLD and $NEW at the same time — they share the project):"
echo "  1. Start the new container:  $NEXT"
echo "  2. Inside it, check: claude starts logged in; /memory; claude --resume; gh auth status"
if [ -z "$NEW_WS_VOLUME" ]; then
    echo "     node_modules starts empty (it's per container): run npm install if the project uses it"
fi
echo "  3. When satisfied:  docker rm $OLD"
echo "     The backup image stays until: docker rmi $BACKUP"
echo "     (restore from it with: docker run -it $BACKUP bash)"
