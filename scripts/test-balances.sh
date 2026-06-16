#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:3000"

get_token() {
  local name=$1 email=$2 pass=$3

  # Try login first
  local resp token
  resp=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}")

  token=$(echo "$resp" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  if [ -n "$token" ]; then
    echo "$token"
    return
  fi

  # Login failed → register
  resp=$(curl -s -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"email\":\"$email\",\"password\":\"$pass\"}")

  # register returns user data, not token, so login again
  resp=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}")

  token=$(echo "$resp" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

  if [ -z "$token" ]; then
    echo "ERROR: No se pudo obtener token para $email" >&2
    echo "respuesta: $resp" >&2
    exit 1
  fi

  echo "$token"
}

echo "=== 1. Token Juan ==="
TOKEN_JUAN=$(get_token "Juan" "juan@test.com" "123456")
echo "OK: ${TOKEN_JUAN:0:20}..."

echo ""
echo "=== 2. Token Maria ==="
TOKEN_MARIA=$(get_token "Maria" "maria@test.com" "123456")
echo "OK: ${TOKEN_MARIA:0:20}..."

echo ""
echo "=== 3. Asegurar pareja ==="
COUPLE=$(curl -s -X GET "$API/couples/me" \
  -H "Authorization: Bearer $TOKEN_JUAN")

INVITE_CODE=$(echo "$COUPLE" | sed -n 's/.*"inviteCode":"\([^"]*\)".*/\1/p')

