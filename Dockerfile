# The orca image: what every project's container starts with.
#
# What goes here: tools that need root or system packages, and tools every project uses.
# What doesn't: anything a project can install itself into ~, which orca-start.sh mounts
# from ~/.orca/projects/<project>/home on the Mac. Downloads there (browsers, Python
# versions, package caches) are kept per project, across container rebuilds.
#
# Tools install outside ~ (/usr, /opt), because the mounted home hides /home/node.
# Rebuilt weekly by .github/workflows/image.yml, so unpinned tools stay current.

# Node: the current long-term-support release
FROM node:24-trixie-slim

# Default Python minor version (patch updates come with each rebuild). Projects can ask for
# another with .python-version or requires-python; uv downloads it into their home.
ARG PYTHON_VERSION=3.14

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
RUN apt-get update && apt-get install -y curl ca-certificates \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y \
       git openssh-client gh sudo ripgrep fd-find jq tree \
       build-essential ffmpeg unzip zip procps less \
    && rm -rf /var/lib/apt/lists/*

# ── Browser libraries ───────────────────────────────────────────────────────────────────
# System libraries Chromium needs, for Playwright and similar tools. They need root, so
# they belong here. The browser itself doesn't: each Playwright version wants its own
# build, and projects download it into ~/.cache/ms-playwright, kept across rebuilds.
RUN npx -y playwright install-deps chromium && rm -rf /var/lib/apt/lists/*

# ── Python ──────────────────────────────────────────────────────────────────────────────
# uv (docs.astral.sh/uv) manages Python versions, virtual environments and packages:
# projects use `uv run`, `uv add`, and a .venv each. A uv-installed Python is the default
# python3. Project .venvs point at a link uv keeps on the newest patch; if an image update
# changes the minor version, uv rebuilds the .venv on the next `uv run`.
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin UV_NO_MODIFY_PATH=1 sh \
    && UV_PYTHON_INSTALL_DIR=/opt/uv/python UV_PYTHON_BIN_DIR=/usr/local/bin \
       uv python install "$PYTHON_VERSION" --default

# ── Node package managers ───────────────────────────────────────────────────────────────
# Corepack provides pnpm and yarn at the version each project's package.json asks for,
# downloading it without asking (an agent can't answer the prompt).
RUN corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# `npm install -g` goes into ~/.local (bin on PATH): kept per project, no sudo. Without
# this, global installs land in /usr/local inside the container and vanish when it's
# recreated. (Set after the image's own installs, which belong in /usr/local.)
ENV NPM_CONFIG_PREFIX=/home/node/.local

# ── Agent CLIs ──────────────────────────────────────────────────────────────────────────
# Claude Code: Anthropic's native installer (code.claude.com/docs/en/setup), which keeps
# Claude updated. It installs into $HOME, so it runs with HOME=/opt/claude. Updates land in
# the project's home (~/.local/bin, first on PATH), so a new container starts right away
# with this copy, and each project then runs its own up-to-date one.
RUN curl -fsSL https://claude.ai/install.sh | HOME=/opt/claude bash
ENV PATH="/home/node/.local/bin:/opt/claude/.local/bin:$PATH"

# ── Container user ──────────────────────────────────────────────────────────────────────
ARG USERNAME=node
RUN echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME
# Commits show as claude-bot unless a project's own ~/.gitconfig says otherwise
RUN git config --system user.name "claude-bot" \
    && git config --system user.email "claude-bot@users.noreply.github.com"

USER $USERNAME
WORKDIR /workspace
CMD ["bash"]
