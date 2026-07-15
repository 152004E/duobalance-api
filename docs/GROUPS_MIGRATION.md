# v2.0 — Migración Couples → Groups

## Objetivo
Migrar del modelo exclusivo de parejas (`Couple`) a un modelo multi-actor (`Group`) que soporte Personal, Pareja y Grupo (3+).

## Nuevo Modelo de Datos

```prisma
enum GroupType {
  PERSONAL  // 1 persona, sin split
  COUPLE    // 2 personas, 50/50 o porcentaje
  GROUP     // 3+ personas, N-way equal o porcentaje
}

enum MemberRole {
  OWNER   // creó el grupo, control total
  ADMIN   // puede editar configuración, invitar/expulsar miembros
  MEMBER  // puede ver, agregar gastos y hacer pagos
}

model Group {
  id         String    @id @default(uuid())
  name       String
  type       GroupType @default(COUPLE)
  inviteCode String?   @unique
  createdAt  DateTime  @default(now())

  members   GroupMember[]
  expenses  Expense[]
  payments  Payment[]
}

model GroupMember {
  id       String     @id @default(uuid())
  role     MemberRole @default(MEMBER)
  joinedAt DateTime   @default(now())

  userId  String
  user    User   @relation(fields: [userId], references: [id])
  groupId String
  group   Group  @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}
```

## Matriz de Permisos

| Acción | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Ver grupo / gastos / pagos | ✅ | ✅ | ✅ |
| Agregar gasto propio | ✅ | ✅ | ✅ |
| Ver balance / dashboard | ✅ | ✅ | ✅ |
| Editar nombre del grupo | ✅ | ✅ | ❌ |
| Editar tipo de split default | ✅ | ✅ | ❌ |
| Invitar miembros | ✅ | ✅ | ❌ |
| Expulsar miembros | ✅ | ✅ (solo MEMBER) | ❌ |
| Cambiar rol de miembro | ✅ | ❌ | ❌ |
| Eliminar grupo | ✅ | ❌ | ❌ |
| Salir del grupo | ✅ | ✅ | ✅ |

## Roles por Tipo de Grupo

| Tipo | Miembros | Roles esperados |
|---|---|---|
| `PERSONAL` | 1 | Creador = OWNER |
| `COUPLE` | 2 | Creador = OWNER, Partner al unirse = ADMIN |
| `GROUP` | 3+ | Creador = OWNER, invitados = MEMBER (ascendible a ADMIN por el OWNER) |

## Endpoints Planeados

### Groups
| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| `POST` | `/groups` | - | Crear grupo con `{name, type}`. `COUPLE`/`GROUP` generan `inviteCode` |
| `GET` | `/groups` | - | Listar grupos del usuario autenticado |
| `GET` | `/groups/:id` | MEMBER | Detalle del grupo (miembros, metadata) |
| `PATCH` | `/groups/:id` | ADMIN | Actualizar nombre/tipo de split default |
| `POST` | `/groups/:id/join` | - | Unirse por `inviteCode` |
| `DELETE` | `/groups/:id` | OWNER | Eliminar el grupo completo |
| `DELETE` | `/groups/:id/leave` | MEMBER | Salir del grupo (+ eliminar si queda vacío) |
| `POST` | `/groups/:id/invite` | ADMIN | Regenerar invite code |

### Miembros
| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| `GET` | `/groups/:id/members` | MEMBER | Listar miembros del grupo |
| `DELETE` | `/groups/:id/members/:userId` | OWNER/ADMIN | Expulsar miembro |
| `PATCH` | `/groups/:id/members/:userId/role` | OWNER | Cambiar rol de miembro |

## Servicios a Modificar

| Servicio | Cambio |
|---|---|
| `ExpensesService` | `user.coupleId` → verificar membresía en `GroupMember` por `groupId` |
| `BalancesService` | Calcular balance según `memberCount` (no hardcode `/2`). `EQUAL` = `amount / memberCount` |
| `PaymentsService` | Validar que pagador y receptor sean miembros del mismo `groupId` |
| `SettlementsService` | Adaptar cálculo neto para N miembros |
| `DashboardService` | Filtrar por `groupId` |
| `expense-share.ts` | `amount / 2` → `amount / memberCount` para EQUAL |

## Reglas de Split por Tipo

| Tipo | Split válido | Cálculo |
|---|---|---|
| `PERSONAL` | Sin split | 100% a quien registra |
| `COUPLE` | `EQUAL` (50/50) o `PERCENTAGE` | 2 personas |
| `GROUP` | `EQUAL` (N-way) o `PERCENTAGE` | N personas |

## Migración de Datos (desde Couple actual)

Por cada fila en `Couple`:
1. Crear `Group` con `type: COUPLE`, `name: "Pareja"`
2. Migrar cada `User.coupleId` → insertar `GroupMember` con `role: OWNER` al primer usuario, `role: ADMIN` al segundo
3. Migrar `Expense.coupleId` → `Expense.groupId`
4. Migrar `Payment.coupleId` → `Payment.groupId`
5. Eliminar tabla `Couple` y campo `User.coupleId`
