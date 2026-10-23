# The orca image: what every project's container starts with.
#
# What goes here: tools that need root or system packages, and tools every project uses.
# What doesn't: anything a project can install itself into ~, which `orca start` mounts
# from ~/.orca/projects/<project>/home on the Mac. Downloads there (browsers, Python
# versions, package caches) are kept per project, across container rebuilds.
#
# Tools install outside ~ (/usr, /opt), because the mounted home hides /home/node.
#
# Order matters: each step is a layer, and an update downloads only the layers that changed
# and everything after them. Large, rarely changing steps come first; small or frequently
# changed ones last. .github/workflows/image.yml reuses unchanged layers on each build and
# rebuilds everything monthly, which picks up new versions of the unpinned tools.
#
# Settings: PYTHON_VERSION (Python section).

# Node: the current long-term-support release
FROM node:24-trixie-slim

# ── System packages ─────────────────────────────────────────────────────────────────────
#   git, openssh-client  version control, ssh for git remotes
#   gh                   GitHub CLI: auth, PRs (from GitHub's apt repo, added below)
#   sudo                 agents sometimes need root (the node user gets it passwordless)
#   ripgrep, fd-find     fast search, used by Claude
#   jq, tree             JSON in scripts, directory views
#   curl                 downloads (also used by the installers below)
#   build-essential      C compiler and make: native npm and pip packages compile on install
#   ffmpeg               video and audio: trimming, converting and joining recordings (e.g.
#                        PR evidence); Playwright's own ffmpeg only records WebM
#   unzip, zip           archives
#   procps, less         ps/top, a pager
#   tmux                 orca's terminals: each one keeps running when its window closes
RUN apt-get update && apt-get install -y curl ca-certificates \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y \
       git openssh-client gh sudo ripgrep fd-find jq tree \
       build-essential ffmpeg unzip zip procps less tmux \
    && rm -rf /var/lib/apt/lists/*

# ── Browser libraries ───────────────────────────────────────────────────────────────────
# System libraries Chromium needs, for Playwright and similar tools. They need root, so
# they belong here. The browser itself doesn't: each Playwright version wants its own
# build, and projects download it into ~/.cache/ms-playwright, kept across rebuilds.
# npm's "before" cutoff: the newest Playwright published at least a week before the build.
RUN npm_config_before="$(date -d '7 days ago' +%F)" npx -y playwright install-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# ── Node package managers ───────────────────────────────────────────────────────────────
# Corepack provides pnpm and yarn at the version each project's package.json asks for,
# downloading it without asking (an agent can't answer the prompt). The current pnpm (about
# 50 MB) and yarn come with the image, so a new project doesn't wait for them; other versions
# are downloaded when a project asks, into the same folder, and again after a recreate.
ENV COREPACK_HOME=/opt/corepack COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable \
    && corepack install --global pnpm@latest yarn@stable \
    # pnpm fetches its native binary on first run, giving up after 30 s; try a few times
    && for try in 1 2 3; do pnpm --version && break; [ "$try" = 3 ] && exit 1; done \
    && yarn --version \
    && chown -R node:node /opt/corepack

# ── Container user ──────────────────────────────────────────────────────────────────────
ARG USERNAME=node
RUN echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME

# ── Python ──────────────────────────────────────────────────────────────────────────────
# uv (docs.astral.sh/uv) manages Python versions, virtual environments and packages:
# projects use `uv run`, `uv add`, and a .venv each. A uv-installed Python is the default
# python3. Project .venvs point at a link uv keeps on the newest patch; if an image update
# changes the minor version, uv rebuilds the .venv on the next `uv run`.
#
# Default Python minor version (patch updates come with each rebuild). Projects can ask for
# another with .python-version or requires-python; uv downloads it next to the default, in
# the container rather than ~ (the Mac's disk ignores letter case, and Python's files don't),
# and again when needed after a recreate. The default stays root-owned, so pip can't change it.
ARG PYTHON_VERSION=3.14
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin UV_NO_MODIFY_PATH=1 sh \
    && UV_PYTHON_INSTALL_DIR=/opt/uv/python UV_PYTHON_BIN_DIR=/usr/local/bin \
       uv python install "$PYTHON_VERSION" --default \
    && mkdir -p /opt/uv/bin && chown node:node /opt/uv/python /opt/uv/bin
ENV UV_PYTHON_INSTALL_DIR=/opt/uv/python UV_PYTHON_BIN_DIR=/opt/uv/bin

# ── Agent CLIs ──────────────────────────────────────────────────────────────────────────
# Claude Code: Anthropic's native installer (code.claude.com/docs/en/setup), which keeps
# Claude updated. It installs into $HOME, so it runs with HOME=/opt/claude. Updates land in
# the project's home (~/.local/bin, first on PATH), so a new container starts right away
# with this copy, and each project then runs its own up-to-date one.
RUN curl -fsSL https://claude.ai/install.sh | HOME=/opt/claude bash
# Codex: OpenAI's agent (developers.openai.com/codex), from npm, as with Playwright: the newest
# published at least a week before the build. It offers updates itself; they install into the
# project's home (see below), first on PATH, like Claude's.
RUN npm_config_before="$(date -d '7 days ago' +%F)" npm install -g @openai/codex && codex --version

# ── Installs inside containers ──────────────────────────────────────────────────────────
# Every package manager installs tools into the project's home, with its commands on PATH:
# no sudo, and kept when the container is recreated. (Set after the image's own installs.)
#   npm install -g       ~/.local          (NPM_CONFIG_PREFIX; npm's default is /usr/local)
#   yarn global add      ~/.local          (follows npm's prefix)
#   pnpm add -g          ~/.local/share/pnpm  (PNPM_HOME; pnpm refuses without it)
#   uv tool install      ~/.local          (uv's default)
#   pip install          ~/.local          (PIP_BREAK_SYSTEM_PACKAGES lets pip fall back to
#                                          the home; the image's Python is root-owned, so
#                                          it can't be changed. Inside a .venv, as usual.)
#   claude updates       ~/.local          (Claude's default; see Agent CLIs)
#   codex updates        ~/.local          (it updates with npm install -g)
#   gh extension install ~/.local/share/gh (gh's default)
# Caches (npm, uv, Playwright browsers) are in ~/.cache by default; corepack's are in the image.
# Only system packages (sudo apt install) stay in the container; add lasting ones above.
ENV NPM_CONFIG_PREFIX=/home/node/.local \
    PNPM_HOME=/home/node/.local/share/pnpm \
    PIP_BREAK_SYSTEM_PACKAGES=1
ENV PATH="/home/node/.local/bin:$PNPM_HOME/bin:/opt/uv/bin:/opt/claude/.local/bin:$PATH"

# ── What orca adds to every container ───────────────────────────────────────────────────
# Listed, with what orca adds when it creates or starts a container, in container-features.md.
# What every session should know about the container, read by Claude in every project (and
# Codex, below)
COPY image/environment.md /etc/claude-code/CLAUDE.md
# Claude settings a project can't change: sessions in other projects can't message these ones
COPY image/managed-settings.json /etc/claude-code/managed-settings.json
# Codex's defaults (its system config), with the same note as its developer instructions
COPY image/codex.toml /etc/codex/config.toml
RUN { echo "developer_instructions = '''"; cat /etc/claude-code/CLAUDE.md; echo "'''"; } >> /etc/codex/config.toml
# Terminals: tmux's defaults for them (a project's ~/.tmux.conf can change any of it), and the
# main process, which keeps the container running while any terminal or other shell is open
COPY image/tmux.conf /etc/tmux.conf
COPY --chmod=755 image/keepalive.sh /usr/local/bin/orca-keepalive
# Tells orca this image has terminals (containers made from older images open plain shells)
LABEL orca.terminals="1"

USER $USERNAME
WORKDIR /workspace
CMD ["orca-keepalive"]
