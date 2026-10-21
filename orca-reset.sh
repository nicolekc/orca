#!/bin/bash
# orca-reset.sh - Remove a Orca container to start fresh
# Usage: orca-reset.sh <container-name>
# 
# SAFE: This only removes the container, NOT your project files or its home:
#   - Project files: on your Mac (mounted)
#   - Home (logins, memory, sessions, settings): ~/.orca/projects/<project>/home on your Mac
#
# Containers created before project home folders existed keep their home inside the
# container, so removing one loses it: run orca-migrate.sh on it first.

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
echo "   Project files and its home are SAFE (both on your Mac)"
if [ -z "$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/home/node"}}home{{end}}{{end}}' "$CONTAINER_NAME")" ]; then
    echo "   ⚠️  EXCEPT: this container predates project home folders — its Claude/gh logins,"
    echo "      memory and sessions live inside it and will be LOST. Run orca-migrate.sh first."
fi
read -p "Continue? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rm -f "$CONTAINER_NAME"
    echo "✅ Container removed"
    echo "   Run orca-start.sh to recreate"
else
    echo "Cancelled"
fi