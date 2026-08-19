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
│   │   ├── auth.module.ts         Auth module (register, login, verify-email, forgot/reset password)
│   │   ├── auth.controller.ts     POST /auth/register, /auth/verify-email, /auth/resend-verification, /auth/forgot-password, /auth/reset-password, /auth/login, /auth/refresh, /auth/logout, GET /auth/profile, PATCH /auth/profile, PATCH /auth/password, POST /auth/profile/avatar
│   │   ├── auth.service.ts        bcrypt + JWT logic + verificación/reset (emailVerifiedAt, ForbiddenException)
│   │   ├── dto/
│   │   │   ├── register.dto.ts    Validated register DTO (@IsRealEmail + @IsNotDisposableEmail)
│   │   │   ├── login.dto.ts       Validated login DTO
│   │   │   ├── refresh-token.dto.ts  Refresh token DTO
│   │   │   ├── change-password.dto.ts  Change password DTO (currentPassword, newPassword)
│   │   │   ├── update-profile.dto.ts Profile update DTO (firstName, lastName, email)
│   │   │   ├── verify-email.dto.ts  Verify email DTO (token)
│   │   │   ├── resend-verification.dto.ts  Resend verification DTO (email)
│   │   │   ├── request-password-reset.dto.ts  Forgot password DTO (email)
│   │   │   └── reset-password.dto.ts  Reset password DTO (token, newPassword)
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts  JWT Auth Guard (@UseGuards)
│   │   └── strategies/
│   │       └── jwt.strategy.ts    Passport JWT strategy
│   ├── auth/
│   │   ├── auth.controller.spec.ts  Auth controller tests
│   │   ├── auth.service.spec.ts     Auth service tests
│   │   ├── refresh-token.service.ts  Refresh token rotation & management
│   │   ├── refresh-token.service.spec.ts  Refresh token tests
│   │   ├── email-verification.service.ts  Tokens de verificación (SHA-256, TTL 24h, markUsed/invalidateForUser)
│   │   ├── password-reset.service.ts  Tokens de reset (SHA-256, TTL 60 min, markUsed/invalidateForUser)
│   │   └── password-reset.service.spec.ts  Password reset service tests
│   ├── config/
│   │   └── env.config.ts          Environment validation (Joi schema)
│   ├── common/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts   Global exception filter
│   │   ├── guards/                        (empty)
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts         Global validation pipe
│   │   ├── utils/
│   │   │   ├── expense-share.ts            Expense share calculation (EQUAL + PERCENTAGE, memberCount-aware)
│   │   │   └── invite-code.ts             Invite code generator (6 hex chars)
│   │   └── validators/
│   │       └── is-real-email.ts           @IsRealEmail — valida dominio con MX records (registro/forgot/resend)
│   ├── groups/
│   │   ├── groups.module.ts        Groups module
│   │   ├── groups.controller.ts    POST /groups, POST /groups/join, GET /groups, GET /groups/:id, PATCH /groups/:id, DELETE /groups/:id, POST /groups/:id/archive, POST /groups/:id/regenerate-invite, DELETE /groups/:id/leave, DELETE /groups/:id/members/:memberId, PATCH /groups/:id/members/:memberId/split
│   │   ├── groups.service.ts       Create, join, get, update, delete, archive, leave group logic
│   │   ├── groups.controller.spec.ts
│   │   ├── groups.service.spec.ts
│   │   └── dto/
│   │       ├── create-group.dto.ts
│   │       ├── join-group.dto.ts   Validated invite code DTO
│   │       ├── update-group.dto.ts
│   │       └── update-member-split.dto.ts
│   ├── expenses/                          Expenses module ✓
│   │   ├── expenses.module.ts      Module registered in app.module
│   │   ├── expenses.controller.ts  CRUD (POST, GET, GET/:id, PATCH/:id, DELETE/:id)
│   │   ├── expenses.service.ts     Full CRUD + soft-delete (solo Expense)
│   │   ├── dto/                    create, update (PartialType), query (filtros), split
│   │   │   ├── create-expense.dto.ts
│   │   │   ├── create-expense-split.dto.ts
│   │   │   ├── update-expense.dto.ts
│   │   │   └── query-expense.dto.ts
│   │   ├── expenses.controller.spec.ts
│   │   └── expenses.service.spec.ts
│   ├── balances/                          Balances module ✓
│   │   ├── balances.module.ts      Module registered in app.module
│   │   ├── balances.controller.ts  GET /balances (JWT)
│   │   ├── balances.service.ts     Cálculo EQUAL + soft-delete filter
│   │   └── balances.service.spec.ts
│   ├── settlements/                        Settlements module ✓
│   │   ├── settlements.module.ts    Module registered in app.module
│   │   ├── settlements.controller.ts  GET /settlements, GET /settlements/suggestions (JWT)
│   │   ├── settlements.service.ts   Cálculo neto (balance + payments) + greedy settlement suggestions
│   │   └── settlements.service.spec.ts
│   ├── payments/                           Payments module ✓
│   │   ├── payments.module.ts      Module registered in app.module
│   │   ├── payments.controller.ts  POST /payments, GET /payments (JWT)
│   │   ├── payments.controller.spec.ts
│   │   ├── payments.service.ts     Create payment + payment history
│   │   ├── payments.service.spec.ts
│   │   └── dto/
│   │       └── create-payment.dto.ts  Validated payment DTO
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
│   │   └── prisma.service.ts      PrismaClient wrapper (PrismaPg adapter)
│   └── users/
│       ├── users.module.ts        Users module (exported)
│       ├── users.service.ts       findByEmail, findById, create, update (firstName, lastName, email, password, avatarUrl)
│       └── users.service.spec.ts
│   ├── mail/                            Mail module ✓ (global)
│   │   ├── mail.module.ts      Global module — exporta MailService; elige proveedor vía MAIL_PROVIDER
│   │   ├── mail.service.ts     mailService.send(...) — única puerta de salida de correos (send, sendTest, sendWelcomeAndVerification, sendPasswordReset)
│   │   ├── mail.controller.ts  POST /mail/test (temporal — a eliminar tras validar)
│   │   ├── mail.service.spec.ts
│   │   ├── providers/
│   │   │   ├── resend.provider.ts  Proveedor Resend (por defecto — SDK 'resend')
│   │   │   └── brevo.provider.ts   Proveedor Brevo (alternativo — MAIL_PROVIDER=brevo)
│   │   ├── interfaces/
│   │   │   ├── mail.interface.ts        MailPayload { to, subject, template, data } + SentMailResult
│   │   │   └── mail-provider.interface.ts  Contrato MailProvider + MAIL_PROVIDER_TOKEN
│   │   ├── dto/
│   │   │   └── test-mail.dto.ts   Validated test mail DTO (to, name?)
│   │   └── templates/           HTML con {{variables}}, sin HTML en código
│   │       ├── welcome.html     Bienvenida + verificación combinadas
│   │       └── password-reset.html  Restablecer contraseña
│
├── domain/                         (empty — available for future domain models)
│
├── prisma/
│   ├── schema.prisma              Database schema (User + Group + GroupMember + Expense + ExpenseSplit + Payment + RefreshToken + PasswordResetToken + EmailVerificationToken models)
│   ├── migrations/                Prisma migrations
│   │   ├── 20260611204224_init/   Initial migration (User table)
│   │   ├── 20260612165726_add_couple_model/  Couple model + relation (migrated to Group)
│   │   ├── 20260715173312_add_groups/        Group + GroupMember models added
│   │   ├── 20260715173532_remove_couple_model/  Couple model removed
│   │   ├── *split_percentage/     splitPercentage field on GroupMember
│   │   ├── *avatar_url/           avatarUrl field on User
│   │   ├── *archived_at/          archivedAt field on Group
│   │   ├── 20260804194234_add_expense_categories/  ExpenseCategory enum
│   │   ├── 20260805162604_add_payment_status/      Payment.status (PENDING/CONFIRMED/REJECTED) + confirmedAt
│   │   ├── 20260813191657_add_email_verification/  User.emailVerifiedAt + EmailVerificationToken
│   │   └── 20260818162051_add_password_reset_token/  PasswordResetToken model
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
  ├─ POST /auth/verify-email → AuthController → EmailVerificationService → valida token (24h) → emailVerifiedAt = now()
  ├─ POST /auth/resend-verification → AuthController → EmailVerificationService → reenvía correo (respuesta genérica)
  ├─ POST /auth/forgot-password → AuthController → PasswordResetService → token SHA-256 (60 min) → MailService.sendPasswordReset()
  ├─ POST /auth/reset-password → AuthController → PasswordResetService → valida token → bcrypt → revoca token + refresh tokens
  ├─ POST /auth/login      → AuthController   → AuthService   → bcrypt → JWT token (bloqueado con ForbiddenException si email no verificado)
  ├─ POST /auth/refresh    → AuthController   → RefreshTokenService → rotate refresh token
  ├─ POST /auth/logout     → AuthController   → RefreshTokenService → revoke refresh token
  ├─ GET  /auth/profile    → AuthController   → JwtAuthGuard → JwtStrategy → user payload
  ├─ PATCH /auth/profile   → AuthController   → AuthService   → update firstName/lastName/email
  ├─ PATCH /auth/password  → AuthController   → AuthService   → bcrypt → verify + hash → update user password
  ├─ POST /auth/profile/avatar → AuthController → static file serving → uploads/
  └─ Protected routes      → JwtAuthGuard     → JwtStrategy   → validate payload
