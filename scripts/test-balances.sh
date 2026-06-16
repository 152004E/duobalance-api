#!/usr/bin/env bash
# DuoBalance — Integration Test Script
# Idempotent: cada ejecución crea usuarios únicos (timestamp).
# No depende de datos de ejecuciones anteriores.
set -euo pipefail

API="${API_URL:-http://localhost:3000}"
TS=$(date +%s)

# ── Helpers ──────────────────────────────────────────

lower() { echo "$1" | tr '[:upper:]' '[:lower:]'; }

setup_user() {
  local name=$1
  local email="$(lower "$name")-${TS}@test.com"

  curl -s -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"email\":\"$email\",\"password\":\"123456\"}" > /dev/null

  local resp
  resp=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"123456\"}")

  jq -r '.access_token' <<< "$resp"
}

get_id() {
  local resp
  resp=$(curl -s -X GET "$API/auth/profile" -H "Authorization: Bearer $1")
  jq -r '.id' <<< "$resp"
}

pretty() {
  # pretty-print JSON response
  python3 -m json.tool 2>/dev/null || cat
}

# ── Setup: usuarios + pareja ─────────────────────────

echo "=== Setup: Crear usuarios (run ${TS}) ==="
TOKEN_JUAN=$(setup_user "Juan")
TOKEN_MARIA=$(setup_user "Maria")
TOKEN_SOLO=$(setup_user "Solo")
echo "Juan  token: ${TOKEN_JUAN:0:20}..."
echo "Maria token: ${TOKEN_MARIA:0:20}..."
echo "Solo  token: ${TOKEN_SOLO:0:20}..."

