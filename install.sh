#!/bin/bash
#
# Orca Framework Installer
#
# Installs the Orca agent framework into a target project.
# Safe to run multiple times (idempotent).
#
# Usage:
#   ./install.sh /path/to/project
#   ./install.sh --bash-loop /path/to/project
#

set -e

ORCA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Argument parsing ---

BASH_LOOP=false
TARGET_DIR=""

for arg in "$@"; do
    case "$arg" in
        --bash-loop)
            BASH_LOOP=true
            ;;
        -*)
            echo "Error: Unknown option '$arg'"
            echo ""
            echo "Usage: $0 [--bash-loop] /path/to/project"
            exit 1
            ;;
        *)
            if [ -n "$TARGET_DIR" ]; then
                echo "Error: Multiple target directories specified."
                echo ""
                echo "Usage: $0 [--bash-loop] /path/to/project"
                exit 1
            fi
            TARGET_DIR="$arg"
            ;;
    esac
done

if [ -z "$TARGET_DIR" ]; then
    echo "Error: Please provide the path to your project."
    echo ""
    echo "Usage: $0 [--bash-loop] /path/to/project"
    echo ""
    echo "Examples:"
    echo "  $0 ~/projects/my-app"
    echo "  $0 --bash-loop ~/projects/my-app"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: '$TARGET_DIR' is not a directory or does not exist."
    exit 1
fi

if [ ! -d "$TARGET_DIR/.git" ]; then
    echo "Error: '$TARGET_DIR' is not a git repository."
    echo "Initialize git first: cd $TARGET_DIR && git init"
    exit 1
fi

# Resolve to absolute path
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

# --- Tracking ---

CREATED=()
UPDATED=()
UNCHANGED=()

# --- Helpers ---

# Copy a single file. Framework-managed files overwrite; user files skip.
#   copy_framework_file SRC DEST LABEL
#     Always overwrites if content differs.
#   copy_user_file SRC DEST LABEL
#     Only creates if absent. Never overwrites.
copy_framework_file() {
    local src="$1" dest="$2" label="$3"
    if [ ! -f "$src" ]; then
        echo "Warning: Source not found: $src"
        return 1
    fi
    if [ -f "$dest" ]; then
        if cmp -s "$src" "$dest"; then
            UNCHANGED+=("$label")
        else
            cp "$src" "$dest"
            UPDATED+=("$label")
        fi
    else
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        CREATED+=("$label")
    fi
}

copy_user_file() {
    local src="$1" dest="$2" label="$3"
    if [ -f "$dest" ]; then
        UNCHANGED+=("$label")
    else
        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"
        CREATED+=("$label")
    fi
}

# Copy a directory tree. Framework-managed: overwrites all files.
#   copy_framework_dir SRC DEST LABEL
copy_framework_dir() {
    local src="$1" dest="$2" label="$3"
    if [ ! -d "$src" ]; then
        echo "Warning: Source directory not found: $src"
        return 1
    fi

    local had_changes=false
    local was_new=false

    if [ ! -d "$dest" ]; then
        was_new=true
    fi

    # Walk source and copy each file (exclude roles/ — stale artifact)
    while IFS= read -r -d '' file; do
        local rel="${file#$src/}"
        local dest_file="$dest/$rel"
        mkdir -p "$(dirname "$dest_file")"
        if [ -f "$dest_file" ]; then
            if ! cmp -s "$file" "$dest_file"; then
                cp "$file" "$dest_file"
                had_changes=true
            fi
        else
            cp "$file" "$dest_file"
            had_changes=true
        fi
    done < <(find "$src" -path "*/roles" -prune -o -type f -print0)

    if $was_new; then
        CREATED+=("$label")
    elif $had_changes; then
        UPDATED+=("$label")
    else
        UNCHANGED+=("$label")
    fi
}

echo "Installing Orca framework to $TARGET_DIR..."
echo ""

# --- 1. Framework core: framework/ -> .orca/ ---

copy_framework_dir "$ORCA_DIR/framework" "$TARGET_DIR/.orca" ".orca/ (framework core)"

# --- 2. Skills ---

copy_framework_file \
    "$ORCA_DIR/.claude/skills/orca/SKILL.md" \
    "$TARGET_DIR/.claude/skills/orca/SKILL.md" \
    ".claude/skills/orca/ (PRD execution)"

copy_framework_file \
    "$ORCA_DIR/.claude/skills/discover/SKILL.md" \
    "$TARGET_DIR/.claude/skills/discover/SKILL.md" \
    ".claude/skills/discover/ (project discovery)"

copy_framework_file \
    "$ORCA_DIR/.claude/skills/refine/SKILL.md" \
    "$TARGET_DIR/.claude/skills/refine/SKILL.md" \
    ".claude/skills/refine/ (PRD refinement)"

# --- 3. orca-context/ scaffold ---

