#!/bin/bash
# End-to-end tests of the compiled orca against real Docker: what the other tests can't fake.
# Runs in CI (Linux; it needs Docker, which project containers don't have):
#   cli/test/e2e/e2e.sh <path-to-orca> [section...]    (all sections when none are named)
# Needs the orca image tagged orca:latest. Each section starts from nothing (its own ORCA_DIR and
# project folders) and removes every container, network and proxy it made, so any section can
# run alone. Interactive shells get a pseudo-terminal from `script` and exit at once.
set -euo pipefail
ORCA="$(realpath "$1")"
shift
SECTIONS=("${@:-projects terminals update forwards dashboard}")
read -ra SECTIONS <<<"${SECTIONS[*]}"

fail() { echo "✗ $*" >&2; exit 1; }
step() { echo "-- $*"; }
# Runs orca in a pseudo-terminal, typing `exit` into whatever shell it opens
in_tty() { echo exit | script -qec "$ORCA $*" /dev/null; }
mount_of() { docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$2\"}}{{.Source}}{{end}}{{end}}" "$1"; }
running() { docker inspect -f '{{.State.Running}}' "$1"; }
# Waits up to 25 seconds for a container to stop by itself; if it doesn't, shows why
stops() {
  for _ in $(seq 50); do [ "$(running "$1")" = false ] && return 0; sleep 0.5; done
  docker exec "$1" sh -c 'ls -la /run/orca; tmux ls; ps -ef' || true
  docker logs "$1" 2>&1 | tail -20
  return 1
}

# Everything orca made: project containers, their networks, the forwards proxy
clean() {
  docker ps -aq --filter label=orca.project | xargs -r docker rm -f >/dev/null
  docker ps -aq --filter label=orca.proxy | xargs -r docker rm -f >/dev/null
  docker network ls -q --filter label=orca.network | xargs -r docker network rm >/dev/null
  docker volume rm -f orca-proxy-data >/dev/null
}

# A fresh ORCA_DIR and folder for a section, and a project folder `demo` in it
fresh() {
  clean
  T=$(mktemp -d)
  export ORCA_DIR="$T/orca"
  mkdir -p "$T/dev/demo"
  cd "$T"
}

projects() {
  step "list with no projects says how to make one"
  "$ORCA" list | tee out.txt
  grep -q "orca new" out.txt || fail "empty list should say how to make a project"

  step "start creates the container: the folder, its home, its label, its workspace file"
  git init -q dev/demo/api
  in_tty start "$T/dev/demo"
  [ "$(mount_of orca-demo /workspace)" = "$T/dev/demo" ] || fail "workspace mount"
  [ "$(mount_of orca-demo /home/node)" = "$ORCA_DIR/projects/demo/home" ] || fail "home mount"
  [ "$(docker inspect -f '{{index .Config.Labels "orca.project"}}' orca-demo)" = demo ] || fail "label"
  [ "$(mount_of orca-demo /workspace/node_modules)" = "" ] || fail "node_modules is part of the project folder"
  grep -q '"path": "api"' dev/demo/demo.code-workspace || fail "the workspace file should have the api repo"

  step "list --json agrees with Docker (what the unit tests' fake Docker assumes)"
  "$ORCA" list --json > list.json
  [ "$(jq -r '.[] | select(.name == "demo") | .state' list.json)" = "$([ "$(running orca-demo)" = true ] && echo running || echo stopped)" ] || fail "list's state should be Docker's"
  [ "$(jq -r '.[] | select(.name == "demo") | .container' list.json)" = orca-demo ] || fail "list's container"

  step "new makes a project with its code in its record"
  in_tty new web
  [ "$(mount_of orca-web /workspace)" = "$ORCA_DIR/projects/web/workspace" ] || fail "new workspace mount"

  step "delete removes the container and its network, keeps the home"
  docker stop orca-demo orca-web >/dev/null
  "$ORCA" delete demo --yes
  docker inspect orca-demo >/dev/null 2>&1 && fail "container should be gone"
  docker network inspect orca-net-demo >/dev/null 2>&1 && fail "the project's network should be gone"
  [ -d "$ORCA_DIR/projects/demo/home" ] || fail "home should stay"

  step "delete --home removes the home, never the code"
  "$ORCA" delete web --home --yes
  [ -d "$ORCA_DIR/projects/web/workspace" ] || fail "code should stay"
  [ ! -d "$ORCA_DIR/projects/web/home" ] || fail "home should be gone"
}

