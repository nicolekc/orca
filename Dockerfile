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

# Create config directories for node user (gh, ssh need these)
#   /home/node/state - Claude Code and gh state; the run scripts mount a volume here
RUN mkdir -p /home/node/.config /home/node/.ssh /home/node/.local /home/node/state \
    && chown -R node:node /home/node/.config /home/node/.ssh /home/node/.local /home/node/state \
    && chmod 700 /home/node/.ssh

# Configure git for claude-bot commits (as root, applies globally)
RUN git config --global user.name "claude-bot" \
    && git config --global user.email "claude-bot@users.noreply.github.com"

# Switch to node user for Claude install (installs to ~/.local/bin)
USER $USERNAME

# Claude Code native install (as node user)
RUN curl -fsSL https://claude.ai/install.sh | bash

# Ensure claude is in PATH
ENV PATH="/home/node/.local/bin:$PATH"

# Keep logins, memory, sessions, plugins and settings in /home/node/state, which the
# run scripts back with a per-project volume, so removing a container doesn't lose them.
# Per project, not shared: Claude files memory by working dir, and every project is /workspace.
ENV CLAUDE_CONFIG_DIR=/home/node/state/claude \
    GH_CONFIG_DIR=/home/node/state/gh

WORKDIR /workspace
CMD ["bash"]