if [ ! -d "$TARGET_DIR/orca-context" ]; then
    for subdir in overrides knowledge prds designs tasks; do
        mkdir -p "$TARGET_DIR/orca-context/$subdir"
        touch "$TARGET_DIR/orca-context/$subdir/.gitkeep"
    done
    CREATED+=("orca-context/ (project context)")
else
    UNCHANGED+=("orca-context/")
fi

# --- 4. AGENTS.md, and CLAUDE.md importing it (user files -- create only) ---
# AGENTS.md is read by Codex and other agents; Claude reads CLAUDE.md, which imports it.
# A project with its own CLAUDE.md and no AGENTS.md keeps it as it is.

if [ -f "$TARGET_DIR/CLAUDE.md" ] && [ ! -f "$TARGET_DIR/AGENTS.md" ]; then
    UNCHANGED+=("CLAUDE.md (to share it with other agents: move it to AGENTS.md, and make CLAUDE.md the line @AGENTS.md)")
else
    copy_user_file \
        "$ORCA_DIR/templates/AGENTS.md.template" \
        "$TARGET_DIR/AGENTS.md" \
        "AGENTS.md (run /discover to populate)"
    copy_user_file \
        "$ORCA_DIR/templates/CLAUDE.md.template" \
        "$TARGET_DIR/CLAUDE.md" \
        "CLAUDE.md (imports AGENTS.md)"
fi

# --- 5. .claudeignore (framework-managed) ---

copy_framework_file \
    "$ORCA_DIR/templates/.claudeignore" \
    "$TARGET_DIR/.claudeignore" \
    ".claudeignore"

# --- 6. Git hooks ---

mkdir -p "$TARGET_DIR/.git-hooks"
copy_framework_file \
    "$ORCA_DIR/templates/.git-hooks/pre-push" \
    "$TARGET_DIR/.git-hooks/pre-push" \
    ".git-hooks/pre-push"
chmod +x "$TARGET_DIR/.git-hooks/pre-push"

CURRENT_HOOKS_PATH=$(cd "$TARGET_DIR" && git config --get core.hooksPath 2>/dev/null || echo "")
if [ "$CURRENT_HOOKS_PATH" != ".git-hooks" ]; then
    (cd "$TARGET_DIR" && git config core.hooksPath .git-hooks)
fi

# --- 7. .gitignore additions ---

GITIGNORE_ENTRIES=(
    ".orca-tasks/*/debug-*"
    ".orca-tasks/*/scratch-*"
    "orca-logs/"
)

if [ ! -f "$TARGET_DIR/.gitignore" ]; then
    {
        echo "# Orca framework"
        for entry in "${GITIGNORE_ENTRIES[@]}"; do
            echo "$entry"
        done
    } > "$TARGET_DIR/.gitignore"
    CREATED+=(".gitignore")
else
    missing_entries=()
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
        if ! grep -qF "$entry" "$TARGET_DIR/.gitignore"; then
            missing_entries+=("$entry")
        fi
    done
    if [ ${#missing_entries[@]} -gt 0 ]; then
        {
            echo ""
            echo "# Orca framework"
            for entry in "${missing_entries[@]}"; do
                echo "$entry"
            done
        } >> "$TARGET_DIR/.gitignore"
        UPDATED+=(".gitignore (added orca entries)")
    else
        UNCHANGED+=(".gitignore")
    fi
fi

# --- 8. Bash-loop files (opt-in) ---

if $BASH_LOOP; then
    copy_framework_file \
        "$ORCA_DIR/ORCA_PROMPT.md" \
        "$TARGET_DIR/ORCA_PROMPT.md" \
        "ORCA_PROMPT.md (bash-loop mode)"

    copy_framework_file \
        "$ORCA_DIR/orca-loop.sh" \
        "$TARGET_DIR/orca-loop.sh" \
        "orca-loop.sh (bash-loop mode)"

    copy_framework_file \
        "$ORCA_DIR/orca-once.sh" \
        "$TARGET_DIR/orca-once.sh" \
        "orca-once.sh (bash-loop mode)"

    chmod +x "$TARGET_DIR/orca-loop.sh" "$TARGET_DIR/orca-once.sh"
fi

# --- Summary ---

if [ ${#CREATED[@]} -gt 0 ]; then
    echo "Created:"
    for item in "${CREATED[@]}"; do
        echo "  + $item"
    done
    echo ""
fi

if [ ${#UPDATED[@]} -gt 0 ]; then
    echo "Updated:"
    for item in "${UPDATED[@]}"; do
        echo "  ~ $item"
    done
    echo ""
fi

if [ ${#UNCHANGED[@]} -gt 0 ]; then
    echo "Unchanged:"
    for item in "${UNCHANGED[@]}"; do
        echo "  = $item"
    done
    echo ""
fi

echo "Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Run 'claude' and then '/discover' to set up project context"
echo "  3. Commit: git add -A && git commit -m 'Install Orca framework'"
echo ""
