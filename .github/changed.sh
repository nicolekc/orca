#!/bin/bash
# Whether this push or pull request changed any of the given paths, written to $GITHUB_OUTPUT
# as changed=true|false, so workflows can skip work nothing affected. Scheduled and manual
# runs, and anything it can't compare, count as changed.
#   .github/changed.sh <path>...   (needs a checkout with full history)
# BASE, if set, is what to compare with instead (any commit or ref).
set -euo pipefail

case "${BASE:+set}:$GITHUB_EVENT_NAME" in
    set:*) base=$BASE ;;
    :pull_request) base=$(jq -r .pull_request.base.sha "$GITHUB_EVENT_PATH") ;;
    :push) base=$(jq -r .before "$GITHUB_EVENT_PATH") ;;
    *) base="" ;;
esac

changed=true
if [ -n "$base" ] && git cat-file -e "$base^{commit}" 2>/dev/null && git diff --quiet "$base" HEAD -- "$@"; then
    changed=false
fi
echo "changed=$changed" | tee -a "$GITHUB_OUTPUT"
