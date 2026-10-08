# CallVerse frontend - developer commands.
#
#   make web        start the dev server on http://localhost:3000
#   make help       list every target
#
# Port 3000 matters: it is the origin the backend's CORS policy allows.
# The backend runs separately: `make api` in callverse-backend.

# --- Shell -------------------------------------------------------------------
# Same choice as the backend Makefile: on Windows use Git Bash, found by its
# 8.3 short path (make cannot handle a SHELL path containing spaces), never
# the System32 bash.exe, which is the WSL launcher.
ifeq ($(OS),Windows_NT)
  BASH := $(firstword $(wildcard \
    C:/PROGRA~1/Git/bin/bash.exe \
    C:/PROGRA~2/Git/bin/bash.exe \
    $(subst \,/,$(LOCALAPPDATA))/Programs/Git/bin/bash.exe))
  ifeq ($(BASH),)
    $(error Git Bash not found. Install Git for Windows, or pass the path: make web BASH=/c/path/to/bash.exe)
  endif
else
  BASH := /bin/bash
endif
SHELL := $(BASH)
.SHELLFLAGS := -c

.DEFAULT_GOAL := help

# --- Settings (override on the command line: make web PORT=3001) -------------
PORT    ?= 3000
API_URL ?= http://localhost:8080/api/v1
WS_URL  ?= ws://localhost:8080/ws

# The app reads these at build/dev time (src/lib/api.ts, src/lib/stomp.ts).
APP_ENV := NEXT_PUBLIC_API_URL=$(API_URL) NEXT_PUBLIC_WS_URL=$(WS_URL) NEXT_TELEMETRY_DISABLED=1

# --- Help ---------------------------------------------------------------------
.PHONY: help
help: ## Show this help
	@echo ""
	@echo "  CallVerse frontend"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "    \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Backend: run 'make api' in callverse-backend (expected at $(API_URL))."
	@echo ""

# --- Dependencies --------------------------------------------------------------
# Installed from the lockfile only, and only when it changed.
node_modules: package-lock.json
	npm ci
	@touch node_modules

.PHONY: install
install: ## Install dependencies from the lockfile (npm ci)
	npm ci

# --- Running -------------------------------------------------------------------
.PHONY: web
web: node_modules ## Start the dev server on http://localhost:3000 (hot reload)
	@$(MAKE) --no-print-directory backend-check
	@echo "  Starting CallVerse web on http://localhost:$(PORT) ..."
	@$(APP_ENV) npx next dev --turbopack -p $(PORT)

.PHONY: web-prod
web-prod: build ## Build, then serve the production bundle on port 3000
	@$(MAKE) --no-print-directory backend-check
	@echo "  Serving the production build on http://localhost:$(PORT) ..."
	@$(APP_ENV) npx next start -p $(PORT)

.PHONY: backend-check
backend-check: ## Tell whether the backend answers (never blocks the start)
	@if curl -s -o /dev/null -m 2 "$(API_URL)/health/status"; then \
	  echo "  Backend: up at $(API_URL)"; \
	else \
	  echo "  Backend: NOT reachable at $(API_URL). Pages load, but login and data will fail."; \
	  echo "           Start it with 'make api' in callverse-backend."; \
	fi

# --- Quality gate (the same steps as CI) ------------------------------------------
.PHONY: build
build: node_modules ## Production build
	$(APP_ENV) npm run build

.PHONY: lint
lint: node_modules ## ESLint
	npm run lint

.PHONY: typecheck
typecheck: node_modules ## TypeScript, no emit
	npm run typecheck

.PHONY: test
test: node_modules ## Unit and component tests (Vitest)
	npm test

.PHONY: check
check: lint typecheck test build ## Everything CI runs: lint, typecheck, tests, build

# --- Housekeeping ----------------------------------------------------------------
.PHONY: clean
clean: ## Remove build output (.next)
	rm -rf .next
