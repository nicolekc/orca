#!/bin/sh
# The container's main process: the container runs while it does. Started with `orca up`
# (which leaves /run/orca/up, emptied on every start), it runs until stopped. Otherwise it
# runs while any terminal (tmux session) is open, and stops about ten seconds after the last
# one ends; until the first opens, it waits up to ORCA_FIRST_TERMINAL_SECONDS.
# Its ending kills every terminal, so it takes several checks in a row finding none: a single
# failed one (tmux busy, a fork refused near the memory limit) once ended three open terminals.
trap 'echo "orca-keepalive: asked to stop"; exit 0' TERM INT
first=${ORCA_FIRST_TERMINAL_SECONDS:-15}
waited=0
seen=false
misses=0
# Open while tmux answers, or while its server runs (if its socket in /tmp was removed)
terminals() { tmux has-session 2>/dev/null || pgrep -x 'tmux: server' >/dev/null; }
while :; do
  if [ -e /run/orca/up ]; then
    misses=0
  elif terminals; then
    seen=true
    misses=0
  elif $seen; then
    misses=$((misses + 1))
    if [ "$misses" -ge 5 ]; then
      echo "orca-keepalive: no terminals for 10 seconds, stopping"
      exit 0
    fi
  elif [ "$waited" -ge "$first" ]; then
    echo "orca-keepalive: no terminal opened in $first seconds, stopping"
    exit 0
  fi
  sleep 2 &
  wait $!
  waited=$((waited + 2))
done
