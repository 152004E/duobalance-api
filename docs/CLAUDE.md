# CLAUDE.md — AI Context for DuoBalance

## Project Overview
DuoBalance is a shared expense tracking app for couples. It consists of:
- **duobalance-api**: NestJS backend (TypeScript, Prisma, PostgreSQL)
- **DuoBalance-app**: React Native + Expo mobile client (scaffolding, not yet built)

The project is in active development — the API has auth, couple management, and a PostgreSQL database.

## Current State
- **Auth**: register + login with bcrypt + JWT, Passport strategy + guard ✅
- **Couples**: create couple, join via invite code, view my couple, leave couple ✅
- **Expenses**: full CRUD con soft-delete (solo Expense), filtros por categoría/fecha/monto, EQUAL + PERCENTAGE split ✅
- **Balances**: endpoint `GET /balances` con cálculo EQUAL + PERCENTAGE, soft-delete filter ✅
- **Payments**: `POST /payments` y `GET /payments` (historial DESC, aislado por pareja) ✅
- **Dashboard**: `GET /dashboard` con resumen financiero (gastos, pagos, categorías, comparativa mensual) ✅
- **Split Types**: EQUAL + PERCENTAGE con ExpenseSplit model ✅
- **Database**: User + Couple + Expense + ExpenseSplit + Payment models with migration applied ✅
- PrismaService module (DI wrapper for PrismaClient + PrismaPg adapter) ✅
- Global validation pipe (whitelist + forbidNonWhitelisted + transform) ✅
- Global exception filter (consistent JSON error responses) ✅
- Environment validation via Joi (@nestjs/config + joi) ✅
- Test script: `scripts/test-balances.sh` (curl, idempotente, usuarios únicos por timestamp, jq)

> ⚠️ **Soft-delete:** Solo `Expense` tiene `deletedAt`. `User` y `Couple` no.

## Tech Decisions
- **pnpm** over npm/yarn
- **Prisma** as ORM (PostgreSQL)
- **NestJS v11** with decorators and DI
- **Jest** for testing (ts-jest for unit, supertest for e2e)
- **ESLint flat config** + Prettier
- **React Native + Expo** for mobile (chosen, not started)

## What to Build Next
1. Settlement suggestions (reconcile payments vs balance automatically) ← next
2. CUSTOM split support
3. Receipt upload with OCR

## Coding Style
- TypeScript strict, no `any`
- Named exports only
- Controllers thin, services fat
- DTOs with class-validator
- Conventional commits (`feat:`, `fix:`, `chore:`)

## Testing
- `pnpm test` for unit tests
- `pnpm test:e2e` for end-to-end tests
- 80%+ coverage target

## Common Commands
```bash
# Backend
pnpm install              # Install deps
pnpm start:dev            # Dev server with watch
pnpm build                # Compile
pnpm test                 # Unit tests
pnpm test:e2e             # E2E tests
pnpm lint                 # Lint fix
pnpm format               # Prettier fix

# Prisma
npx prisma generate       # Generate client
npx prisma migrate dev    # Create migration
npx prisma db push        # Push schema (dev)
```

## Key Files
| File | Purpose |
|------|---------|
| `duobalance-api/src/main.ts` | Entry point |
| `duobalance-api/src/app.module.ts` | Root module |
| `duobalance-api/prisma/schema.prisma` | Database schema |
| `duobalance-api/.env` | Environment variables |
| `duobalance-api/src/config/env.config.ts` | Joi validation schema |
| `duobalance-api/src/common/pipes/validation.pipe.ts` | Global validation pipe |
| `duobalance-api/src/common/filters/http-exception.filter.ts` | Global exception filter |
| `duobalance-api/src/prisma/prisma.service.ts` | PrismaClient DI wrapper |
| `duobalance-api/src/auth/auth.controller.ts` | Auth routes (register, login) |
| `duobalance-api/src/auth/auth.service.ts` | Auth business logic |
| `duobalance-api/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `duobalance-api/src/auth/guards/jwt-auth.guard.ts` | JWT Auth Guard |
| `duobalance-api/src/users/users.service.ts` | User queries |
| `duobalance-api/src/couples/couples.controller.ts` | Couple routes (create, join, leave, me) |
| `duobalance-api/src/couples/couples.service.ts` | Couple business logic |
| `duobalance-api/src/common/utils/invite-code.ts` | Invite code generation |
| `duobalance-api/src/expenses/expenses.controller.ts` | Expense CRUD routes |
| `duobalance-api/src/expenses/expenses.service.ts` | Expense business logic + soft-delete |
| `duobalance-api/src/expenses/dto/create-expense.dto.ts` | Create expense validation |
| `duobalance-api/src/expenses/dto/update-expense.dto.ts` | Partial update via PartialType |
| `duobalance-api/src/expenses/dto/query-expense.dto.ts` | Query filters (category, date, amount) |
| `duobalance-api/src/balances/balances.controller.ts` | GET /balances endpoint |
| `duobalance-api/src/balances/balances.service.ts` | Balance calculation logic (EQUAL) |
| `duobalance-api/src/balances/balances.service.spec.ts` | Unit tests for balance |
| `duobalance-api/src/balances/balances.service.spec.ts` | Unit tests for balance |
| `duobalance-api/src/payments/payments.controller.ts` | Payment routes (POST, GET) |
| `duobalance-api/src/payments/payments.service.ts` | Payment business logic |
| `duobalance-api/src/payments/dto/create-payment.dto.ts` | Create payment validation |
| `duobalance-api/src/settlements/settlements.controller.ts` | Settlement routes (GET) |
| `duobalance-api/src/settlements/settlements.service.ts` | Settlement business logic |
| `duobalance-api/src/dashboard/dashboard.controller.ts` | Dashboard routes (GET) |
| `duobalance-api/src/dashboard/dashboard.service.ts` | Dashboard aggregation logic |
| `duobalance-api/src/dashboard/dashboard.service.spec.ts` | Unit tests for dashboard |
| `duobalance-api/scripts/test-balances.sh` | Integration test script (curl, jq, idempotente) |
| `docs/ARCHITECTURE.md` | Full architecture docs |
| `docs/PLAN.md` | Implementation plan |