```

### Phase 3 (Done — Groups working)
```
Client (HTTP)
  ├─ POST /groups              → GroupsController → GroupsService → Prisma → groups table
  ├─ POST /groups/join         → GroupsController → GroupsService → validate invite code
  ├─ GET  /groups              → GroupsController → GroupsService → list my groups
  ├─ GET  /groups/:id          → GroupsController → GroupsService → group + members
  ├─ PATCH /groups/:id         → GroupsController → GroupsService → update group
  ├─ DELETE /groups/:id        → GroupsController → GroupsService → delete group
  ├─ POST /groups/:id/archive  → GroupsController → GroupsService → archive group
  ├─ POST /groups/:id/regenerate-invite → GroupsController → GroupsService → new invite code
  ├─ DELETE /groups/:id/leave  → GroupsController → GroupsService → unlink + cleanup
  ├─ DELETE /groups/:id/members/:memberId → GroupsController → GroupsService → remove member
  └─ PATCH /groups/:id/members/:memberId/split → GroupsController → GroupsService → update split %
```

### Phase 4 (Done — Expenses CRUD)
```
Client (HTTP)
  ├─ POST   /expenses         → ExpensesController → ExpensesService → Prisma → expenses table
  ├─ GET    /expenses         → ExpensesController → ExpensesService → Prisma → list (filtros opcionales)
  ├─ GET    /expenses/:id     → ExpensesController → ExpensesService → Prisma → one expense
  ├─ PATCH  /expenses/:id     → ExpensesController → ExpensesService → Prisma → update (PartialType)
  └─ DELETE /expenses/:id     → ExpensesController → ExpensesService → Prisma → soft-delete (deletedAt)
