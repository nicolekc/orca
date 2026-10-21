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

# Agent CLIs install system-wide, never into ~: orca-start.sh mounts each project's own
# home folder over /home/node, so everything in ~ is that project's data (logins, memory,
# sessions, settings) and survives the container. Update them by rebuilding the image.
#
# Claude Code: Anthropic's apt package (code.claude.com/docs/en/setup, Linux package
# managers), the documented system-wide install; it doesn't update itself. The build
# fails unless the signing key has Anthropic's published fingerprint.
RUN apt-get update && apt-get install -y gnupg \
    && install -d -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://downloads.claude.ai/keys/claude-code.asc -o /etc/apt/keyrings/claude-code.asc \
    && gpg --show-keys --with-colons /etc/apt/keyrings/claude-code.asc \
       | grep -q '^fpr:.*:31DDDE24DDFAB679F42D7BD2BAA929FF1A7ECACE:' \
    && echo "deb [signed-by=/etc/apt/keyrings/claude-code.asc] https://downloads.claude.ai/claude-code/apt/stable stable main" \
       > /etc/apt/sources.list.d/claude-code.list \
    && apt-get update && apt-get install -y claude-code \
    && rm -rf /var/lib/apt/lists/*

USER $USERNAME

WORKDIR /workspace
CMD ["bash"]