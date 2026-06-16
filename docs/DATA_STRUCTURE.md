# Data Structures — Database Models & API DTOs

## Database Models (Prisma Schema)

### User (current)
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
```

### Couple (current)
```prisma
model Couple {
  id         String   @id @default(uuid())
  inviteCode String   @unique
  createdAt  DateTime @default(now())

  users      User[]
}
```

### Planned Models

```prisma
model Expense {
  id          String   @id @default(uuid())
  amount      Float
  description String
  category    ExpenseCategory
  paidById    String
  paidBy      User     @relation("PaidBy")
  splitType   SplitType
  createdAt   DateTime @default(now())
  coupleId    String
  couple      Couple   @relation("Expenses")
}

model Payment {
  id          String   @id @default(uuid())
  amount      Float
  fromId      String
  from        User     @relation("Payer")
  toId        String
  to          User     @relation("Payee")
  coupleId    String
  couple      Couple   @relation("Payments")
  settledAt   DateTime @default(now())
}

enum ExpenseCategory {
  FOOD
  TRANSPORT
  HOUSING
  UTILITIES
  ENTERTAINMENT
  SHOPPING
  HEALTH
  OTHER
}

enum SplitType {
  EQUAL
  PERCENTAGE
  CUSTOM
}
```

## API DTOs (Request)

```typescript
// Auth
class RegisterDto {
  name: string;
  email: string;
  password: string;
}

class LoginDto {
  email: string;
  password: string;
}

// Expense
class CreateExpenseDto {
  amount: number;
  description: string;
  category: ExpenseCategory;
  splitType: SplitType;
  customSplits?: Record<string, number>;
}

// Payment
class CreatePaymentDto {
  amount: number;
  toUserId: string;
}
```

## API Response Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  };
}

interface ExpenseResponse {
  id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  paidBy: { id: string; name: string; email: string };
  splitType: SplitType;
  createdAt: Date;
}

interface BalanceResponse {
  coupleId: string;
  totalOwed: number;
  totalDebt: number;
  netBalance: number;
  expenses: ExpenseResponse[];
  payments: PaymentResponse[];
}

interface PaymentResponse {
  id: string;
  amount: number;
  from: { id: string; name: string };
  to: { id: string; name: string };
  settledAt: Date;
}

interface ReceiptUploadResponse {
  id: string;
  url: string;
  processed: boolean;
  extractedData?: {
    amount: number;
    date: string;
    merchant: string;
    items: string[];
  };
}
```
