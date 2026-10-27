#!/bin/sh
# The container's main process: the container runs while it does. Started with `orca up`
# (which leaves /run/orca/up, emptied on every start), it runs until stopped. Otherwise it
# runs while any terminal (tmux session) is open, and stops a few seconds after the last one
# ends; until the first opens, it waits up to ORCA_FIRST_TERMINAL_SECONDS.
trap 'exit 0' TERM INT
first=${ORCA_FIRST_TERMINAL_SECONDS:-15}
waited=0
seen=false
while :; do
  if [ -e /run/orca/up ]; then
    :
  elif tmux has-session 2>/dev/null; then
    seen=true
  elif $seen || [ "$waited" -ge "$first" ]; then
    exit 0
  fi
  sleep 2 &
  wait $!
  waited=$((waited + 2))
done
