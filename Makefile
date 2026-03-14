.PHONY: setup setup-client setup-server dev dev-client dev-server test test-client test-server test-e2e lint build

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
