#!/usr/bin/env bash
# DuoBalance — Groups Integration Test Script
# Idempotent: cada ejecución crea usuarios únicos (timestamp).
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
    -d "{\"firstName\":\"$name\",\"lastName\":\"Apellido\",\"email\":\"$email\",\"password\":\"123456\"}" > /dev/null

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
  python3 -m json.tool 2>/dev/null || cat
}

# ── Setup ────────────────────────────────────────────

echo "============================================"
echo "          GROUPS INTEGRATION TEST"
echo "          Run: ${TS}"
echo "============================================"

echo ""
echo "=== 1. Crear usuarios ==="
TOKEN_USER1=$(setup_user "Carlos")
TOKEN_USER2=$(setup_user "Ana")
echo "User1 token: ${TOKEN_USER1:0:20}..."
echo "User2 token: ${TOKEN_USER2:0:20}..."

USER1_ID=$(get_id "$TOKEN_USER1")
USER2_ID=$(get_id "$TOKEN_USER2")
echo "User1 ID: $USER1_ID"
echo "User2 ID: $USER2_ID"

# ── 2. User1 crea un grupo PERSONAL ──────────────────

echo ""
echo "=== 2. User1 crea grupo PERSONAL ==="
PERSONAL_RESP=$(curl -s -X POST "$API/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -d '{"name":"Mi Grupo Personal","type":"PERSONAL"}')
echo "$PERSONAL_RESP" | pretty

PERSONAL_ID=$(jq -r '.id' <<< "$PERSONAL_RESP")
PERSONAL_TYPE=$(jq -r '.type' <<< "$PERSONAL_RESP")
PERSONAL_OWNER=$(jq -r '.members[0].role' <<< "$PERSONAL_RESP")
PERSONAL_NAME=$(jq -r '.name' <<< "$PERSONAL_RESP")

echo ""
echo "Resultado:"
echo "  Nombre: $PERSONAL_NAME"
echo "  Tipo:   $PERSONAL_TYPE"
echo "  Owner:  $PERSONAL_OWNER"
echo "  ID:     $PERSONAL_ID"

[ "$PERSONAL_TYPE" = "PERSONAL" ] && [ "$PERSONAL_OWNER" = "OWNER" ] \
  && echo "  ✅ PERSONAL group created with OWNER role" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 3. User1 crea un grupo COUPLE ─────────────────────

echo ""
echo "=== 3. User1 crea grupo COUPLE ==="
COUPLE_RESP=$(curl -s -X POST "$API/groups" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_USER1" \
  -d '{"name":"Pareja Carlos & Ana","type":"COUPLE"}')
echo "$COUPLE_RESP" | pretty

COUPLE_ID=$(jq -r '.id' <<< "$COUPLE_RESP")
COUPLE_TYPE=$(jq -r '.type' <<< "$COUPLE_RESP")
COUPLE_INVITE=$(jq -r '.inviteCode' <<< "$COUPLE_RESP")
COUPLE_OWNER=$(jq -r '.members[0].role' <<< "$COUPLE_RESP")

echo ""
echo "Resultado:"
echo "  Nombre:    $(jq -r '.name' <<< "$COUPLE_RESP")"
echo "  Tipo:      $COUPLE_TYPE"
echo "  Owner:     $COUPLE_OWNER"
echo "  Invite:    $COUPLE_INVITE"
echo "  ID:        $COUPLE_ID"

[ "$COUPLE_TYPE" = "COUPLE" ] && [ "$COUPLE_OWNER" = "OWNER" ] \
  && echo "  ✅ COUPLE group created with OWNER role" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 4. User2 se une al COUPLE group ────────────────────

echo ""
echo "=== 4. User2 se une al COUPLE group ==="
JOIN_RESP=$(curl -s -X POST "$API/groups/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -d "{\"inviteCode\":\"$COUPLE_INVITE\"}")
echo "$JOIN_RESP" | pretty

JOINED_MEMBERS=$(jq '.members | length' <<< "$JOIN_RESP")
USER2_ROLE=$(jq -r '.members[] | select(.user.id == "'"$USER2_ID"'") | .role' <<< "$JOIN_RESP")

echo ""
echo "Resultado:"
echo "  Miembros totales: $JOINED_MEMBERS"
echo "  User2 role:       $USER2_ROLE"

[ "$JOINED_MEMBERS" = "2" ] && [ "$USER2_ROLE" = "ADMIN" ] \
  && echo "  ✅ User2 joined as ADMIN (second member of COUPLE)" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 5. User2 intenta unirse al PERSONAL (debe fallar) ──

echo ""
echo "=== 5. User2 intenta unirse al grupo PERSONAL (debe fallar) ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/groups/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_USER2" \
  -d "{\"inviteCode\":\"$(jq -r '.inviteCode' <<< "$PERSONAL_RESP")\"}")
echo "HTTP $HTTP_CODE (esperado: 400)"
[ "$HTTP_CODE" = "400" ] \
  && echo "  ✅ PERSONAL group rejected join attempt" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 6. Listar grupos de User1 ──────────────────────────

echo ""
echo "=== 6. Groups de User1 (debe ver PERSONAL + COUPLE) ==="
GROUPS_U1=$(curl -s -X GET "$API/groups" \
  -H "Authorization: Bearer $TOKEN_USER1")
echo "$GROUPS_U1" | pretty

U1_COUNT=$(jq 'length' <<< "$GROUPS_U1")
echo "User1 ve $U1_COUNT grupos (esperado: 2)"

[ "$U1_COUNT" = "2" ] \
  && echo "  ✅ User1 sees both groups" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 7. Listar grupos de User2 ──────────────────────────

echo ""
echo "=== 7. Groups de User2 (debe ver solo COUPLE) ==="
GROUPS_U2=$(curl -s -X GET "$API/groups" \
  -H "Authorization: Bearer $TOKEN_USER2")
echo "$GROUPS_U2" | pretty

U2_COUNT=$(jq 'length' <<< "$GROUPS_U2")
U2_GROUP_TYPE=$(jq -r '.[0].type' <<< "$GROUPS_U2")

echo "User2 ve $U2_COUNT grupos, type=$U2_GROUP_TYPE (esperado: 1, COUPLE)"
[ "$U2_COUNT" = "1" ] && [ "$U2_GROUP_TYPE" = "COUPLE" ] \
  && echo "  ✅ User2 sees only COUPLE group" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 8. Obtener grupo COUPLE por ID ─────────────────────

echo ""
echo "=== 8. Get COUPLE group by ID ==="
GROUP_DETAIL=$(curl -s -X GET "$API/groups/$COUPLE_ID" \
  -H "Authorization: Bearer $TOKEN_USER1")
echo "$GROUP_DETAIL" | pretty

MEMBER_IDS=$(jq -r '.members[].user.id' <<< "$GROUP_DETAIL" | tr '\n' ' ')
MEMBER_ROLES=$(jq -r '.members[].role' <<< "$GROUP_DETAIL" | tr '\n' ' ')

echo "Member IDs:   $MEMBER_IDS"
echo "Member roles: $MEMBER_ROLES"

HAS_USER1=$(jq -r '.members[] | select(.user.id == "'"$USER1_ID"'") | .role' <<< "$GROUP_DETAIL")
HAS_USER2=$(jq -r '.members[] | select(.user.id == "'"$USER2_ID"'") | .role' <<< "$GROUP_DETAIL")
echo "User1 role: $HAS_USER1 (esperado: OWNER)"
echo "User2 role: $HAS_USER2 (esperado: ADMIN)"

[ "$HAS_USER1" = "OWNER" ] && [ "$HAS_USER2" = "ADMIN" ] \
  && echo "  ✅ Group detail shows correct members and roles" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 9. User1 sale del COUPLE group ─────────────────────

echo ""
echo "=== 9. User1 sale del COUPLE group ==="
LEAVE_RESP=$(curl -s -X DELETE "$API/groups/$COUPLE_ID/leave" \
  -H "Authorization: Bearer $TOKEN_USER1")
echo "$LEAVE_RESP" | pretty

LEAVE_MSG=$(jq -r '.message' <<< "$LEAVE_RESP")
echo "Message: $LEAVE_MSG (esperado: Left group successfully)"
[ "$LEAVE_MSG" = "Left group successfully" ] \
  && echo "  ✅ User1 left COUPLE group" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 10. User2 ve que solo tiene el COUPLE (todavía existe) ──

echo ""
echo "=== 10. User2 ve sus grupos (COUPLE aun existe) ==="
GROUPS_U2=$(curl -s -X GET "$API/groups" \
  -H "Authorization: Bearer $TOKEN_USER2")
U2_COUNT=$(jq 'length' <<< "$GROUPS_U2")
echo "User2 ve $U2_COUNT grupos (esperado: 1 — COUPLE aun existe)"
[ "$U2_COUNT" = "1" ] \
  && echo "  ✅ COUPLE group still exists (User2 is still member)" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 11. User2 sale del grupo (debe eliminarlo) ─────────

echo ""
echo "=== 11. User2 sale del COUPLE group (ultimo miembro) ==="
LEAVE_RESP=$(curl -s -X DELETE "$API/groups/$COUPLE_ID/leave" \
  -H "Authorization: Bearer $TOKEN_USER2")
echo "$LEAVE_RESP" | pretty

LEAVE_MSG=$(jq -r '.message' <<< "$LEAVE_RESP")
echo "Message: $LEAVE_MSG (esperado: Group deleted)"
[ "$LEAVE_MSG" = "Group deleted" ] \
  && echo "  ✅ Group auto-deleted when last member left" \
  || { echo "  ❌ FAIL"; exit 1; }

# ── 12. Verificar que User1 aun tiene su PERSONAL ──────

echo ""
echo "=== 12. User1 aun tiene su grupo PERSONAL ==="
GROUPS_U1=$(curl -s -X GET "$API/groups" \
  -H "Authorization: Bearer $TOKEN_USER1")
U1_GROUPS=$(jq 'length' <<< "$GROUPS_U1")
U1_NAMES=$(jq -r '.[].type' <<< "$GROUPS_U1" | tr '\n' ' ')

echo "User1 tiene $U1_GROUPS grupos, types: $U1_NAMES"
echo "Esperado: 1, 'PERSONAL'"
[ "$U1_GROUPS" = "1" ] && [[ "$U1_NAMES" == *"PERSONAL"* ]] \
  && echo "  ✅ Personal group preserved" \
  || { echo "  ❌ FAIL"; exit 1; }

# ═════════════════════════════════════════════════════
echo ""
echo "============================================"
echo "  ✅ TODOS LOS TESTS PASARON (run ${TS})"
echo "============================================"
