#!/bin/sh
# The container's main process. It keeps the container running while any terminal (tmux)
# or other shell (docker exec, such as an editor attached to the container) is open, and
# exits once none has been for a minute, which stops the container. The minute also covers
# the moment between the container starting and its first terminal opening.
trap 'exit 0' TERM INT
grace=${ORCA_IDLE_SECONDS:-60}
idle=0
while :; do
  # Processes docker exec starts have no parent in the container (ppid 0)
  if tmux has-session 2>/dev/null || ps -e -o ppid= -o pid= | awk '$1 == 0 && $2 != 1 { found = 1 } END { exit !found }'; then
    idle=0
  else
    idle=$((idle + 5))
  fi
  [ "$idle" -ge "$grace" ] && exit 0
  sleep 5 &
  wait $!
done
