# DuoBalance API

**duobalance-api** is the backend for **DuoBalance**, a shared expense tracking application for groups (couples, roommates, and friends). Built with [NestJS](https://nestjs.com/), TypeScript, [Prisma ORM](https://www.prisma.io/), and PostgreSQL.

## Features

- **Auth**: Register, login, JWT Bearer tokens, refresh tokens
- **Groups**: Create groups, join via invite code, manage members (Personal, Couple, or Group types)
- **Expenses**: Full CRUD with soft-delete, category/date/amount filtering, EQUAL + PERCENTAGE splits
- **Balances**: Per-group balance calculation with member-count-aware EQUAL and PERCENTAGE split support
- **Payments**: Record payments between members, view payment history
- **Settlements**: Net settlement calculation and intelligent settlement suggestions (greedy algorithm)
- **Dashboard**: Aggregated summaries, monthly comparisons, category breakdowns

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | NestJS v11 |
| Language | TypeScript (strict) |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | class-validator + class-transformer |
| Auth | Passport (JWT strategy) + bcrypt |

## Project setup

```bash
pnpm install
```

## Compile and run

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode
pnpm run start:prod
```

## Run tests

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## Prisma commands

```bash
npx prisma generate       # Generate client
npx prisma migrate dev    # Create migration
npx prisma db push        # Push schema (dev)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | Server port (default: 3001) |

## API Overview

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/profile` | Get current user profile |
| POST | `/groups` | Create a group |
| POST | `/groups/join` | Join a group via invite code |
| GET | `/groups` | List my groups |
| GET | `/groups/:id` | Get group details |
| DELETE | `/groups/:id/leave` | Leave a group |
| POST | `/expenses` | Create an expense |
| GET | `/expenses` | List expenses (with filters) |
| GET | `/expenses/:id` | Get expense details |
| PATCH | `/expenses/:id` | Update an expense |
| DELETE | `/expenses/:id` | Soft-delete an expense |
| GET | `/balances` | Get balance calculation |
| POST | `/payments` | Record a payment |
| GET | `/payments` | Get payment history |
| GET | `/settlements` | Get net settlement |
| GET | `/settlements/suggestions` | Get settlement suggestions |
| GET | `/dashboard` | Get financial dashboard |

## Project Status

Active development. See [docs/PLAN.md](docs/PLAN.md) and [docs/ROADMAP.md](docs/ROADMAP.md) for details.
