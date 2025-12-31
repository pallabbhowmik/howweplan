# HowWePlan Docker Development Makefile
# Usage: make <target>
#
# Quick start:
#   make setup    - First time setup
#   make up       - Start all services
#   make down     - Stop all services
#   make logs     - View service logs

.PHONY: help setup up down logs ps build clean test e2e db-shell redis-cli health

# Default target
help:
	@echo "HowWePlan Docker Commands"
	@echo "============================"
	@echo ""
	@echo "Setup & Build:"
	@echo "  make setup        - First time setup (copy env, build images)"
	@echo "  make build        - Build all Docker images"
	@echo "  make build-nocache- Build images without cache"
	@echo ""
	@echo "Running Services:"
	@echo "  make up           - Start all services"
	@echo "  make up-infra     - Start only infrastructure (postgres, redis)"
	@echo "  make up-services  - Start backend services only"
	@echo "  make up-apps      - Start frontend apps only"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo ""
	@echo "Monitoring:"
	@echo "  make logs         - Follow all service logs"
	@echo "  make logs-<svc>   - Follow specific service logs (e.g., logs-identity)"
	@echo "  make ps           - Show running containers"
	@echo "  make health       - Check health of all services"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo "  make db-reset     - Reset database (WARNING: destroys data)"
	@echo "  make db-seed      - Re-run seed data"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run unit tests"
	@echo "  make e2e          - Run E2E flow simulation"
	@echo "  make e2e-verbose  - Run E2E with verbose output"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean        - Stop and remove containers, volumes"
	@echo "  make prune        - Remove unused Docker resources"

# =============================================================================
# Setup & Build
# =============================================================================

setup: env-setup build
	@echo "✅ Setup complete! Run 'make up' to start services."

env-setup:
	@if not exist .env.local ( \
		copy .env.local.example .env.local && \
		echo "✅ Created .env.local from template" \
	) else ( \
		echo "⏩ .env.local already exists" \
	)

build:
	docker compose build

build-nocache:
	docker compose build --no-cache

# =============================================================================
# Running Services
# =============================================================================

up:
	docker compose up -d
	@echo ""
	@echo "✅ Services starting..."
	@echo "   PostgreSQL: localhost:5432"
	@echo "   Redis:      localhost:6379"
	@echo "   Services:   localhost:3010-3019"
	@echo ""
	@echo "Run 'make logs' to view output"
	@echo "Run 'make health' to check status"

up-infra:
	docker compose up -d postgres redis
	@echo "✅ Infrastructure started (postgres, redis)"

up-services:
	docker compose up -d audit identity requests matching itineraries booking-payments messaging disputes reviews notifications
	@echo "✅ Backend services started"

up-apps:
	docker compose up -d user-web agent-web admin-web
	@echo "✅ Frontend apps started"

down:
	docker compose down
	@echo "✅ All services stopped"

restart:
	docker compose restart
	@echo "✅ All services restarted"

# =============================================================================
# Monitoring
# =============================================================================

logs:
	docker compose logs -f

logs-identity:
	docker compose logs -f identity

logs-requests:
	docker compose logs -f requests

logs-matching:
	docker compose logs -f matching

logs-itineraries:
	docker compose logs -f itineraries

logs-booking:
	docker compose logs -f booking-payments

logs-messaging:
	docker compose logs -f messaging

logs-disputes:
	docker compose logs -f disputes

logs-reviews:
	docker compose logs -f reviews

logs-notifications:
	docker compose logs -f notifications

logs-audit:
	docker compose logs -f audit

logs-postgres:
	docker compose logs -f postgres

logs-redis:
	docker compose logs -f redis

ps:
	docker compose ps

health:
	@echo "Checking service health..."
	@echo ""
	@curl -s http://localhost:3010/health > nul 2>&1 && echo "✅ Audit (3010)" || echo "❌ Audit (3010)"
	@curl -s http://localhost:3011/health > nul 2>&1 && echo "✅ Identity (3011)" || echo "❌ Identity (3011)"
	@curl -s http://localhost:3012/health > nul 2>&1 && echo "✅ Requests (3012)" || echo "❌ Requests (3012)"
	@curl -s http://localhost:3013/health > nul 2>&1 && echo "✅ Matching (3013)" || echo "❌ Matching (3013)"
	@curl -s http://localhost:3014/health > nul 2>&1 && echo "✅ Itineraries (3014)" || echo "❌ Itineraries (3014)"
	@curl -s http://localhost:3015/health > nul 2>&1 && echo "✅ Booking-Payments (3015)" || echo "❌ Booking-Payments (3015)"
	@curl -s http://localhost:3016/health > nul 2>&1 && echo "✅ Messaging (3016)" || echo "❌ Messaging (3016)"
	@curl -s http://localhost:3017/health > nul 2>&1 && echo "✅ Disputes (3017)" || echo "❌ Disputes (3017)"
	@curl -s http://localhost:3018/health > nul 2>&1 && echo "✅ Reviews (3018)" || echo "❌ Reviews (3018)"
	@curl -s http://localhost:3019/health > nul 2>&1 && echo "✅ Notifications (3019)" || echo "❌ Notifications (3019)"

# =============================================================================
# Database
# =============================================================================

db-shell:
	docker exec -it tripcomposer-postgres psql -U tripcomposer -d tripcomposer

db-reset:
	@echo "WARNING: This will destroy all data!"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds..."
	@timeout /t 5 > nul
	docker compose down -v
	docker compose up -d postgres
	@echo "✅ Database reset complete"

db-seed:
	docker exec -i tripcomposer-postgres psql -U tripcomposer -d tripcomposer -f /docker-entrypoint-initdb.d/02-seed.sql
	@echo "✅ Seed data applied"

redis-cli:
	docker exec -it tripcomposer-redis redis-cli

# =============================================================================
# Testing
# =============================================================================

test:
	npm run test --workspaces --if-present

e2e:
	node scripts/e2e-simulation.js

e2e-verbose:
	node scripts/e2e-simulation.js --verbose

# =============================================================================
# Cleanup
# =============================================================================

clean:
	docker compose down -v --remove-orphans
	@echo "✅ Containers and volumes removed"

prune:
	docker system prune -f
	docker volume prune -f
	@echo "✅ Unused Docker resources removed"
