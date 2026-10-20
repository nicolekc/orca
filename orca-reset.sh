#!/bin/bash
# orca-reset.sh - Remove a Orca container to start fresh
# Usage: orca-reset.sh <container-name>
# 
# SAFE: This only removes the container, NOT your project files:
#   - orca-start.sh projects: Files are on your Mac (mounted)
#   - orca-clone.sh projects: Files are in Docker volume (preserved)
#
# To also delete the volume (rare): docker volume rm orca-vol-<repo-name>

if [ -z "$1" ]; then
    echo "Usage: orca-reset.sh <container-name>"
    echo ""
    echo "Your containers:"
    docker ps -a --format '{{.Names}}' | grep "^orca-" || echo "  (none found)"
    exit 1
fi

CONTAINER_NAME="$1"

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container '$CONTAINER_NAME' not found"
    echo ""
    echo "Your containers:"
    docker ps -a --format '{{.Names}}' | grep "^orca-" || echo "  (none found)"
    exit 1
fi

echo "⚠️  This will delete container: $CONTAINER_NAME"
echo "   Project files are SAFE (on Mac or in Docker volume)"
read -p "Continue? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rm -f "$CONTAINER_NAME"
    echo "✅ Container removed"
    echo "   Run orca-start.sh or orca-clone.sh to recreate"
else
    echo "Cancelled"
fi