# Common tasks for the `orca` command (cli/). It runs on the Mac; it can be built and tested
# anywhere. Each platform's build has its own file in dist/, so building in a container and
# on the Mac never overwrite each other.

BUN ?= bun
VERSION ?= $(shell git rev-parse --short HEAD)
PLATFORMS := darwin-arm64 darwin-x64 linux-arm64 linux-x64
HOST := $(shell uname -s | tr A-Z a-z)-$(subst x86_64,x64,$(subst aarch64,arm64,$(shell uname -m)))

.PHONY: help install test typecheck check build dist run clean

help:             ## List these tasks
	@grep -E "^[a-z]+:.*## " $(MAKEFILE_LIST) | sed -E "s/:.*## /\t/"

install:          ## Install dependencies (none newer than a week: bunfig.toml)
	$(BUN) install --frozen-lockfile

test:             ## Run the tests
	$(BUN) test

typecheck:        ## Check types
	$(BUN) x tsc --noEmit

check: typecheck test

build: dist/orca-$(HOST)   ## Build orca for this machine

dist: $(PLATFORMS:%=dist/orca-%)   ## Build orca for every platform, with checksums
	cd dist && for f in $(PLATFORMS:%=orca-%); do sha256sum $$f > $$f.sha256; done && echo $(VERSION) > version

dist/orca-%: $(shell find cli \( -name '*.ts*' -o -name '*.css' -o -name '*.html' \) -not -path '*/test/*') package.json bun.lock
	$(BUN) cli/build.ts $* $@ $(VERSION)

run:              ## Run orca from source: make run ARGS="list"
	$(BUN) run cli/orca.ts $(ARGS)

clean:
	rm -rf dist
