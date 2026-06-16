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
│   ├── app.service.ts             Business logic layer
│   ├── auth/
│   │   ├── auth.module.ts         Auth module (register, login)
│   │   ├── auth.controller.ts     POST /auth/register, /auth/login, GET /auth/profile
│   │   ├── auth.service.ts        bcrypt + JWT logic
│   │   ├── dto/
│   │   │   ├── register.dto.ts    Validated register DTO
│   │   │   └── login.dto.ts       Validated login DTO
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts  JWT Auth Guard (@UseGuards)
│   │   └── strategies/
│   │       └── jwt.strategy.ts    Passport JWT strategy
│   ├── config/
│   │   └── env.config.ts          Environment validation (Joi schema)
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   Global exception filter
│   │   ├── guards/                        (empty)
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts         Global validation pipe
│   │   └── utils/
│   │       └── invite-code.ts             Invite code generator
│   ├── couples/
│   │   ├── couples.module.ts       Couples module
│   │   ├── couples.controller.ts   POST /couples, POST /couples/join, GET /couples/me, DELETE /couples/leave
│   │   ├── couples.service.ts      Create, join, get, leave couple logic
│   │   └── dto/
│   │       ├── create-couple.dto.ts
│   │       └── join-couple.dto.ts  Validated invite code DTO
│   ├── expenses/                          Expenses module (stub)
│   │   ├── expenses.module.ts      Module registered in app.module
│   │   ├── expenses.controller.ts  Controller — no endpoints yet
│   │   ├── expenses.service.ts     Service — no logic yet
│   │   ├── dto/                    Empty (no DTOs yet)
│   │   ├── expenses.controller.spec.ts
│   │   └── expenses.service.spec.ts
│   ├── generated/                         Prisma Client (generated)
│   │   ├── client.ts              Main PrismaClient import
│   │   ├── browser.ts             Browser-safe exports
│   │   ├── commonInputTypes.ts    Shared Prisma input types
│   │   ├── enums.ts               Generated enums
│   │   ├── internal/              Internal Prisma types
│   │   ├── models.ts              Model definitions
│   │   └── models/                Per-model type exports
│   ├── prisma/
│   │   ├── prisma.module.ts       Global module exporting PrismaService
│   │   └── prisma.service.ts      PrismaClient wrapper (DI + PrismaPg adapter)
│   └── users/
│       ├── users.module.ts        Users module (exported)
│       └── users.service.ts       findByEmail, findById, create
│
├── prisma/
│   ├── schema.prisma              Database schema (User + Couple models)
│   ├── migrations/                Prisma migrations
│   │   ├── 20260611204224_init/   Initial migration (User table)
│   │   └── 20260612165726_add_couple_model/  Couple model + relation
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

### Phase 1 (Done — API scaffold)
```
Client (HTTP)
  └─ GET / → AppController.getHello() → AppService.getHello() → "Hello World!"
```

### Phase 2 (Done — Auth working)
```
Client (HTTP)
  ├─ POST /auth/register   → AuthController   → AuthService   → bcrypt → Prisma → users table
  ├─ POST /auth/login      → AuthController   → AuthService   → bcrypt → JWT token
  ├─ GET  /auth/profile    → AuthController   → JwtAuthGuard → JwtStrategy → user payload
  └─ Protected routes      → JwtAuthGuard     → JwtStrategy   → validate payload
```

### Phase 3 (Done — Couples working)
```
Client (HTTP)
  ├─ POST /couples             → CouplesController → CouplesService → Prisma → couples table
  ├─ POST /couples/join        → CouplesController → CouplesService → validate invite code
  ├─ GET  /couples/me          → CouplesController → CouplesService → couple + members
  └─ DELETE /couples/leave     → CouplesController → CouplesService → unlink + cleanup
```

### Phase 4 (Stub — Expenses module scaffolded, no endpoints)
```
Client (HTTP)
  ├─ expenses.module.ts  ✓ registered in AppModule
  ├─ expenses.controller.ts  ❌ empty — no routes yet
  └─ expenses.service.ts     ❌ empty — no logic yet
```