if [ -z "$INVITE_CODE" ]; then
  echo "Juan no tiene pareja. Creando..."
  COUPLE=$(curl -s -X POST "$API/couples" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_JUAN")
  INVITE_CODE=$(echo "$COUPLE" | sed -n 's/.*"inviteCode":"\([^"]*\)".*/\1/p')
  echo "Creada. Invite code: $INVITE_CODE"
else
  echo "Juan ya tiene pareja. Invite code: $INVITE_CODE"
fi

# Check if Maria is in the couple
MARIA_COUPLE=$(curl -s -X GET "$API/couples/me" \
  -H "Authorization: Bearer $TOKEN_MARIA" 2>&1 || true)

MARIA_COUPLE_ID=$(echo "$MARIA_COUPLE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

if [ -z "$MARIA_COUPLE_ID" ]; then
  echo "Maria no está en la pareja. Uniendo..."
  JOIN_RESP=$(curl -s -X POST "$API/couples/join" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_MARIA" \
    -d "{\"inviteCode\":\"$INVITE_CODE\"}")
  echo "Maria joined ✓"
else
  echo "Maria ya está en la pareja ✓"
fi

# Clean old expenses to have predictable test data
echo ""
echo "=== 4. Limpiar expenses viejos ==="
EXP_LIST=$(curl -s -X GET "$API/expenses" -H "Authorization: Bearer $TOKEN_JUAN")
echo "$EXP_LIST" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | while read -r eid; do
  [ -n "$eid" ] && curl -s -X DELETE "$API/expenses/$eid" \
    -H "Authorization: Bearer $TOKEN_JUAN" > /dev/null
done
echo "OK"

echo ""
echo "=== 5. Juan paga 200 (EQUAL) ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d '{"description":"Cena","amount":200,"category":"FOOD","splitType":"EQUAL"}')
echo "HTTP $RESP"

echo ""
echo "=== 6. Maria paga 100 (EQUAL) ==="
RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_MARIA" \
  -d '{"description":"Desayuno","amount":100,"category":"FOOD","splitType":"EQUAL"}')
echo "HTTP $RESP"

echo ""
echo "=== 7. Balance de Juan ==="
echo "Esperado: totalExpenses=300, totalPaidByMe=200, balance=50, direction=OWED_TO_ME"
curl -s -X GET "$API/balances" \
  -H "Authorization: Bearer $TOKEN_JUAN" | python3 -m json.tool

echo ""
echo "=== 8. Balance de Maria ==="
echo "Esperado: totalExpenses=300, totalPaidByMe=100, balance=50, direction=I_OWE"
curl -s -X GET "$API/balances" \
  -H "Authorization: Bearer $TOKEN_MARIA" | python3 -m json.tool

echo ""
echo "=== 9. Gastos PERSONAL se ignoran ==="
curl -s -X POST "$API/expenses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d '{"description":"Regalo personal","amount":500,"category":"OTHER","splitType":"PERSONAL"}' > /dev/null
echo "Creado PERSONAL 500 ✓"
echo "Balance debe seguir igual:"
curl -s -X GET "$API/balances" \
  -H "Authorization: Bearer $TOKEN_JUAN" | python3 -m json.tool

echo ""
echo "=== 10. Soft-delete elimina del balance ==="
EXP_LIST=$(curl -s -X GET "$API/expenses" -H "Authorization: Bearer $TOKEN_JUAN")
FIRST_ID=$(echo "$EXP_LIST" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
if [ -n "$FIRST_ID" ]; then
  echo "Eliminando $FIRST_ID ..."
  curl -s -X DELETE "$API/expenses/$FIRST_ID" \
    -H "Authorization: Bearer $TOKEN_JUAN" > /dev/null
  echo "Balance post soft-delete:"
  curl -s -X GET "$API/balances" \
    -H "Authorization: Bearer $TOKEN_JUAN" | python3 -m json.tool
else
  echo "No hay expenses"
fi

echo ""
echo "=== 11. Usuario sin pareja (debe fallar 400) ==="
TOKEN_SOLO=$(get_token "Solo" "solo@test.com" "123456")
echo "Balance de Solo (sin pareja):"
curl -s -X GET "$API/balances" \
  -H "Authorization: Bearer $TOKEN_SOLO"

# ──────────────────────────────────────────────
# EXTRACT USER & COUPLE IDS FOR PAYMENTS TESTS
# ──────────────────────────────────────────────
echo ""
echo "=== 12. Extraer IDs para pruebas de pagos ==="
JUAN_PROFILE=$(curl -s -X GET "$API/auth/profile" \
  -H "Authorization: Bearer $TOKEN_JUAN")
JUAN_ID=$(echo "$JUAN_PROFILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Juan ID: $JUAN_ID"

MARIA_PROFILE=$(curl -s -X GET "$API/auth/profile" \
  -H "Authorization: Bearer $TOKEN_MARIA")
MARIA_ID=$(echo "$MARIA_PROFILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Maria ID: $MARIA_ID"

COUPLE_ME=$(curl -s -X GET "$API/couples/me" \
  -H "Authorization: Bearer $TOKEN_JUAN")
COUPLE_ID=$(echo "$COUPLE_ME" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Couple ID: $COUPLE_ID"

# ──────────────────────────────────────────────
# PAYMENTS MODULE TESTS
# ──────────────────────────────────────────────
echo ""
echo "============================================"
echo "          PAYMENTS MODULE TESTS"
echo "============================================"

echo ""
echo '=== Caso 1: Pago válido (Juan → Maria $50000) ==='
PAY_RESP=$(curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":50000,\"toUserId\":\"$MARIA_ID\"}")
echo "$PAY_RESP" | python3 -m json.tool 2>/dev/null || echo "$PAY_RESP"

echo ""
echo "=== Caso 2: Amount inválido (amount=0) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":0,\"toUserId\":\"$MARIA_ID\"}")
echo "Esperado: 400 | Obtenido: $HTTP_CODE"

echo ""
echo "=== Caso 3: Pago a sí mismo ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":100,\"toUserId\":\"$JUAN_ID\"}")
echo "Esperado: 400 | Obtenido: $HTTP_CODE"

echo ""
echo "=== Caso 4: Usuario sin pareja intenta pagar ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SOLO" \
  -d "{\"amount\":100,\"toUserId\":\"00000000-0000-0000-0000-000000000000\"}")
echo "Esperado: 400 | Obtenido: $HTTP_CODE"

echo ""
echo "=== Caso 5: Usuario externo (pedro@test.com no existe) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":100,\"toUserId\":\"00000000-0000-0000-0000-000000000000\"}")
echo "Esperado: 404 | Obtenido: $HTTP_CODE"

# ── Crear segunda pareja para tests de aislamiento ──
echo ""
echo "=== Setup: Pareja B (Pedro + Ana) ==="
TOKEN_PEDRO=$(get_token "Pedro" "pedro@test.com" "123456")
TOKEN_ANA=$(get_token "Ana" "ana@test.com" "123456")

COUPLE_B=$(curl -s -X POST "$API/couples" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PEDRO")
INVITE_B=$(echo "$COUPLE_B" | sed -n 's/.*"inviteCode":"\([^"]*\)".*/\1/p')
echo "Pedro creó pareja B. Invite: $INVITE_B"

curl -s -X POST "$API/couples/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ANA" \
  -d "{\"inviteCode\":\"$INVITE_B\"}" > /dev/null
echo "Ana se unió ✓"

# Get Pedro ID for isolation tests
PEDRO_PROFILE=$(curl -s -X GET "$API/auth/profile" \
  -H "Authorization: Bearer $TOKEN_PEDRO")
PEDRO_ID=$(echo "$PEDRO_PROFILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== Caso 6: Historial vacío (pareja nueva, sin pagos) ==="
curl -s -X GET "$API/payments" \
  -H "Authorization: Bearer $TOKEN_PEDRO"

echo ""
echo "=== Caso 7: Múltiples pagos + orden DESC ==="
# Crear 3 pagos: Juan → Maria (distintos montos para identificar orden)
curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":1000,\"toUserId\":\"$MARIA_ID\"}" > /dev/null
echo "Pago 1000 ✓"

sleep 1

curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JUAN" \
  -d "{\"amount\":2000,\"toUserId\":\"$MARIA_ID\"}" > /dev/null
echo "Pago 2000 ✓"

sleep 1

curl -s -X POST "$API/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_MARIA" \
  -d "{\"amount\":3000,\"toUserId\":\"$JUAN_ID\"}" > /dev/null
echo "Pago 3000 (Maria → Juan) ✓"

echo ""
echo "Historial completo (debe ir DESC por createdAt):"
curl -s -X GET "$API/payments" \
  -H "Authorization: Bearer $TOKEN_JUAN" | python3 -m json.tool

echo ""
echo "=== Caso 8: Aislamiento entre parejas ==="
echo "Pedro NO debe ver pagos de Juan:"
curl -s -X GET "$API/payments" \
  -H "Authorization: Bearer $TOKEN_PEDRO"

echo ""
echo "=== ✅ Pruebas completadas ==="
