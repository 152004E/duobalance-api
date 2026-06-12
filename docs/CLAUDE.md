# CLAUDE.md — AI Context for DuoBalance

## Project Overview
DuoBalance is a shared expense tracking app for couples. It consists of:
- **duobalance-api**: NestJS backend (TypeScript, Prisma, PostgreSQL)
- **DuoBalance-app**: React Native + Expo mobile client (scaffolding, not yet built)

The project is in early development — the API has a basic scaffold and a User model, and the mobile app is a git stub.

## Current State
- Backend has one `GET /` endpoint returning "Hello World!"
- Prisma schema has a single `User` model (id, name, email, password, createdAt)
- Database migration already applied
- Mobile app has no source files yet
- PrismaService module (DI wrapper for PrismaClient) ✅
- Global validation pipe (whitelist + forbidNonWhitelisted + transform) ✅
- Global exception filter (consistent JSON error responses) ✅
- Environment validation via Joi (@nestjs/config + joi) ✅

## Tech Decisions
- **pnpm** over npm/yarn
- **Prisma** as ORM (PostgreSQL)
- **NestJS v11** with decorators and DI
- **Jest** for testing (ts-jest for unit, supertest for e2e)
- **ESLint flat config** + Prettier
- **React Native + Expo** for mobile (chosen, not started)

## What to Build Next
1. Auth module (register/login with JWT + bcrypt)
2. Expense CRUD module
3. Balance calculation logic
4. Couple/group management (linking two users)
5. Receipt upload with OCR
6. Payment tracking and settlement

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
| `docs/ARCHITECTURE.md` | Full architecture docs |
| `docs/PLAN.md` | Implementation plan |