```
> **Nota:** Solo `Expense` tiene soft-delete (`deletedAt`). `User` y `Group` no.

### Phase 5 (Done — Balances EQUAL)
```
Client (HTTP)
  └─ GET /balances → BalancesController → BalancesService → Prisma → expenses EQUAL aggregated
```
> Solo soporta `splitType = EQUAL` y `PERCENTAGE`. PERSONAL se ignora. CUSTOM removido.

### Phase 6 (Implemented — Payments)
```
Client (HTTP)
  ├─ POST /payments → PaymentsController → PaymentsService → Prisma → payments table
  └─ GET  /payments → PaymentsController → PaymentsService → Prisma → payments history (DESC)
```
> Payments aislados por grupo. No hay DELETE endpoint.

### Phase 7 (Implemented — Settlements + Suggestions)
```
Client (HTTP)
  ├─ GET  /settlements            → SettlementsController → SettlementsService → net settlement calculation
  └─ GET  /settlements/suggestions → SettlementsController → SettlementsService → greedy settlement suggestions
```
> El endpoint `GET /settlements/suggestions?groupId=optional` calcula sugerencias de liquidación usando un algoritmo greedy que empareja deudores con acreedores para minimizar transacciones. Reutiliza `calculateExpenseShare()` con memberCount del grupo.

### MailModule (Implemented — correos)
```
Client (HTTP)
  ├─ POST /mail/test (temporal) → MailController → MailService.sendTest → provider activo → inbox
  └─ AuthService (verificación / forgot-password) → MailService.send(...) → ResendProvider | BrevoProvider → inbox
