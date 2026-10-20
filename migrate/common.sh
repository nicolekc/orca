# Shared by the orca-migrate.sh helpers, which run inside throwaway orca containers.

# Left out of the copied home: the old Claude program (the image now provides it, and a
# stale copy in ~ would shadow it) and caches, which rebuild themselves.
SKIP=(home/node/.local/share/claude home/node/.local/bin/claude home/node/.local/state/claude
      home/node/.npm home/node/.cache)

# extract_home <dir>: extract the old home from a container export on stdin into <dir>/home/node
extract_home() {
    local args=() p err
    for p in "${SKIP[@]}"; do args+=(--exclude="$p"); done
    # The export spells paths with or without ./; one spelling is always missing, which is fine
    err=$(tar -x -C "$1" "${args[@]}" home/node ./home/node 2>&1 >/dev/null \
        | grep -v -e 'Not found in archive' -e 'Exiting with failure status due to previous errors' || true)
    [ -z "$err" ] || { echo "tar failed: $err" >&2; exit 1; }
    [ -d "$1/home/node/.claude" ] || { echo "No ~/.claude in the old container — nothing to migrate" >&2; exit 1; }
}

# manifest <dir>: every file's hash and every symlink's target, sorted, paths relative to <dir>
manifest() {
    (cd "$1" && {
        find . -type f -print0 | xargs -0 -r sha256sum
        find . -type l -printf '%p -> %l\n'
    } | LC_ALL=C sort)
}

# compare <expected-dir> <actual-dir>: fail loudly unless the two match exactly
compare() {
    local expected actual
    expected=$(manifest "$1"); actual=$(manifest "$2")
    if [ "$expected" != "$actual" ]; then
        echo "❌ Copy does NOT match the original (< original, > copy):" >&2
        diff <(echo "$expected") <(echo "$actual") | grep '^[<>]' | head -50 >&2
        exit 1
    fi
    echo "   ✓ $(echo "$expected" | grep -c .) files, all match"
}