terminals() {
  step "exiting the last terminal stops the container, and says so"
  in_tty start "$T/dev/demo" | tee out.txt
  grep -q "That was demo's last terminal, so it's stopping" out.txt || fail "exiting the last terminal should say it stops"
  [ "$(running orca-demo)" = false ] || fail "the container should stop with its last terminal"

  step "a terminal that ends with no window on it stops the container by itself"
  docker start orca-demo >/dev/null
  docker exec orca-demo tmux new-session -d -s 1 sleep 3
  stops orca-demo || fail "the container should stop about ten seconds after its last terminal ends"

  step "up keeps it running without terminals"
  "$ORCA" up "$T/dev/demo" | tee out.txt
  grep -q "demo is up" out.txt || fail "up should say it's up"
  sleep 20   # past the wait for a first terminal
  if [ "$(running orca-demo)" != true ]; then
    docker inspect -f '{{json .State}}' orca-demo; docker logs orca-demo 2>&1 | tail -20
    fail "a container started with up should keep running without terminals"
  fi

  step "box settings change the running container at once, without restarting it"
  started=$(docker inspect -f '{{.State.StartedAt}}' orca-demo)
  "$ORCA" settings demo --memory 3g --cpus 2 | tee out.txt
  grep -q "demo now has 3 GB of memory, 2 CPUs" out.txt || fail "settings should say what changed"
  [ "$(docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}' orca-demo)" = "3221225472 2000000000" ] || fail "the container should have the new memory and CPUs"
  [ "$(docker inspect -f '{{.State.StartedAt}}' orca-demo)" = "$started" ] || fail "changing box settings shouldn't restart the container"
  "$ORCA" settings demo | tee out.txt
  grep -q "Using .* of memory now" out.txt || fail "settings should show what it uses"

  step "start opens a terminal in it, and leaving that keeps it running"
  in_tty start "$T/dev/demo" | tee out.txt
  grep -q "Opening demo terminal 1" out.txt || fail "should open a terminal"
  grep -q "stopping" out.txt && fail "a kept-up container shouldn't stop when its terminals end"
  sleep 4
  [ "$(running orca-demo)" = true ] || fail "a kept-up container should keep running after its terminals end"

  step "a terminal keeps running without a window, and list shows it"
  docker exec orca-demo tmux new-session -d -s 1 sleep 600
  "$ORCA" list | tee out.txt
  grep -Eq "demo +● running, kept up, 1 terminal" out.txt || fail "list should show demo kept up, with its terminal"
  [ "$("$ORCA" list --json | jq '.[] | select(.name == "demo") | .terminals | length')" = "$(docker exec orca-demo tmux list-sessions | wc -l)" ] || fail "list --json's terminals should be tmux's"

  step "stop says which terminals it ends, then stops"
  "$ORCA" stop demo --yes | tee out.txt
  grep -q "1  sleep" out.txt || fail "stop should list the terminal"
  [ "$(running orca-demo)" = false ] || fail "demo should be stopped"

  step "stopping ends being kept up: the next start stops with its terminal"
  in_tty start "$T/dev/demo"
  stops orca-demo || fail "after a stop, the container should no longer be kept up"
}

update() {
  step "an out-of-date container says so"
  "$ORCA" up "$T/dev/demo"
  real=$(docker image inspect -f '{{.Id}}' orca:latest)
  docker build -q -t orca:latest - <<<"FROM orca:latest
LABEL orca.e2e=newer" >/dev/null
  in_tty start "$T/dev/demo" | tee out.txt
  docker tag "$real" orca:latest
  grep -q "Image update available" out.txt || fail "should notice the newer image"
}

