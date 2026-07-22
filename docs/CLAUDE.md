# CLAUDE.md — AI Context for DuoBalance

## Project Overview
DuoBalance is a shared expense tracking app for groups (couples, roommates, friends). It consists of:
- **duobalance-api**: NestJS backend (TypeScript, Prisma, PostgreSQL)
- **DuoBalance-app**: React Native + Expo mobile client

The API is fully functional with auth (register, login, refresh, logout, profile update, avatar upload), group management, expenses CRUD, balances, payments, settlements, and dashboard.

## Current State
- **Auth**: register + login + refresh + logout with bcrypt + JWT, Passport strategy + guard, refresh token rotation ✅
- **Profile**: update profile (firstName, lastName, email) + avatar upload with static file serving ✅
- **Groups**: create group, join via invite code, list my groups, get group details, update group, delete group, archive group, regenerate invite code, leave group, remove member, update member split percentage (GroupType: PERSONAL, COUPLE, GROUP) ✅
- **Expenses**: full CRUD con soft-delete (solo Expense), filtros por categoría/fecha/monto, EQUAL + PERCENTAGE split ✅
- **Balances**: endpoint `GET /balances` con cálculo EQUAL + PERCENTAGE, soft-delete filter, memberCount-aware ✅
- **Payments**: `POST /payments` y `GET /payments` (historial DESC, aislado por grupo) ✅
- **Settlements**: `GET /settlements` (neto) y `GET /settlements/suggestions` (algoritmo greedy) ✅
- **Dashboard**: `GET /dashboard` con resumen financiero (gastos, pagos, categorías, comparativa mensual) ✅
- **Split Types**: EQUAL + PERCENTAGE + PERSONAL + CUSTOM con ExpenseSplit model ✅
- **Database**: User + Group + GroupMember + Expense + ExpenseSplit + Payment + RefreshToken models with migration applied ✅
- **Tests**: 14 spec files covering Auth, Groups, Expenses, Balances, Payments, Settlements, Dashboard, Users ✅
- PrismaService module (DI wrapper for PrismaClient + PrismaPg adapter) ✅
- Global validation pipe (whitelist + forbidNonWhitelisted + transform) ✅
- Global exception filter (consistent JSON error responses) ✅
- Environment validation via Joi (@nestjs/config + joi) ✅
- CORS enabled for frontend dev origins ✅

> ⚠️ **Soft-delete:** Solo `Expense` tiene `deletedAt`. `User` y `Group` no.

## Tech Decisions
- **pnpm** over npm/yarn
- **Prisma** as ORM (PostgreSQL)
- **NestJS v11** with decorators and DI
- **Jest** for testing (ts-jest for unit, supertest for e2e)
- **ESLint flat config** + Prettier
- **React Native + Expo** for mobile (chosen, not started)

## What to Build Next
1. CUSTOM split support
2. Receipt upload with OCR
3. Rate limiting on login

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
| `duobalance-api/src/main.ts` | Entry point (CORS, static files, port) |
| `duobalance-api/src/app.module.ts` | Root module |
| `duobalance-api/prisma/schema.prisma` | Database schema (User, Group, GroupMember, Expense, ExpenseSplit, Payment, RefreshToken) |
| `duobalance-api/.env` | Environment variables |
| `duobalance-api/src/config/env.config.ts` | Joi validation schema |
| `duobalance-api/src/common/pipes/validation.pipe.ts` | Global validation pipe |
| `duobalance-api/src/common/filters/http-exception.filter.ts` | Global exception filter |
| `duobalance-api/src/common/utils/expense-share.ts` | Expense share calculation (EQUAL + PERCENTAGE, memberCount-aware) |
| `duobalance-api/src/common/utils/invite-code.ts` | Invite code generation (6 hex chars) |
| `duobalance-api/src/prisma/prisma.service.ts` | PrismaClient DI wrapper |
| `duobalance-api/src/prisma/prisma.module.ts` | Global Prisma module |
| `duobalance-api/src/auth/auth.controller.ts` | Auth routes (register, login, refresh, logout, profile, profile/avatar) |
| `duobalance-api/src/auth/auth.service.ts` | Auth business logic |
| `duobalance-api/src/auth/refresh-token.service.ts` | Refresh token rotation & management |
| `duobalance-api/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `duobalance-api/src/auth/guards/jwt-auth.guard.ts` | JWT Auth Guard |
| `duobalance-api/src/auth/dto/register.dto.ts` | Register validation |
| `duobalance-api/src/auth/dto/login.dto.ts` | Login validation |
| `duobalance-api/src/auth/dto/refresh-token.dto.ts` | Refresh token validation |
| `duobalance-api/src/auth/dto/update-profile.dto.ts` | Profile update validation |
| `duobalance-api/src/users/users.service.ts` | User queries |
| `duobalance-api/src/groups/groups.controller.ts` | Group routes (create, join, list, get, update, delete, archive, regenerate invite, leave, remove member, update member split) |
| `duobalance-api/src/groups/groups.service.ts` | Group business logic |
| `duobalance-api/src/groups/dto/create-group.dto.ts` | Create group validation |
| `duobalance-api/src/groups/dto/join-group.dto.ts` | Join group validation |
| `duobalance-api/src/groups/dto/update-group.dto.ts` | Update group validation |
| `duobalance-api/src/groups/dto/update-member-split.dto.ts` | Update member split validation |
| `duobalance-api/src/expenses/expenses.controller.ts` | Expense CRUD routes |
| `duobalance-api/src/expenses/expenses.service.ts` | Expense business logic + soft-delete |
| `duobalance-api/src/expenses/dto/create-expense.dto.ts` | Create expense validation |
| `duobalance-api/src/expenses/dto/update-expense.dto.ts` | Partial update via PartialType |
| `duobalance-api/src/expenses/dto/query-expense.dto.ts` | Query filters (category, date, amount) |
| `duobalance-api/src/expenses/dto/create-expense-split.dto.ts` | Expense split validation |
| `duobalance-api/src/balances/balances.controller.ts` | GET /balances endpoint |
| `duobalance-api/src/balances/balances.service.ts` | Balance calculation logic (EQUAL + PERCENTAGE) |
| `duobalance-api/src/payments/payments.controller.ts` | Payment routes (POST, GET) |
| `duobalance-api/src/payments/payments.service.ts` | Payment business logic (group-isolated) |
| `duobalance-api/src/payments/dto/create-payment.dto.ts` | Create payment validation |
| `duobalance-api/src/settlements/settlements.controller.ts` | Settlement routes (GET /settlements, GET /settlements/suggestions) |
| `duobalance-api/src/settlements/settlements.service.ts` | Settlement business logic + greedy suggestion algorithm |
| `duobalance-api/src/dashboard/dashboard.controller.ts` | Dashboard routes (GET) |
| `duobalance-api/src/dashboard/dashboard.service.ts` | Dashboard aggregation logic |
| `duobalance-api/scripts/test-balances.sh` | Integration test script (curl, jq, idempotente) |
| `duobalance-api/scripts/test-groups.sh` | Groups integration test script |
| `duobalance-api/scripts/seed-personal-and-couple-for-user.sql` | Seed SQL for test data |
| `docs/ARCHITECTURE.md` | Full architecture docs |
| `docs/PLAN.md` | Implementation plan |
