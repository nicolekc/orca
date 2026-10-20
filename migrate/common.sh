# Shared by the orca-migrate.sh helpers, which run inside throwaway orca-claude containers.

# The old container's state, as paths in its filesystem export (with and without ./,
# whichever the export uses).
STATE_PATHS=(home/node/.claude home/node/.claude.json home/node/.config/gh)

# extract_state <dir>: extract the state paths from a container export on stdin into <dir>
extract_state() {
    local members=() p err
    for p in "${STATE_PATHS[@]}"; do members+=("$p" "./$p"); done
    # Paths missing from the export are expected (both spellings are tried); anything else is not
    err=$(tar -x -C "$1" "${members[@]}" 2>&1 >/dev/null \
        | grep -v -e 'Not found in archive' -e 'Exiting with failure status due to previous errors' || true)
    [ -z "$err" ] || { echo "tar failed: $err" >&2; exit 1; }
    [ -d "$1/home/node/.claude" ] || { echo "No /home/node/.claude in the old container — nothing to migrate" >&2; exit 1; }
}

# map_state <old-home> <state-dir>: lay out an old home's state as the new image expects
# (CLAUDE_CONFIG_DIR=<state>/claude, which also holds .claude.json; GH_CONFIG_DIR=<state>/gh)
map_state() {
    mkdir -p "$2/claude" "$2/gh"
    cp -a "$1/.claude/." "$2/claude/"
    if [ -f "$1/.claude.json" ]; then cp -a "$1/.claude.json" "$2/claude/"; fi
    if [ -d "$1/.config/gh" ]; then cp -a "$1/.config/gh/." "$2/gh/"; fi
}

# manifest <dir>: every file's hash and every symlink's target, sorted, paths relative to <dir>
manifest() {
    (cd "$1" && {
        find . -type f -print0 | xargs -0 -r sha256sum
        find . -type l -printf '%p -> %l\n'
    } | LC_ALL=C sort)
}

# compare <expected-dir> <actual-dir> <label>: fail loudly unless the two match exactly
compare() {
    local expected actual
    expected=$(manifest "$1"); actual=$(manifest "$2")
    if [ "$expected" != "$actual" ]; then
        echo "❌ $3: copy does NOT match the original (< original, > copy):" >&2
        diff <(echo "$expected") <(echo "$actual") | grep '^[<>]' | head -50 >&2
        exit 1
    fi
    echo "   ✓ $3: $(echo "$expected" | grep -c .) entries, all match"
}
