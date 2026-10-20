#!/bin/bash
# orca-start.sh - Start Orca container with local project mounted
# Usage: orca-start.sh [--fresh] /path/to/project [container-name]
#   --fresh    Remove existing container and create new one
#
# Note: node_modules uses a separate Docker volume because Mac and Linux
# have different architectures. Run `npm install` inside the container.

set -e  # Exit on any error

# Check for --fresh flag
FRESH=false
if [ "$1" = "--fresh" ] || [ "$1" = "-f" ]; then
    FRESH=true
    shift
fi

# Arguments with defaults
PROJECT_PATH="${1:-.}"                                    # Default: current directory

# Convert to absolute path (fails if path doesn't exist)
PROJECT_PATH=$(cd "$PROJECT_PATH" && pwd) || {
    echo "❌ Error: Project path '$1' does not exist"
    exit 1
}

# Get folder name for container (handles trailing slashes and edge cases)
FOLDER_NAME=$(basename "$PROJECT_PATH")
if [ -z "$FOLDER_NAME" ] || [ "$FOLDER_NAME" = "/" ]; then
    FOLDER_NAME="project"
fi
CONTAINER_NAME="${2:-orca-$FOLDER_NAME}"

echo "🚀 Orca Container: $CONTAINER_NAME"
echo "📁 Project: $PROJECT_PATH"

# Handle --fresh: remove existing container
if [ "$FRESH" = true ] && docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "🗑️  Removing existing container (--fresh)..."
    docker rm -f "$CONTAINER_NAME"
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "📦 Resuming existing container..."
    docker start -ai "$CONTAINER_NAME"
else
    echo "📦 Creating new container..."
    docker run -it \
        --name "$CONTAINER_NAME" \
        --memory="8g" \
        --cpus="4" \
        -v "$PROJECT_PATH:/workspace" \
        -v "${CONTAINER_NAME}_node_modules:/workspace/node_modules" \
        -v "${CONTAINER_NAME}_state:/home/node/state" \
        orca:latest \
        bash
    # Docker run options explained:
    #   --name              Container name (for resuming later)
    #   --memory, --cpus    Resource limits (adjust if needed)
    #   -v PROJECT:/workspace   Mount your project folder
    #   -v ..._state:...    Claude/gh logins, memory, sessions (survive container removal)
    #   -v .gitconfig:...   Git config (read-only)
    #   -v .ssh:...         SSH keys for git push (read-only)
    #   -e GIT_AUTHOR_*     Commits show as "claude-bot" not you
fi