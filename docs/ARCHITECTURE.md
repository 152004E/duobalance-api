# Architecture & Project Structure

## Tech Stack
- **Backend**: NestJS v11 + TypeScript + Prisma ORM
- **Database**: PostgreSQL (via Prisma ORM)
- **Testing**: Jest (unit + e2e)
- **Linting**: ESLint (flat config) + Prettier
- **Package Manager**: pnpm
- **Runtime**: Node.js

## Directory Structure

```
duobalance-api/
├── src/
│   ├── main.ts                    Entry point (NestFactory)
│   ├── app.module.ts              Root module
│   ├── app.controller.ts          GET / → "Hello World!"
│   ├── app.controller.spec.ts     Unit test for controller
│   └── app.service.ts             Business logic layer
│
├── prisma/
│   ├── schema.prisma              Database schema (User model)
│   ├── migrations/                Prisma migrations
│   │   └── 20260611204224_init/   Initial migration (User table)
│   └── prisma.config.ts           Prisma configuration
│
├── test/
│   ├── app.e2e-spec.ts            E2E test for GET /
│   └── jest-e2e.json              E2E Jest configuration
│
├── dist/                          Compiled output
├── node_modules/
├── .env                           DATABASE_URL
├── .prettierrc                    Prettier config (singleQuote, trailingComma)
├── eslint.config.mjs              ESLint flat config
├── nest-cli.json                  NestJS CLI config
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── pnpm-lock.yaml
```

## Data Flow

```
Client (HTTP)  →  duobalance-api  →  PostgreSQL
                        │
                  Prisma ORM layer
```

### Phase 1 (Current — API scaffold)
```
Client (HTTP)
  └─ GET / → AppController.getHello() → AppService.getHello() → "Hello World!"
```

### Phase 2 (Planned — Auth + CRUD)
```
Client (HTTP)
  ├─ POST /auth/register   → AuthController   → Prisma → users table
  ├─ POST /auth/login      → AuthController   → JWT
  ├─ GET  /expenses        → ExpensesModule   → Prisma → expenses table
  ├─ POST /expenses        → ExpensesModule   → Prisma
  └─ GET  /balances        → BalancesModule   → Prisma → aggregated
```

### Phase 3 (Planned — Receipts + Payments)
```
Client (multipart)
  ├─ POST /receipts/upload → ReceiptsModule → OCR pipeline → S3/cloud
  ├─ GET  /payments       → PaymentsModule  → Prisma → payments table
  └─ GET  /dashboard      → DashboardModule → aggregated queries
```

## Current Route Map

| Method | Route | Controller | Status | Details |
|--------|-------|-----------|--------|---------|
| GET | `/` | AppController | ✓ Working | Returns "Hello World!" |
| - | `/auth/*` | — | ❌ Missing | No auth module yet |
| - | `/expenses/*` | — | ❌ Missing | No expenses module yet |
| - | `/balances/*` | — | ❌ Missing | No balances module yet |
| - | `/receipts/*` | — | ❌ Missing | No receipts module yet |

## Component Architecture

```
AppModule
├── AppController        (GET /)
├── AppService           (business logic)
└── PrismaModule         (PrismaService provider)
    └── PrismaService    (PrismaClient wrapper)
```

### Planned Module Expansion

```
AppModule
├── AuthModule
│   ├── AuthController   (register, login, refresh)
│   └── AuthService      (JWT, bcrypt)
├── UsersModule
│   ├── UsersController  (CRUD)
│   └── UsersService
├── ExpensesModule
│   ├── ExpensesController
│   └── ExpensesService
├── BalancesModule
│   └── BalancesService  (aggregation logic)
├── ReceiptsModule
│   ├── ReceiptsController
│   └── ReceiptsService  (OCR + S3)
├── PaymentsModule
│   └── PaymentsService
└── PrismaModule
    └── PrismaService
```

## Database Schema (Current)

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
}
```

## Styling & Conventions
- **TypeScript strict** with decorators (`experimentalDecorators`)
- **Modular architecture**: each feature is a NestJS module
- **Prisma** as the single source of truth for DB schema
- **ESLint flat config** + **Prettier** for code formatting
- **pnpm** for dependency management
- **Jest** for testing (unit with `ts-jest`, e2e with supertest)

## Design Patterns
- **Dependency Injection**: NestJS DI containers
- **Repository pattern**: via PrismaService
- **Controller → Service → Prisma**: layered architecture
- **DTO validation**: planned with `class-validator` + `class-transformer`
- **Modular design**: one NestJS module per domain feature
