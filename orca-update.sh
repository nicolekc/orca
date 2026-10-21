#!/bin/bash
# orca-update.sh - Get the newest orca image, built by GitHub Actions from main
# Usage: orca-update.sh
#
# Existing containers keep the image they were created from; orca-start.sh says when one
# is out of date and how to switch. Building locally (docker build -t orca .) still works.

set -e

REMOTE="ghcr.io/nicolekc/orca:latest"
BEFORE=$(docker image inspect -f '{{.Id}}' orca:latest 2>/dev/null || true)

docker pull "$REMOTE" || {
    echo "❌ Couldn't pull $REMOTE"
    echo "   If the package is private: gh auth token | docker login ghcr.io -u <github-user> --password-stdin"
    exit 1
}
docker tag "$REMOTE" orca:latest

if [ "$(docker image inspect -f '{{.Id}}' orca:latest)" = "$BEFORE" ]; then
    echo "✅ Already up to date"
else
    echo "✅ orca:latest updated. Containers pick it up when recreated; orca-start.sh shows how."
fi
