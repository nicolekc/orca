# Sourced on the host by orca-migrate.sh and orca-legacy.sh to find containers by folder.

# abs_path <path>: absolute path, without needing the folder to exist any more
abs_path() {
    if [ -d "$1" ]; then (cd "$1" && pwd); else
        case "$1" in /*) echo "${1%/}" ;; *) echo "$PWD/${1%/}" ;; esac
    fi
}

# containers_on <abs-path>: containers mounting <abs-path> as /workspace, as name|running|home
# (home is empty for a pre-migration container, which keeps its home inside it)
containers_on() {
    local rp="$1" c
    if [ -d "$1" ]; then rp=$(cd "$1" && pwd -P); fi
    for c in $(docker ps -a --format '{{.Names}}'); do
        docker inspect -f '{{.Name}}|{{.State.Running}}|{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}|{{range .Mounts}}{{if eq .Destination "/home/node"}}home{{end}}{{end}}' "$c"
    done | awk -F'|' -v p="$1" -v rp="$rp" '$3 == p || $3 == rp { sub(/^\//, "", $1); print $1 "|" $2 "|" $4 }'
}

# legacy_on <abs-path>: names of pre-migration containers mounting <abs-path>
legacy_on() {
    containers_on "$1" | awk -F'|' '$1 != "" && $3 == "" { print $1 }'
}

# list_legacy: every pre-migration container and what it mounts as /workspace
list_legacy() {
    local c
    for c in $(docker ps -a --format '{{.Names}}'); do
        docker inspect -f '{{range .Mounts}}{{if eq .Destination "/home/node"}}migrated{{end}}{{end}}|{{range .Mounts}}{{if eq .Destination "/workspace"}}{{.Source}}{{end}}{{end}}' "$c" \
            | awk -F'|' -v n="$c" '$1 == "" { print "     " n "  →  " $2 }'
    done
}
