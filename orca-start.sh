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

# The project's home folder (~ in the container): its logins, memory, sessions, settings
PROJECT_DIR="$HOME/.orca/projects/$FOLDER_NAME"
HOME_DIR="$PROJECT_DIR/home"

echo "🚀 Orca Container: $CONTAINER_NAME"
echo "📁 Project: $PROJECT_PATH"
echo "🏠 Home: $HOME_DIR"

# One home per project: two folders with the same name must not share memory
mkdir -p "$HOME_DIR"
if [ ! -f "$PROJECT_DIR/project-path" ]; then
    echo "$PROJECT_PATH" > "$PROJECT_DIR/project-path"
elif [ "$(cat "$PROJECT_DIR/project-path")" != "$PROJECT_PATH" ]; then
    echo "❌ $PROJECT_DIR belongs to $(cat "$PROJECT_DIR/project-path"), not this folder"
    echo "   If that project moved here, update $PROJECT_DIR/project-path to this path"
    exit 1
fi

# Handle --fresh: remove existing container
if [ "$FRESH" = true ] && docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" = true ]; then
        echo "❌ $CONTAINER_NAME is running; exit every session in it first (or: docker stop $CONTAINER_NAME)"
        exit 1
    fi
    echo "🗑️  Removing existing container (--fresh)..."
    docker rm -f "$CONTAINER_NAME"
fi

# Refuse if another container is running on this folder: both would edit the same files
for c in $(docker ps --format '{{.Names}}'); do
    if [ "$c" != "$CONTAINER_NAME" ] && [ "$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}' "$c")" = "$PROJECT_PATH" ]; then
        echo "❌ $c is already running on this folder; exit it first (or: docker stop $c)"
        exit 1
    fi
done

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    # A container keeps the image it was created from: say so when orca:latest is newer
    USED=$(docker inspect -f '{{.Image}}' "$CONTAINER_NAME")
    NEWEST=$(docker image inspect -f '{{.Id}}' orca:latest 2>/dev/null || true)
    if [ -n "$NEWEST" ] && [ "$USED" != "$NEWEST" ]; then
        built() { docker image inspect -f '{{.Created}}' "$1" 2>/dev/null | cut -c1-16 | tr T ' '; }
        echo "⬆️  Image update available: this container's image was built $(built "$USED"), the newest $(built "$NEWEST")"
        echo "   To switch, exit and run:  $0 --fresh \"$PROJECT_PATH\""
        echo "   Kept: project files, home (logins, memory, sessions, settings, caches in ~), node_modules"
        echo "   Lost: everything else in the container, e.g. packages installed with sudo apt or"
        echo "         npm install -g, and files written outside /workspace and ~"
    fi
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
        -v "$HOME_DIR:/home/node" \
        orca:latest \
        bash
    # Docker run options explained:
    #   --name              Container name (for resuming later)
    #   --memory, --cpus    Resource limits (adjust if needed)
    #   -v PROJECT:/workspace   Mount your project folder
    #   -v HOME:/home/node  The project's home (~/.orca/projects/<project>/home): survives container removal
    #   -v .gitconfig:...   Git config (read-only)
    #   -v .ssh:...         SSH keys for git push (read-only)
    #   -e GIT_AUTHOR_*     Commits show as "claude-bot" not you
fi