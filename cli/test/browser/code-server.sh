#!/bin/sh
# Installs the pinned code-server (VS Code in a browser) for the editor test, if it isn't yet,
# and prints its path. Pinned to a release more than a week old.
set -eu
VERSION=4.141.0
DIR="${XDG_CACHE_HOME:-$HOME/.cache}/orca-test/code-server-$VERSION"
if [ ! -x "$DIR/bin/code-server" ]; then
  curl -fsSL https://code-server.dev/install.sh | sh -s -- --method standalone --version "$VERSION" --prefix "$DIR" >&2
fi
echo "$DIR/bin/code-server"
