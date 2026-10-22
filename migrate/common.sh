# Shared by the orca-migrate.sh helpers, which run inside throwaway orca containers.

# Left out of the copied home: the old Claude program (the image now provides it, and a
# stale copy in ~ would shadow it), caches, which rebuild themselves, and uv's Pythons, which
# uv downloads again when a project needs one (they also hold files whose names differ only
# in case, which the Mac's disk can't store).
SKIP=(home/node/.local/share/claude home/node/.local/bin/claude home/node/.local/state/claude
      home/node/.npm home/node/.cache home/node/.pnpm-store home/node/.local/share/uv/python)

# extract_home <dir>: extract the old home from a container export on stdin into <dir>/home/node
extract_home() {
    local p err
    # Extract everything, then delete SKIP: excluding it from tar breaks hard links whose
    # first copy in the archive is inside a skipped folder (pnpm links ~/.cache and its store).
    # The export spells paths with or without ./; one spelling is always missing, which is fine
    err=$(tar -x -C "$1" home/node ./home/node 2>&1 >/dev/null \
        | grep -v -e 'Not found in archive' -e 'Exiting with failure status due to previous errors' || true)
    [ -z "$err" ] || { echo "tar failed: $err" >&2; exit 1; }
    for p in "${SKIP[@]}"; do rm -rf "${1:?}/$p"; done
    # Commands in ~/.local/bin that pointed into a skipped folder would shadow the image's
    # own (a stale python3 link, say)
    local link
    for link in "$1"/home/node/.local/bin/*; do
        [ -L "$link" ] || continue
        for p in "${SKIP[@]}"; do
            case "$(readlink "$link")" in "/$p"/*) rm -f "$link" ;; esac
        done
    done
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

# case_collisions <dir>: paths under <dir> whose names differ only in letter case, which a
# Mac disk (case-insensitive) can't hold side by side
case_collisions() {
    (cd "$1" && find . | awk '{ k = tolower($0); if (k in seen) { print seen[k]; print $0 } else seen[k] = $0 }' | LC_ALL=C sort -u)
}
