#!/bin/bash
# Runs inside a freshly built orca image with an empty home, as a new project's container
# would start. Fails if any tool the Dockerfile promises doesn't work.
set -euxo pipefail

claude --version
grep -q 'About this environment' /etc/claude-code/CLAUDE.md
jq -e '.crossSessionInbound == "refuse"' /etc/claude-code/managed-settings.json
gh --version | head -1
# Commits are the user's: no identity comes with the image
! git config --system user.name
# Terminals: tmux with orca's settings, and the main process that waits for them
tmux -V
ORCA_PROJECT=check tmux new-session -d -s 1 && test "$(tmux show -gv @project)" = check && tmux kill-server
command -v orca-keepalive
gcc --version | head -1
ffmpeg -version | head -1
node --version
# Come with the image: no download on first use
COREPACK_ENABLE_NETWORK=0 pnpm --version
COREPACK_ENABLE_NETWORK=0 yarn --version
python3 --version
uv --version

# Each package manager's installs land in the home, without sudo, with commands on PATH
npm install -g --silent cowsay && test "$(command -v cowsay)" = "$HOME/.local/bin/cowsay"

yarn global add --silent yosay && test "$(command -v yosay)" = "$HOME/.local/bin/yosay"
pnpm add -g http-server && test "$(command -v http-server)" = "$HOME/.local/share/pnpm/bin/http-server"
# Other Python versions go in the container, where letter case is kept, not the home
test "$(uv python dir)" = /opt/uv/python && test -w /opt/uv/python
uv tool install -q pycowsay && test "$(command -v pycowsay)" = "$HOME/.local/bin/pycowsay"
python3 -m pip install -q six && python3 -c 'import six, os; assert six.__file__.startswith(os.path.expanduser("~/.local/"))'

# Python: a project with its own .venv
mkdir -p /tmp/py && cd /tmp/py
uv init -q --name py
uv add -q six
uv run python -c 'import six'

# Browser: a project's own Playwright downloads its browser, which runs on the image's libraries
mkdir -p /tmp/web && cd /tmp/web
npm init -y >/dev/null
npm install --silent playwright
npx playwright install chromium
node -e '
const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<title>ok</title>");
  if (await p.title() !== "ok") throw new Error("page did not load");
  console.log("chromium", b.version());
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });'
