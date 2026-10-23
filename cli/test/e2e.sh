#!/bin/bash
# End-to-end test of the compiled orca against real Docker (run in CI, on Linux):
#   cli/test/e2e.sh <path-to-orca>
# Needs the orca image tagged orca:latest. Interactive shells get a pseudo-terminal from
# `script` and exit at once. Uses a throwaway ORCA_DIR and project folders.
set -euo pipefail
ORCA="$(realpath "$1")"
HERE="$(dirname "$(realpath "$0")")"
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
[ "$(mount_of orca-demo /workspace/node_modules)" = "" ] || fail "node_modules is part of the project folder"

[ "$(docker inspect -f '{{.State.Running}}' orca-demo)" = true ] || fail "the container should outlive its first window"

step "start again opens a terminal in it"
in_tty start "$T/dev/demo" | tee out.txt
grep -q "Opening demo terminal 1" out.txt || fail "should open a terminal"

step "a terminal keeps running without a window, and list shows it"
docker exec orca-demo tmux new-session -d -s 1 sleep 600
"$ORCA" list | tee out.txt
grep -Eq "demo +● running, 1 terminal" out.txt || fail "list should show demo's terminal"
"$ORCA" list --json | grep -q '"name": "demo"' || fail "list --json"

step "stop says which terminals it ends, then stops"
"$ORCA" stop demo --yes | tee out.txt
grep -q "1  sleep" out.txt || fail "stop should list the terminal"
"$ORCA" list | tee out.txt
grep -Eq "demo +○ stopped" out.txt || fail "list should show demo stopped"

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

step "a forward reaches a server in the project's container"
docker start orca-demo >/dev/null
docker exec -d orca-demo python3 -m http.server 3000
"$ORCA" forward 3000 --project demo | tee out.txt
grep -q "http://3000.demo.localhost:7320" out.txt || fail "forward should print its address"
for _ in $(seq 20); do curl -fs -o /dev/null http://3000.demo.localhost:7320/ && break; sleep 0.5; done
curl -fsS http://3000.demo.localhost:7320/ | grep -q "Directory listing" || fail "the forward should reach the server"
curl -s http://9999.demo.localhost:7320/ | grep -q "No forward" || fail "an unknown address should say so"

step "another project's container can't use the forward, or reach the project directly"
docker start orca-web >/dev/null
code=$(docker exec orca-web curl -s -o /dev/null -w '%{http_code}' -H 'Host: 3000.demo.localhost' http://orca-proxy/)
[ "$code" = 403 ] || fail "a request from another project through the proxy should be refused (got $code)"
docker exec orca-web curl -s -m 3 -o /dev/null http://orca-demo:3000/ && fail "projects should not reach each other's containers"
docker stop orca-demo orca-web >/dev/null

step "list shows the forward"
"$ORCA" list | tee out.txt
grep -q "http://3000.demo.localhost:7320 → demo:3000" out.txt || fail "list should show the forward"

step "the dashboard answers its own page and refuses everyone else"
echo '{"terminal": ["true", "{command}"]}' > "$ORCA_DIR/config.json"
"$ORCA" serve --no-open > serve.log 2>&1 &
serve_pid=$!
for _ in $(seq 40); do grep -q token= serve.log && break; sleep 0.25; done
token=$(cat "$ORCA_DIR/serve-token")
U=http://127.0.0.1:7321
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
[ "$(stat -c %a "$ORCA_DIR/serve-token")" = 600 ] || fail "the token file should be private"
[ "$(code $U/api/projects)" = 401 ] || fail "no token should be refused"
[ "$(code -b orca_token=$token -H 'Host: host.docker.internal:7321' $U/api/projects)" = 421 ] || fail "another Host should be refused"
[ "$(code -b orca_token=$token -H 'content-type: application/json' -H 'x-orca: 1' -H 'Origin: https://evil.example' -X POST -d '{}' $U/api/projects/demo/open)" = 403 ] || fail "another Origin should be refused"
curl -fs -b orca_token=$token $U/api/projects | grep -q '"name":"demo"' || fail "the API should list demo"
curl -fs $U/app | grep -q '<div id="root">' || fail "the page should be served"
# From a container: on Linux the Mac-only loopback isn't reachable at all; on a Mac it is, and the
# token check refuses it (the 401 above). Either way, never a 200.
from_container=$(docker run --rm --add-host=host.docker.internal:host-gateway orca:latest \
  curl -s -o /dev/null -w '%{http_code}' -m 3 http://host.docker.internal:7321/api/projects || true)
echo "   a container calling the dashboard got: $from_container"
[ "$from_container" != 200 ] || fail "a container should not get the API"

step "the dashboard, in a browser, shows a terminal and stops its project"
docker exec orca-demo tmux new-session -d -s 1 sleep 600
bun "$HERE/dashboard.ts" "$(grep -o 'http://[^ ]*token=[^ ]*' serve.log)" demo sleep
[ "$(docker inspect -f '{{.State.Running}}' orca-demo)" = false ] || fail "the dashboard should have stopped demo"
kill $serve_pid

step "delete removes container and volume, keeps the home"
"$ORCA" delete demo --yes
docker inspect orca-demo >/dev/null 2>&1 && fail "container should be gone"
docker volume inspect orca-demo_node_modules >/dev/null 2>&1 && fail "volume should be gone"
[ -d "$ORCA_DIR/projects/demo/home" ] || fail "home should stay"
docker network inspect orca-net-demo >/dev/null 2>&1 && fail "the project's network should be gone"

step "removing the last forward stops the proxy"
"$ORCA" forward --remove 3000 --project demo
docker inspect orca-proxy >/dev/null 2>&1 && fail "the proxy should be gone"

step "delete --home removes the home, never the code"
"$ORCA" delete web --home --yes
[ -d "$ORCA_DIR/projects/web/workspace" ] || fail "code should stay"
[ -d "$ORCA_DIR/projects/web/home" ] && fail "home should be gone"

echo; echo "✓ end-to-end checks passed"
