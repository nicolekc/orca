#!/bin/bash
# orca-legacy.sh - Start this project's pre-migration container
# Usage: orca-legacy.sh [/path/to/project]    (default: current directory)
#
# Containers created before the state volume existed are still runnable while you
# migrate them (orca-migrate.sh). This finds one by the folder it mounts rather than
# by name, so it works whatever the container was called.
# Temporary: delete this script once every project is migrated.

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/migrate/host.sh"

PROJECT_PATH=$(cd "${1:-.}" && pwd) || { echo "❌ Project path '${1:-.}' does not exist"; exit 1; }

ON_FOLDER=$(containers_on "$PROJECT_PATH")
LEGACY=$(legacy_on "$PROJECT_PATH")
RUNNING_NEW=$(echo "$ON_FOLDER" | awk -F'|' '$3 == "state" && $2 == "true" { print $1 }')

if [ -z "$LEGACY" ]; then
    echo "❌ No pre-migration container mounts $PROJECT_PATH"
    BACKUPS=$(docker images --filter 'reference=orca-backup/*' --format '{{.Repository}}:{{.Tag}}')
    if [ -n "$BACKUPS" ]; then
        echo "   If it was removed, or the folder was renamed since, run its backup on this folder instead:"
        echo "$BACKUPS" | sed "s|.*|     docker run -it --rm -v \"$PROJECT_PATH:/workspace\" & bash|"
    fi
    exit 1
fi
if [ "$(echo "$LEGACY" | grep -c .)" -gt 1 ]; then
    echo "❌ Several pre-migration containers mount $PROJECT_PATH; start one by name:"
    echo "$LEGACY" | sed 's/^/     docker start -ai /'
    exit 1
fi
if [ -n "$RUNNING_NEW" ]; then
    echo "❌ $RUNNING_NEW is running on this folder; exit it first (or: docker stop $RUNNING_NEW)"
    exit 1
fi

echo "🕰️  Pre-migration container: $LEGACY"
echo "📁 Project: $PROJECT_PATH"
exec docker start -ai "$LEGACY"
