# Common tasks for the `orca` command (cli/). It runs on the Mac; it can be built and tested
# anywhere. Each platform's build has its own file in dist/, so building in a container and
# on the Mac never overwrite each other.

BUN ?= bun
VERSION ?= $(shell git rev-parse --short HEAD)
PLATFORMS := darwin-arm64 darwin-x64 linux-arm64 linux-x64
HOST := $(shell uname -s | tr A-Z a-z)-$(subst x86_64,x64,$(subst aarch64,arm64,$(shell uname -m)))

.PHONY: help install test browser typecheck check e2e build dist run clean

help:             ## List these tasks
	@grep -E "^[a-z]+:.*## " $(MAKEFILE_LIST) | sed -E "s/:.*## /\t/"

install:          ## Install dependencies (none newer than a week: bunfig.toml)
	$(BUN) install --frozen-lockfile

# The tests, in cli/test: unit/ and web/ (the dashboard's React code) are quick and need nothing;
# browser/ drives Chromium (and code-server, VS Code in a browser), downloaded once; e2e/ needs
# Docker, so it runs in CI. All but e2e run anywhere, including a project container.
test:             ## Run the unit and React tests (seconds)
	$(BUN) test

browser: build    ## Run the browser tests: the dashboard, the compiled one, the workspace file in an editor
	$(BUN) x playwright install chromium
	CODE_SERVER="$$(cli/test/browser/code-server.sh)" ORCA_BIN=dist/orca-$(HOST) \
	  $(BUN) test --config=cli/test/browser/bunfig.toml ./cli/test/browser/*.browser.ts

typecheck:        ## Check types
	$(BUN) x tsc --noEmit

check: typecheck test browser   ## Everything that runs without Docker

e2e: build        ## Run the end-to-end tests against real Docker (CI): make e2e ONLY="terminals"
	bash cli/test/e2e/e2e.sh dist/orca-$(HOST) $(ONLY)

build: dist/orca-$(HOST)   ## Build orca for this machine

dist: $(PLATFORMS:%=dist/orca-%)   ## Build orca for every platform, with checksums
	cd dist && for f in $(PLATFORMS:%=orca-%); do sha256sum $$f > $$f.sha256; done && echo $(VERSION) > version

dist/orca-%: $(shell find cli \( -name '*.ts*' -o -name '*.css' -o -name '*.html' \) -not -path '*/test/*') package.json bun.lock
	$(BUN) cli/build.ts $* $@ $(VERSION)

run:              ## Run orca from source: make run ARGS="list"
	$(BUN) run cli/orca.ts $(ARGS)

clean:
	rm -rf dist