forwards() {
  "$ORCA" up "$T/dev/demo"
  in_tty new web
  stops orca-web || fail "web should stop with its terminal"
  "$ORCA" up "$ORCA_DIR/projects/web/workspace"

  step "a forward reaches a server in the project's container"
  docker exec -d orca-demo python3 -m http.server 3000
  "$ORCA" forward 3000 --project demo | tee out.txt
  grep -q "http://3000.demo.localhost:7320" out.txt || fail "forward should print its address"
  for _ in $(seq 20); do curl -fs -o /dev/null http://3000.demo.localhost:7320/ && break; sleep 0.5; done
  curl -fsS http://3000.demo.localhost:7320/ | grep -q "Directory listing" || fail "the forward should reach the server"
  curl -s http://9999.demo.localhost:7320/ | grep -q "No forward" || fail "an unknown address should say so"

  step "another project's container can't use the forward, or reach the project directly"
  code=$(docker exec orca-web curl -s -o /dev/null -w '%{http_code}' -H 'Host: 3000.demo.localhost' http://orca-proxy/)
  [ "$code" = 403 ] || fail "a request from another project through the proxy should be refused (got $code)"
  docker exec orca-web curl -s -m 3 -o /dev/null http://orca-demo:3000/ && fail "projects should not reach each other's containers"

  step "a URL is served too, over HTTPS from orca's certificate authority, with paths passed through"
  "$ORCA" forward 3000 --url https://dev.orca-e2e.test:8443/auth/callback --project demo | tee out.txt
  grep -q "https://dev.orca-e2e.test:8443 → demo:3000" out.txt || fail "forward should print the URL"
  grep -q "doesn't point at this Mac" out.txt || fail "forward should say the hostname needs pointing here"
  CA="$ORCA_DIR/proxy/orca-ca.crt"
  [ -r "$CA" ] || fail "the certificate authority's certificate should be copied out, readable"
  https=(curl -fsS --resolve dev.orca-e2e.test:8443:127.0.0.1 --cacert "$CA")
  for _ in $(seq 20); do "${https[@]}" -o /dev/null https://dev.orca-e2e.test:8443/ 2>/dev/null && break; sleep 0.5; done
  "${https[@]}" https://dev.orca-e2e.test:8443/ | grep -q "Directory listing" || fail "the URL should reach the server over trusted HTTPS"
  code=$(curl -s -o /dev/null -w '%{http_code}' --resolve dev.orca-e2e.test:8443:127.0.0.1 --cacert "$CA" https://dev.orca-e2e.test:8443/no/such/path)
  [ "$code" = 404 ] || fail "a path should reach the server as it is (got $code)"
  code=$(docker exec orca-web curl -sk -o /dev/null -w '%{http_code}' --connect-to dev.orca-e2e.test:8443:orca-proxy:8443 https://dev.orca-e2e.test:8443/)
  [ "$code" = 403 ] || fail "a request from another project to the URL should be refused (got $code)"

  step "removing the URL keeps the forward, and frees its port"
  "$ORCA" forward --remove https://dev.orca-e2e.test:8443 --project demo
  for _ in $(seq 20); do curl -fs -o /dev/null http://3000.demo.localhost:7320/ && break; sleep 0.5; done
  curl -fsS http://3000.demo.localhost:7320/ | grep -q "Directory listing" || fail "the usual address should still work"
  [ -z "$(docker inspect -f '{{index .Config.Labels "orca.ports"}}' orca-proxy)" ] || fail "the proxy should no longer publish 8443"

  step "list shows the forward"
  "$ORCA" list | tee out.txt
  grep -q "http://3000.demo.localhost:7320 → demo:3000" out.txt || fail "list should show the forward"

  step "removing the last forward stops the proxy"
  "$ORCA" forward --remove 3000 --project demo
  docker inspect orca-proxy >/dev/null 2>&1 && fail "the proxy should be gone"
  true
}

dashboard() {
  "$ORCA" up "$T/dev/demo"
  echo '{"terminal": ["true", "{command}"]}' > "$ORCA_DIR/config.json"
  "$ORCA" serve --no-open > serve.log 2>&1 &
  serve_pid=$!
  for _ in $(seq 40); do grep -q token= serve.log && break; sleep 0.25; done
  token=$(cat "$ORCA_DIR/serve-token")
  U=http://127.0.0.1:7321
  code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

  step "the API answers the token's holder and refuses everyone else"
  [ "$(stat -c %a "$ORCA_DIR/serve-token")" = 600 ] || fail "the token file should be private"
  [ "$(code $U/api/projects)" = 401 ] || fail "no token should be refused"
  [ "$(code -b orca_token=$token -H 'Host: host.docker.internal:7321' $U/api/projects)" = 421 ] || fail "another Host should be refused"
  [ "$(code -b orca_token=$token -H 'content-type: application/json' -H 'x-orca: 1' -H 'Origin: https://evil.example' -X POST -d '{}' $U/api/projects/demo/open)" = 403 ] || fail "another Origin should be refused"
  curl -fs -b orca_token=$token $U/api/projects | grep -q '"name":"demo"' || fail "the API should list demo"
  # From a container: on Linux the Mac-only loopback isn't reachable at all; on a Mac it is, and
  # the token check refuses it (the 401 above). Either way, never a 200.
  from_container=$(docker run --rm --add-host=host.docker.internal:host-gateway orca:latest \
    curl -s -o /dev/null -w '%{http_code}' -m 3 http://host.docker.internal:7321/api/projects || true)
  echo "   a container calling the dashboard got: $from_container"
  [ "$from_container" != 200 ] || fail "a container should not get the API"

  step "stopping from the dashboard stops the real container"
  docker exec orca-demo tmux new-session -d -s 1 sleep 600
  curl -fs -b orca_token=$token -H 'content-type: application/json' -H 'x-orca: 1' -H "Origin: $U" -X POST -d '{}' $U/api/projects/demo/stop | grep -q "Stopped demo." || fail "stop should say it stopped"
  [ "$(running orca-demo)" = false ] || fail "demo should be stopped"
  kill $serve_pid
}

for s in "${SECTIONS[@]}"; do
  declare -F "$s" >/dev/null || fail "no section \"$s\"; sections: projects terminals update forwards dashboard"
  echo; echo "== $s"
  fresh
  "$s"
done
clean
echo; echo "✓ end-to-end checks passed: ${SECTIONS[*]}"