### Phase 5 (Planned — Expenses + Balances)
```
Client (HTTP)
  ├─ GET/POST /expenses   → ExpensesModule → Prisma → expenses table
  ├─ GET  /balances       → BalancesModule → Prisma → aggregated
  └─ GET  /dashboard      → DashboardModule → summaries
```

### Phase 6 (Planned — Receipts + Payments)
```
Client (multipart)
  ├─ POST /receipts/upload → ReceiptsModule → OCR pipeline → S3/cloud
  ├─ GET  /payments       → PaymentsModule  → Prisma → payments table
  └─ GET  /dashboard      → DashboardModule → aggregated queries
```

## Current Route Map

| Method | Route | Controller | Status | Details |
|--------|-------|-----------|--------|---------|
| GET | `/` | AppController | ✓ | Returns "Hello World!" |
| POST | `/auth/register` | AuthController | ✓ | Register with bcrypt |
| POST | `/auth/login` | AuthController | ✓ | Returns JWT access_token |
| GET | `/auth/profile` | AuthController | ✓ | Protected — returns user from JWT |
| POST | `/couples` | CouplesController | ✓ | Create couple |
| POST | `/couples/join` | CouplesController | ✓ | Join via invite code |
| GET | `/couples/me` | CouplesController | ✓ | Get my couple + members |
| DELETE | `/couples/leave` | CouplesController | ✓ | Leave couple |
| - | `/expenses/*` | ExpensesController | 🟡 | Module scaffolded, no routes yet |
| - | `/balances/*` | — | ❌ | Not implemented yet |
| - | `/receipts/*` | — | ❌ | Not implemented yet |
| - | `/payments/*` | — | ❌ | Not implemented yet |

## Component Architecture

```
AppModule
├── ConfigModule         (@nestjs/config + Joi validation)
├── AuthModule
│   ├── AuthController   (POST /auth/register, /auth/login, GET /auth/profile)
│   ├── AuthService      (bcrypt hash + JWT sign)
│   ├── JwtStrategy      (Passport strategy — Bearer token validation)
│   └── JwtAuthGuard     (@UseGuards decorator)
├── UsersModule
│   └── UsersService     (findByEmail, findById, create)
├── CouplesModule
│   ├── CouplesController (POST /couples, POST /couples/join, GET /couples/me, DELETE /couples/leave)
│   └── CouplesService   (create, join, get, leave couple logic)
├── ExpensesModule                  ← Scaffolded (no endpoints yet)
│   ├── ExpensesController (stub)
│   └── ExpensesService    (stub)
├── AppController        (GET /)
├── AppService           (business logic)
└── PrismaModule         (PrismaService provider)
    └── PrismaService    (PrismaClient + PrismaPg adapter)

Global (registered in main.ts)
├── globalValidationPipe         (ValidationPipe with whitelist/forbidNonWhitelisted/transform)
└── HttpExceptionFilter          (consistent JSON error response)
```

### Planned Module Expansion

```
AppModule
├── AuthModule
│   ├── AuthController   (register, login, profile)
│   ├── AuthService      (JWT, bcrypt)
│   ├── JwtStrategy      (Passport strategy)
│   └── JwtAuthGuard     (guard decorator)
├── UsersModule
│   └── UsersService     (findByEmail, findById, create)
├── CouplesModule                  ✓ Implemented
│   ├── CouplesController
│   └── CouplesService
├── ExpensesModule                 🟡 Scaffolded — needs implementation
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

  coupleId  String?
  couple    Couple?  @relation(fields: [coupleId], references: [id])
}

model Couple {
  id         String   @id @default(uuid())
  inviteCode String   @unique
  createdAt  DateTime @default(now())

  users      User[]
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
- **DTO validation**: via global ValidationPipe (`class-validator` + `class-transformer`)
- **Auth**: JWT Bearer tokens via Passport strategy + Guard decorator
- **Password hashing**: bcrypt with salt rounds = 10
- **Prisma**: driver adapter pattern (PrismaPg adapter for PostgreSQL)
- **Modular design**: one NestJS module per domain feature
