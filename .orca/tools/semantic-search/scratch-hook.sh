#!/usr/bin/env bash
# PostToolUse hook: when Write/Edit touches a project's scratch/, or a Bash
# command names a path under one, sweep that scratch dir into the search index
# in the background. A project is a directory holding RESOURCE-INDEX.md, and
# can live anywhere; relative paths resolve against the hook's cwd. Always
# exits 0 and prints nothing, so it never blocks the agent or adds anything to
# its context.
input=$(cat)
cwd=$(jq -r '.cwd // empty' <<<"$input" 2>/dev/null)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input" 2>/dev/null)
if [[ -n "$file_path" ]]; then
  paths=$file_path
else
  # Split a Bash command into candidate paths on whitespace, quotes and shell operators
  paths=$(jq -r '.tool_input.command // empty' <<<"$input" 2>/dev/null | tr " \t\"'=;|&()<>" '\n')
fi
semsearch="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/semsearch"

seen=" "
while IFS= read -r path; do
  [[ "/$path/" == */scratch/* ]] || continue
  scratch_dir="/$path/"
  scratch_dir="${scratch_dir%%/scratch/*}/scratch"
  scratch_dir="${scratch_dir#/}"
  [[ "$scratch_dir" == /* ]] || scratch_dir="${cwd:-$PWD}/$scratch_dir"
  [[ -d "$scratch_dir" && -f "$(dirname "$scratch_dir")/RESOURCE-INDEX.md" ]] || continue
  [[ "$seen" == *" $scratch_dir "* ]] && continue
  seen+="$scratch_dir "
  mkdir -p "$scratch_dir/.search"
  nohup flock -w 300 "$scratch_dir/.search/.lock" \
    "$semsearch" sweep "$scratch_dir" \
    >> "$scratch_dir/.search/sweep.log" 2>&1 &
done <<<"$paths"
exit 0