echo ""
echo "=== Setup: Crear pareja ==="
INVITE_CODE=$(curl -s -X POST "$API/couples" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" | jq -r '.inviteCode')
echo "Couple creada. Invite: $INVITE_CODE"

curl -s -X POST "$API/couples/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_MARIA" \
  -d "{\"inviteCode\":\"$INVITE_CODE\"}" > /dev/null
echo "Maria joined ✓"

echo ""
echo "=== Setup: IDs ==="
JUAN_ID=$(get_id "$TOKEN_JUAN")
MARIA_ID=$(get_id "$TOKEN_MARIA")
COUPLE_ID=$(curl -s -X GET "$API/couples/me" \
  -H "Authorization: Bearer $TOKEN_JUAN" | jq -r '.id')
echo "Juan ID:   $JUAN_ID"
echo "Maria ID:  $MARIA_ID"
echo "Couple ID: $COUPLE_ID"

# ═════════════════════════════════════════════════════
# BALANCE TESTS
# ═════════════════════════════════════════════════════

echo ""
echo "============================================"
echo "          BALANCE MODULE TESTS"
echo "============================================"

echo ""
echo "=== Test 1: Juan paga 200 (EQUAL) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d '{"description":"Cena","amount":200,"category":"FOOD","splitType":"EQUAL"}')
echo "HTTP $HTTP_CODE  (esperado: 201)"
[ "$HTTP_CODE" = "201" ] || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 2: Maria paga 100 (EQUAL) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_MARIA" \
  -d '{"description":"Desayuno","amount":100,"category":"FOOD","splitType":"EQUAL"}')
echo "HTTP $HTTP_CODE  (esperado: 201)"
[ "$HTTP_CODE" = "201" ] || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 3: Balance Juan ==="
echo "Esperado: totalExpenses=300, totalPaidByMe=200, balance=50, direction=OWED_TO_ME"
BALANCE=$(curl -s -X GET "$API/balances" -H "Authorization: Bearer $TOKEN_JUAN")
echo "$BALANCE" | pretty

TE=$(jq -r '.totalExpenses' <<< "$BALANCE")
TPM=$(jq -r '.totalPaidByMe' <<< "$BALANCE")
BAL=$(jq -r '.balance' <<< "$BALANCE")
DIR=$(jq -r '.direction' <<< "$BALANCE")

[ "$TE" = "300" ] && [ "$TPM" = "200" ] && [ "$BAL" = "50" ] && [ "$DIR" = "OWED_TO_ME" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 4: Balance Maria ==="
echo "Esperado: totalExpenses=300, totalPaidByMe=100, balance=50, direction=I_OWE"
BALANCE=$(curl -s -X GET "$API/balances" -H "Authorization: Bearer $TOKEN_MARIA")
echo "$BALANCE" | pretty

TE=$(jq -r '.totalExpenses' <<< "$BALANCE")
TPM=$(jq -r '.totalPaidByMe' <<< "$BALANCE")
BAL=$(jq -r '.balance' <<< "$BALANCE")
DIR=$(jq -r '.direction' <<< "$BALANCE")

[ "$TE" = "300" ] && [ "$TPM" = "100" ] && [ "$BAL" = "50" ] && [ "$DIR" = "I_OWE" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 5: Gasto PERSONAL se ignora ==="
curl -s -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d '{"description":"Regalo","amount":500,"category":"OTHER","splitType":"PERSONAL"}' > /dev/null
echo "Creado PERSONAL 500 ✓"

BALANCE=$(curl -s -X GET "$API/balances" -H "Authorization: Bearer $TOKEN_JUAN")
TE=$(jq -r '.totalExpenses' <<< "$BALANCE")
echo "totalExpenses: $TE (esperado: 300 — PERSONAL no cuenta)"
[ "$TE" = "300" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 6: Soft-delete cambia el balance ==="
# Obtener ID del primer expense EQUAL (no PERSONAL)
EXP_LIST=$(curl -s -X GET "$API/expenses" -H "Authorization: Bearer $TOKEN_JUAN")
FIRST_ID=$(jq -r 'map(select(.splitType == "EQUAL")) | .[0].id' <<< "$EXP_LIST")
echo "Eliminando expense EQUAL: $FIRST_ID ..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/expenses/$FIRST_ID" \
  -H "Authorization: Bearer $TOKEN_JUAN")
echo "HTTP $HTTP_CODE (esperado: 200)"

BALANCE=$(curl -s -X GET "$API/balances" -H "Authorization: Bearer $TOKEN_JUAN")
echo "Balance post soft-delete:"
echo "$BALANCE" | pretty

TE=$(jq -r '.totalExpenses' <<< "$BALANCE")
DIR=$(jq -r '.direction' <<< "$BALANCE")
# Despues de borrar el EQUAL de Maria (100), solo queda el de Juan (200)
# totalExpenses=200, direction=OWED_TO_ME (Maria debe 100 a Juan)
[ "$TE" = "200" ] && [ "$DIR" = "OWED_TO_ME" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 7: Usuario sin pareja (400) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API/balances" \
  -H "Authorization: Bearer $TOKEN_SOLO")
echo "HTTP $HTTP_CODE  (esperado: 400)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

# ═════════════════════════════════════════════════════
# PAYMENT TESTS  (usa la misma pareja Juan+Maria)
# ═════════════════════════════════════════════════════

echo ""
echo "============================================"
echo "          PAYMENT MODULE TESTS"
echo "============================================"

echo ""
echo '=== Test 8: Pago valido (Juan → Maria $50000) ==='
PAY_RESP=$(curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":50000,\"toUserId\":\"$MARIA_ID\"}")
echo "$PAY_RESP" | pretty
PAY_ID=$(jq -r '.id' <<< "$PAY_RESP")
[ -n "$PAY_ID" ] && [ "$PAY_ID" != "null" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 9: Amount invalido (amount=0) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":0,\"toUserId\":\"$MARIA_ID\"}")
echo "HTTP $HTTP_CODE  (esperado: 400)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 10: Pago a si mismo ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":100,\"toUserId\":\"$JUAN_ID\"}")
echo "HTTP $HTTP_CODE  (esperado: 400)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 11: Usuario sin pareja intenta pagar ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SOLO" \
  -d "{\"amount\":100,\"toUserId\":\"00000000-0000-0000-0000-000000000000\"}")
echo "HTTP $HTTP_CODE  (esperado: 400)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 12: Usuario destino no existe ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":100,\"toUserId\":\"00000000-0000-0000-0000-000000000000\"}")
echo "HTTP $HTTP_CODE  (esperado: 404)"
[ "$HTTP_CODE" = "404" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

# ── Setup: segunda pareja (Pedro + Ana) ──
echo ""
echo "=== Setup: Pareja B (Pedro + Ana) ==="
TOKEN_PEDRO=$(setup_user "Pedro")
TOKEN_ANA=$(setup_user "Ana")

INVITE_B=$(curl -s -X POST "$API/couples" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PEDRO" | jq -r '.inviteCode')
echo "Pedro creo pareja B. Invite: $INVITE_B"

curl -s -X POST "$API/couples/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ANA" \
  -d "{\"inviteCode\":\"$INVITE_B\"}" > /dev/null
echo "Ana joined ✓"

echo ""
echo "=== Setup: IDs Pareja B ==="
PEDRO_ID=$(get_id "$TOKEN_PEDRO")
ANA_ID=$(get_id "$TOKEN_ANA")
echo "Pedro ID: $PEDRO_ID"
echo "Ana ID:   $ANA_ID"

echo ""
echo "=== Test 13: Historial vacio (pareja B, sin pagos) ==="
HIST=$(curl -s -X GET "$API/payments" -H "Authorization: Bearer $TOKEN_PEDRO")
LEN=$(jq 'length' <<< "$HIST")
echo "Payments: $LEN (esperado: 0)"
[ "$LEN" = "0" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 14: Multiples pagos + orden DESC ==="
# Crear 3 pagos en secuencia con sleeps para timestamps distintos
curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":1000,\"toUserId\":\"$MARIA_ID\"}" > /dev/null
echo "Pago 1: 1000 (Juan → Maria)"

sleep 1

curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":2000,\"toUserId\":\"$MARIA_ID\"}" > /dev/null
echo "Pago 2: 2000 (Juan → Maria)"

sleep 1

curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_MARIA" \
  -d "{\"amount\":3000,\"toUserId\":\"$JUAN_ID\"}" > /dev/null
echo "Pago 3: 3000 (Maria → Juan)"

HIST=$(curl -s -X GET "$API/payments" -H "Authorization: Bearer $TOKEN_JUAN")
echo "Historial completo (debe ir DESC por createdAt):"
echo "$HIST" | pretty

# Verificar orden: primer elemento debe ser el mas reciente (3000)
FIRST_AMOUNT=$(jq -r '.[0].amount' <<< "$HIST")
echo "Primer amount: $FIRST_AMOUNT (esperado: 3000)"
[ "$FIRST_AMOUNT" = "3000" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 15: Aislamiento entre parejas ==="
echo "Pedro NO debe ver pagos de Juan:"
HIST_B=$(curl -s -X GET "$API/payments" -H "Authorization: Bearer $TOKEN_PEDRO")
LEN_B=$(jq 'length' <<< "$HIST_B")
echo "Payments que ve Pedro: $LEN_B (esperado: 0)"
[ "$LEN_B" = "0" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

# ═════════════════════════════════════════════════════
# SETTLEMENT TESTS  (usa pareja B: Pedro + Ana)
# ═════════════════════════════════════════════════════

echo ""
echo "============================================"
echo "          SETTLEMENT MODULE TESTS"
echo "============================================"

echo ""
echo "=== Setup: Ana paga 300 EQUAL (para settlements) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ANA" \
  -d '{"description":"Super","amount":300,"category":"FOOD","splitType":"EQUAL"}')
echo "HTTP $HTTP_CODE (esperado: 201)"
[ "$HTTP_CODE" = "201" ] || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 16: Settlement sin pagos ==="
echo "Esperado: balanceAmount=150, balanceDirection=I_OWE, netSettlement=150, settlementDirection=I_OWE"
SETTLE=$(curl -s -X GET "$API/settlements" -H "Authorization: Bearer $TOKEN_PEDRO")
echo "$SETTLE" | pretty

BA=$(jq -r '.balanceAmount' <<< "$SETTLE")
BD=$(jq -r '.balanceDirection' <<< "$SETTLE")
PMD=$(jq -r '.paymentsMade' <<< "$SETTLE")
PR=$(jq -r '.paymentsReceived' <<< "$SETTLE")
NS=$(jq -r '.netSettlement' <<< "$SETTLE")
SD=$(jq -r '.settlementDirection' <<< "$SETTLE")

echo "balanceAmount=$BA balanceDirection=$BD paymentsMade=$PMD paymentsReceived=$PR netSettlement=$NS settlementDirection=$SD"
[ "$BA" = "150" ] && [ "$BD" = "I_OWE" ] && [ "$PMD" = "0" ] && [ "$PR" = "0" ] && [ "$NS" = "150" ] && [ "$SD" = "I_OWE" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo '=== Test 17: Settlement despues de pago parcial (Pedro → Ana $50) ==='
curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PEDRO" \
  -d "{\"amount\":50,\"toUserId\":\"$ANA_ID\"}" > /dev/null
echo "Pago creado ✓"

echo "Esperado: paymentsMade=50, netSettlement=100, settlementDirection=I_OWE"
SETTLE=$(curl -s -X GET "$API/settlements" -H "Authorization: Bearer $TOKEN_PEDRO")
echo "$SETTLE" | pretty

PMD=$(jq -r '.paymentsMade' <<< "$SETTLE")
NS=$(jq -r '.netSettlement' <<< "$SETTLE")
SD=$(jq -r '.settlementDirection' <<< "$SETTLE")

echo "paymentsMade=$PMD netSettlement=$NS settlementDirection=$SD"
[ "$PMD" = "50" ] && [ "$NS" = "100" ] && [ "$SD" = "I_OWE" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo '=== Test 18: Settlement despues de pago exacto (Pedro → Ana $100) ==='
curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PEDRO" \
  -d "{\"amount\":100,\"toUserId\":\"$ANA_ID\"}" > /dev/null
echo "Pago creado ✓"

echo "Esperado: netSettlement=0, settlementDirection=SETTLED"
SETTLE=$(curl -s -X GET "$API/settlements" -H "Authorization: Bearer $TOKEN_PEDRO")
echo "$SETTLE" | pretty

NS=$(jq -r '.netSettlement' <<< "$SETTLE")
SD=$(jq -r '.settlementDirection' <<< "$SETTLE")

echo "netSettlement=$NS settlementDirection=$SD"
[ "$NS" = "0" ] && [ "$SD" = "SETTLED" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 19: Usuario sin pareja (400) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API/settlements" \
  -H "Authorization: Bearer $TOKEN_SOLO")
echo "HTTP $HTTP_CODE  (esperado: 400)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

# ═════════════════════════════════════════════════════
# PERCENTAGE SPLIT TESTS (usa pareja C: Carlos + Laura)
# ═════════════════════════════════════════════════════

echo ""
echo "============================================"
echo "          PERCENTAGE SPLIT TESTS"
echo "============================================"

echo ""
echo "=== Setup: Pareja C (Carlos + Laura) ==="
TOKEN_CARLOS=$(setup_user "Carlos")
TOKEN_LAURA=$(setup_user "Laura")

INVITE_C=$(curl -s -X POST "$API/couples" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CARLOS" | jq -r '.inviteCode')
echo "Carlos creo pareja C. Invite: $INVITE_C"

curl -s -X POST "$API/couples/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_LAURA" \
  -d "{\"inviteCode\":\"$INVITE_C\"}" > /dev/null
echo "Laura joined ✓"

CARLOS_ID=$(get_id "$TOKEN_CARLOS")
LAURA_ID=$(get_id "$TOKEN_LAURA")
echo "Carlos ID: $CARLOS_ID"
echo "Laura ID:  $LAURA_ID"

echo ""
echo "=== Test 20: PERCENTAGE 70/30 (Laura paga 100) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_LAURA" \
  -d "{\"description\":\"Compra\",\"amount\":100,\"category\":\"FOOD\",\"splitType\":\"PERCENTAGE\",\"splits\":[{\"userId\":\"$CARLOS_ID\",\"percentage\":70},{\"userId\":\"$LAURA_ID\",\"percentage\":30}]}")
echo "HTTP $HTTP_CODE (esperado: 201)"
[ "$HTTP_CODE" = "201" ] || { echo "❌ FAIL"; exit 1; }

echo ""
echo "Balance de Carlos (esperado: debe 70 a Laura):"
BALANCE=$(curl -s -X GET "$API/balances" -H "Authorization: Bearer $TOKEN_CARLOS")
echo "$BALANCE" | pretty

TE=$(jq -r '.totalExpenses' <<< "$BALANCE")
TPM=$(jq -r '.totalPaidByMe' <<< "$BALANCE")
TPP=$(jq -r '.totalPaidByPartner' <<< "$BALANCE")
SH=$(jq -r '.myShare' <<< "$BALANCE")
BAL=$(jq -r '.balance' <<< "$BALANCE")
DIR=$(jq -r '.direction' <<< "$BALANCE")

echo "totalExpenses=$TE totalPaidByMe=$TPM totalPaidByPartner=$TPP myShare=$SH balance=$BAL direction=$DIR"
[ "$TE" = "100" ] && [ "$TPM" = "0" ] && [ "$TPP" = "100" ] && [ "$SH" = "70" ] && [ "$BAL" = "70" ] && [ "$DIR" = "I_OWE" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 21: PERCENTAGE inverso (Carlos paga 200 con 60/40) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CARLOS" \
  -d "{\"description\":\"Cena\",\"amount\":200,\"category\":\"FOOD\",\"splitType\":\"PERCENTAGE\",\"splits\":[{\"userId\":\"$CARLOS_ID\",\"percentage\":60},{\"userId\":\"$LAURA_ID\",\"percentage\":40}]}")
echo "HTTP $HTTP_CODE (esperado: 201)"
[ "$HTTP_CODE" = "201" ] || { echo "❌ FAIL"; exit 1; }

echo ""
echo "Balance de Laura (esperado: debe 10 a Carlos):"
BALANCE=$(curl -s -X GET "$API/balances" -H "Authorization: Bearer $TOKEN_LAURA")
echo "$BALANCE" | pretty

TE=$(jq -r '.totalExpenses' <<< "$BALANCE")
SH=$(jq -r '.myShare' <<< "$BALANCE")

# Gasto 1: 100 PERCENTAGE 70/30 → Laura paid 100, share=30
# Gasto 2: 200 PERCENTAGE 60/40 → Carlos paid 200, Laura share=80
# Laura: totalPaidByMe=100, totalExpenses=300, myShare=110
# signedBalance = 100 - 110 = -10 (I_OWE), balance=10
[ "$TE" = "300" ] && [ "$SH" = "110" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 22: Split PERCENTAGE invalido (suma 90) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CARLOS" \
  -d "{\"description\":\"Invalido\",\"amount\":50,\"category\":\"FOOD\",\"splitType\":\"PERCENTAGE\",\"splits\":[{\"userId\":\"$CARLOS_ID\",\"percentage\":60},{\"userId\":\"$LAURA_ID\",\"percentage\":30}]}")
echo "HTTP $HTTP_CODE (esperado: 400 — suma 90 != 100)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 22b: Split PERCENTAGE invalido (suma 110) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CARLOS" \
  -d "{\"description\":\"Invalido2\",\"amount\":50,\"category\":\"FOOD\",\"splitType\":\"PERCENTAGE\",\"splits\":[{\"userId\":\"$CARLOS_ID\",\"percentage\":70},{\"userId\":\"$LAURA_ID\",\"percentage\":40}]}")
echo "HTTP $HTTP_CODE (esperado: 400 — suma 110 != 100)"
[ "$HTTP_CODE" = "400" ] && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo ""
echo "=== Test 23: Settlement con PERCENTAGE ==="
echo "Esperado: Laura debe 10 a Carlos (netSettlement=10, I_OWE)"
SETTLE=$(curl -s -X GET "$API/settlements" -H "Authorization: Bearer $TOKEN_LAURA")
echo "$SETTLE" | pretty

NS=$(jq -r '.netSettlement' <<< "$SETTLE")
SD=$(jq -r '.settlementDirection' <<< "$SETTLE")

echo "netSettlement=$NS settlementDirection=$SD"
# From Laura: paid 100 (exp1), Carlos paid 200 (exp2)
# Laura share: 30 + 80 = 110
# signedBalance = 100 - 110 = -10
# No payments → netSettlement=10, I_OWE
[ "$NS" = "10" ] && [ "$SD" = "I_OWE" ] \
  && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

# ═════════════════════════════════════════════════════
echo ""
echo "============================================"
echo "  ✅ TODOS LOS TESTS PASARON (run ${TS})"
echo "============================================"
