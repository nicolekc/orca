#!/bin/bash
# End-to-end test of the compiled orca against real Docker (run in CI, on Linux):
#   cli/test/e2e.sh <path-to-orca>
# Needs the orca image tagged orca:latest. Interactive shells get a pseudo-terminal from
# `script` and exit at once. Uses a throwaway ORCA_DIR and project folders.
set -euo pipefail
ORCA="$(realpath "$1")"
T=$(mktemp -d)
export ORCA_DIR="$T/orca"
mkdir -p "$T/dev/demo"
cd "$T"

step() { echo; echo "== $*"; }
fail() { echo "✗ $*" >&2; exit 1; }
# Runs orca in a pseudo-terminal, typing `exit` into whatever shell it opens
in_tty() { echo exit | script -qec "$ORCA $*" /dev/null; }
mount_of() { docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$2\"}}{{.Source}}{{end}}{{end}}" "$1"; }

step "list with no projects"
"$ORCA" list | tee out.txt
grep -q "orca new" out.txt || fail "empty list should say how to make a project"

step "start creates the project's container"
in_tty start "$T/dev/demo"
[ "$(mount_of orca-demo /workspace)" = "$T/dev/demo" ] || fail "workspace mount"
[ "$(mount_of orca-demo /home/node)" = "$ORCA_DIR/projects/demo/home" ] || fail "home mount"
[ "$(docker inspect -f '{{index .Config.Labels "orca.project"}}' orca-demo)" = demo ] || fail "label"
docker volume inspect orca-demo_node_modules >/dev/null || fail "node_modules volume"

step "start again resumes it"
in_tty start "$T/dev/demo" | tee out.txt
grep -q "Resuming demo" out.txt || fail "should resume"

step "list shows it"
"$ORCA" list | tee out.txt
grep -Eq "demo +○ stopped" out.txt || fail "list should show demo stopped"
"$ORCA" list --json | grep -q '"name": "demo"' || fail "list --json"

step "an out-of-date container says so"
real=$(docker image inspect -f '{{.Id}}' orca:latest)
docker build -q -t orca:latest - <<<"FROM orca:latest
LABEL orca.e2e=newer" >/dev/null
in_tty start "$T/dev/demo" | tee out.txt
grep -q "Image update available" out.txt || fail "should notice the newer image"
docker tag "$real" orca:latest

step "new makes a project with its code in its record"
in_tty new web
[ "$(mount_of orca-web /workspace)" = "$ORCA_DIR/projects/web/workspace" ] || fail "new workspace mount"

step "delete removes container and volume, keeps the home"
"$ORCA" delete demo --yes
docker inspect orca-demo >/dev/null 2>&1 && fail "container should be gone"
docker volume inspect orca-demo_node_modules >/dev/null 2>&1 && fail "volume should be gone"
[ -d "$ORCA_DIR/projects/demo/home" ] || fail "home should stay"

step "delete --home removes the home, never the code"
"$ORCA" delete web --home --yes
[ -d "$ORCA_DIR/projects/web/workspace" ] || fail "code should stay"
[ -d "$ORCA_DIR/projects/web/home" ] && fail "home should be gone"

echo; echo "✓ end-to-end checks passed"
