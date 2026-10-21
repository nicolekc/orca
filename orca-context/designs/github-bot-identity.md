# Claude talking on GitHub as itself

**Status:** open. Commits and PRs come from the user (per-project `~/.gitconfig`, and `"attribution": false` in `~/.claude/settings.json`), but the user wants GitHub conversations with Claude as a distinct identity.

Anything posted with the user's `gh` login appears as the user, so this needs a second GitHub identity:

| | A. Claude's GitHub App (`@claude`) | B. A bot account for the container's agent |
|---|---|---|
| How | Anthropic's app on the repo; mention `@claude` in a PR or issue, it replies as `claude[bot]` from GitHub Actions | A second GitHub account logged into the project's `gh` alongside the user's. Commits and pushes stay the user's; the agent posts comments and reviews with the bot's login (`GH_TOKEN=$(gh auth token --user <bot>) gh pr review ...`) |
| Talking to | A fresh Claude in GitHub's cloud, reading the repo | The agent working in the container, with its memory and context |
| Setup | `/install-github-app` per repo, plus an API key or token as a repo secret | One machine account (GitHub allows one free per person), logged in per project, and an instruction telling the agent to use it for comments |
| Note | Hosted, nothing to maintain | Its reviews are real reviews: the user can't approve their own PR, the bot can |

They don't conflict. The old session spec suggested a fine-grained GitHub token per project through a credential helper, with no SSH keys in containers; worth weighing alongside B.
