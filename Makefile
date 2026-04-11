.PHONY: setup setup-client setup-server dev dev-client dev-server test test-client test-server test-e2e lint build verify-deps

# Setup
setup: setup-client setup-server

setup-client:
	cd client && npm install

setup-server:
	cd server && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# Development
dev:
	@echo "Starting client and server..."
	@make dev-server & make dev-client

dev-client:
	cd client && npx vite

dev-server:
	cd server && .venv/bin/uvicorn app.main:app --reload --port 8000

# Testing
test: test-client test-server

test-client:
	cd client && npx vitest run

test-server:
	cd server && .venv/bin/python -m pytest -v

test-e2e:
	cd e2e && npx playwright test

# Build
build:
	cd client && npx vite build

# Lint
lint:
	cd client && npx eslint src/
	cd server && .venv/bin/ruff check app/

# Verify server requirements.txt is complete by installing it into a fresh
# throwaway venv and running the test suite. Catches missing direct imports
# AND missing runtime-only deps (e.g. greenlet for SQLAlchemy async) that a
# static scanner would not see. Slow: a clean install rebuilds librosa and its
# scientific-stack deps each time.
verify-deps:
	@echo "Verifying server/requirements.txt in a fresh venv..."
	@set -e; \
	TMP=$$(mktemp -d); \
	trap 'rm -rf $$TMP' EXIT; \
	python3 -m venv $$TMP/venv; \
	$$TMP/venv/bin/pip install --quiet --upgrade pip; \
	$$TMP/venv/bin/pip install --quiet -r server/requirements.txt; \
	cd server && $$TMP/venv/bin/python -m pytest -q
	@echo "verify-deps: OK"