```
> `MailModule` es global: ningún módulo envía correos directamente, todo pasa por `MailService`. El proveedor activo se elige con `MAIL_PROVIDER` (`resend` por defecto | `brevo`). `POST /mail/test` es un endpoint TEMPORAL pendiente de eliminar.

### Phase 8 (Planned — Receipts)
```
Client (HTTP)
  └─ POST /receipts/upload → ReceiptsModule → OCR pipeline → S3/cloud
```
> Dashboard (`GET /dashboard`) already implemented in DashboardModule.

## Current Route Map

| Method | Route | Controller | Status | Details |
|--------|-------|-----------|--------|---------|
| GET | `/` | AppController | ✓ | Returns "Hello World!" |
| POST | `/auth/register` | AuthController | ✓ | Register with bcrypt (@IsRealEmail + @IsNotDisposableEmail) |
| POST | `/auth/verify-email` | AuthController | ✓ | Verify email token (public) |
| POST | `/auth/resend-verification` | AuthController | ✓ | Resend verification email (public, respuesta genérica) |
| POST | `/auth/forgot-password` | AuthController | ✓ | Request password reset (public, respuesta genérica) |
| POST | `/auth/reset-password` | AuthController | ✓ | Reset password with token (public) |
| POST | `/auth/login` | AuthController | ✓ | Returns JWT access_token (bloquea si email no verificado) |
| POST | `/auth/refresh` | AuthController | ✓ | Refresh access token |
| POST | `/auth/logout` | AuthController | ✓ | Revoke refresh token |
| GET | `/auth/profile` | AuthController | ✓ | Protected — returns user from JWT |
| PATCH | `/auth/profile` | AuthController | ✓ | Update profile (firstName, lastName, email) |
| PATCH | `/auth/password` | AuthController | ✓ | Change password (currentPassword, newPassword) — JWT |
| POST | `/auth/profile/avatar` | AuthController | ✓ | Upload avatar image |
| POST | `/groups` | GroupsController | ✓ | Create group (JWT) |
| POST | `/groups/join` | GroupsController | ✓ | Join via invite code (JWT) |
| GET | `/groups` | GroupsController | ✓ | List my groups (JWT) |
| GET | `/groups/:id` | GroupsController | ✓ | Get group details + members (JWT) |
| PATCH | `/groups/:id` | GroupsController | ✓ | Update group (JWT) |
| DELETE | `/groups/:id` | GroupsController | ✓ | Delete group (JWT) |
| POST | `/groups/:id/archive` | GroupsController | ✓ | Archive group (JWT) |
| POST | `/groups/:id/regenerate-invite` | GroupsController | ✓ | Regenerate invite code (JWT) |
| DELETE | `/groups/:id/leave` | GroupsController | ✓ | Leave group (JWT) |
| DELETE | `/groups/:id/members/:memberId` | GroupsController | ✓ | Remove member (JWT) |
| PATCH | `/groups/:id/members/:memberId/split` | GroupsController | ✓ | Update member split % (JWT) |
| POST | `/expenses` | ExpensesController | ✓ | Create expense (JWT) |
| GET | `/expenses` | ExpensesController | ✓ | List expenses with filters (JWT) |
| GET | `/expenses/:id` | ExpensesController | ✓ | Get one expense (JWT) |
| PATCH | `/expenses/:id` | ExpensesController | ✓ | Update expense (PartialType, JWT) |
| DELETE | `/expenses/:id` | ExpensesController | ✓ | Soft-delete expense (JWT, solo Expense) |
| GET | `/balances` | BalancesController | ✓ | Balance EQUAL + PERCENTAGE (JWT, ?groupId=optional) |
| POST | `/payments` | PaymentsController | ✓ | Create payment (JWT) |
| GET | `/payments` | PaymentsController | ✓ | Payment history (JWT, DESC by createdAt, ?groupId=optional) |
| GET | `/settlements` | SettlementsController | ✓ | Net settlement calculation (JWT, ?groupId=optional) |
| GET | `/settlements/suggestions` | SettlementsController | ✓ | Settlement suggestions via greedy algorithm (JWT, ?groupId=optional) |
| GET | `/dashboard` | DashboardController | ✓ | Dashboard summary (JWT, ?groupId=optional) |
| POST | `/mail/test` | MailController | ✓ (temporal) | Test email — endpoint TEMPORAL, eliminar tras validar |
| - | `/receipts/*` | — | ❌ | Not implemented yet |

## Component Architecture

```
AppModule
├── ConfigModule         (@nestjs/config + Joi validation)
├── AuthModule
│   ├── AuthController   (POST /auth/register, /auth/verify-email, /auth/resend-verification, /auth/forgot-password, /auth/reset-password, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/profile, PATCH /auth/profile, PATCH /auth/password, POST /auth/profile/avatar)
│   ├── AuthService      (bcrypt hash + JWT sign + verificación/reset: emailVerifiedAt, ForbiddenException)
│   ├── RefreshTokenService  (refresh token rotation & management)
│   ├── EmailVerificationService  (tokens SHA-256, TTL 24h — create/validate/markUsed/invalidateForUser)
│   ├── PasswordResetService     (tokens SHA-256, TTL 60 min — create/validate/markUsed/invalidateForUser)
│   ├── JwtStrategy      (Passport strategy — Bearer token validation)
│   └── JwtAuthGuard     (@UseGuards decorator)
├── UsersModule
│   └── UsersService     (findByEmail, findById, create, update)
├── GroupsModule                    ← ✓ Implemented
│   ├── GroupsController (POST /groups, POST /groups/join, GET /groups, GET /groups/:id, PATCH /groups/:id, DELETE /groups/:id, POST /groups/:id/archive, POST /groups/:id/regenerate-invite, DELETE /groups/:id/leave, DELETE /groups/:id/members/:memberId, PATCH /groups/:id/members/:memberId/split)
│   └── GroupsService    (create, join, get, update, delete, archive, leave group logic)
├── ExpensesModule                  ← ✓ Implemented
│   ├── ExpensesController (POST, GET, GET/:id, PATCH/:id, DELETE/:id)
│   └── ExpensesService    (CRUD + soft-delete)
├── BalancesModule                  ← ✓ Implemented
│   ├── BalancesController (GET /balances)
│   └── BalancesService    (balance EQUAL + PERCENTAGE calculation)
├── PaymentsModule                   ← ✓ Implemented
│   ├── PaymentsController (POST /payments, GET /payments)
│   └── PaymentsService    (create payment, payment history)
├── SettlementsModule                ← ✓ Implemented
│   ├── SettlementsController (GET /settlements, GET /settlements/suggestions)
│   └── SettlementsService   (net settlement + greedy suggestion algorithm)
├── DashboardModule                  ← ✓ Implemented
│   ├── DashboardController (GET /dashboard)
│   └── DashboardService    (aggregated summaries)
├── MailModule (global)               ← ✓ Implemented
│   ├── MailController   (POST /mail/test — temporal, a eliminar)
│   ├── MailService      (única puerta de salida de correos — send, sendTest, sendWelcomeAndVerification, sendPasswordReset)
│   ├── ResendProvider   (proveedor por defecto — SDK 'resend')
│   └── BrevoProvider    (alternativo — MAIL_PROVIDER=brevo)
├── AppController        (GET /)
├── AppService           (business logic)
└── PrismaModule         (PrismaService provider)
    └── PrismaService    (PrismaClient + PrismaPg adapter)

Global (registered in main.ts)
├── globalValidationPipe         (ValidationPipe with whitelist/forbidNonWhitelisted/transform)
└── HttpExceptionFilter          (consistent JSON error response)
```

### Planned Module Expansion (Future)

```
AppModule
├── AuthModule
│   ├── AuthController   (register, login, profile, password)
│   ├── AuthService      (JWT, bcrypt)
│   ├── JwtStrategy      (Passport strategy)
│   └── JwtAuthGuard     (guard decorator)
├── UsersModule
│   └── UsersService     (findByEmail, findById, create, update)
├── GroupsModule                    ✓ Implemented
│   ├── GroupsController
│   └── GroupsService
├── ExpensesModule                   ✓ Implemented
│   ├── ExpensesController
│   └── ExpensesService
├── BalancesModule                   ✓ Implemented
│   └── BalancesService  (balance EQUAL + PERCENTAGE calculation)
├── PaymentsModule                   ✓ Implemented
│   ├── PaymentsController (POST /payments, GET /payments)
│   └── PaymentsService    (create payment, payment history)
├── SettlementsModule                ✓ Implemented
│   ├── SettlementsController (GET /settlements, GET /settlements/suggestions)
│   └── SettlementsService   (net settlement + greedy suggestion algorithm)
├── DashboardModule                  ✓ Implemented
│   ├── DashboardController (GET /dashboard)
│   └── DashboardService    (aggregated summaries)
├── ReceiptsModule
│   ├── ReceiptsController
│   └── ReceiptsService  (OCR + S3)
└── PrismaModule
    └── PrismaService
```

## Database Schema (Current)

```prisma
enum PaymentStatus {
  PENDING
  CONFIRMED
  REJECTED
}

model User {
  id              String   @id @default(uuid())
  firstName       String
  lastName        String
  email           String   @unique
  password        String
  avatarUrl       String?
  emailVerifiedAt DateTime?
  createdAt       DateTime @default(now())

  members               GroupMember[]
  expenses              Expense[]
  expenseSplits         ExpenseSplit[]
  paymentsSent          Payment[] @relation("SentPayments")
  paymentsReceived      Payment[] @relation("ReceivedPayments")
  refreshTokens         RefreshToken[]
  emailVerificationTokens EmailVerificationToken[]
  passwordResetTokens     PasswordResetToken[]
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model EmailVerificationToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Group {
  id         String    @id @default(uuid())
  name       String
  type       GroupType @default(COUPLE)
  inviteCode String?   @unique
  archivedAt DateTime?
  createdAt  DateTime  @default(now())

  members  GroupMember[]
  expenses Expense[]
  payments Payment[]
}

model GroupMember {
  id              String     @id @default(uuid())
  role            MemberRole @default(MEMBER)
  splitPercentage Decimal?   @db.Decimal(5,2)
  joinedAt        DateTime   @default(now())

  userId  String
  user    User   @relation(fields: [userId], references: [id])
  groupId String
  group   Group  @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

model Expense {
  id          String           @id @default(uuid())
  description String
  amount      Decimal          @db.Decimal(12,2)
  category    ExpenseCategory
  splitType   SplitType
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?

  paidById    String
  paidBy      User             @relation(fields: [paidById], references: [id])
  groupId     String
  group       Group            @relation(fields: [groupId], references: [id])

  splits      ExpenseSplit[]
}

> **Soft-delete:** Solo `Expense` usa `deletedAt`. `User` y `Group` se eliminan realmente (no tienen soft-delete).

model ExpenseSplit {
  id          String   @id @default(uuid())
  percentage  Decimal  @db.Decimal(5,2)
  createdAt   DateTime @default(now())

  expenseId   String
  expense     Expense  @relation(fields: [expenseId], references: [id])

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  @@unique([expenseId, userId])
}

model Payment {
  id          String        @id @default(uuid())
  amount      Decimal       @db.Decimal(12,2)
  status      PaymentStatus @default(PENDING)
  confirmedAt DateTime?
  createdAt   DateTime      @default(now())

  fromUserId  String
  toUserId    String

  fromUser    User     @relation("SentPayments", fields: [fromUserId], references: [id])
  toUser      User     @relation("ReceivedPayments", fields: [toUserId], references: [id])

  groupId     String
  group       Group    @relation(fields: [groupId], references: [id])

  @@index([groupId])
  @@index([fromUserId])
  @@index([toUserId])
}

model RefreshToken {
  id         String   @id @default(uuid())
  tokenHash  String   @unique
  userId     String
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
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
