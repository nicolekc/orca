FROM node:20-bookworm-slim

# Install GitHub CLI repo
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# Core tools:
#   git           - Version control
#   gh            - GitHub CLI for auth and PR creation
#   sudo          - Claude sometimes needs elevated permissions
#   ripgrep       - Fast code search (rg) - Claude uses this
#   fd-find       - Fast file finder (fd) - Claude uses this
#   jq            - JSON parsing in scripts
#   tree          - Directory visualization
#   openssh-client - SSH for git operations
RUN apt-get update && apt-get install -y \
    git gh sudo ripgrep fd-find jq tree openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Playwright browsers (for UI testing - optional but recommended)
RUN npx playwright install --with-deps chromium
RUN npm install -g @playwright/mcp

# Allow node user to sudo without password
ARG USERNAME=node
RUN echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME

# Configure git for claude-bot commits (as root, applies globally)
RUN git config --global user.name "claude-bot" \
    && git config --global user.email "claude-bot@users.noreply.github.com"

# Agent CLIs install outside ~: orca-start.sh mounts each project's own home folder over
# /home/node, hiding anything the image puts there. Everything in ~ is that project's data
# (logins, memory, sessions, settings) and survives the container.
#
# Claude Code: Anthropic's native installer (code.claude.com/docs/en/setup), which keeps
# Claude updated. It installs into $HOME, so it runs with HOME=/opt/claude. Updates land in
# the project's home (~/.local/bin, first on PATH), so a new container starts right away
# with this copy, and each project then runs its own up-to-date one.
RUN curl -fsSL https://claude.ai/install.sh | HOME=/opt/claude bash
ENV PATH="/home/node/.local/bin:/opt/claude/.local/bin:$PATH"

USER $USERNAME

WORKDIR /workspace
CMD ["bash"]