#!/usr/bin/env bash
# KAN-51 — routes super admin de l'API /v1 : contrôle d'accès et validation (contrat OpenAPI).
# Les règles métier (création, invitation, suspension, audit) sont testées en SQL :
# supabase/tests/database/kan51_organisations.sql. Un parcours réel avec un compte super admin
# nécessite le hook JWT activé (Authentication → Hooks) et un compte dans platform_admin.
# Usage : tests/api/kan51_platform.sh staging|prod
set -euo pipefail

case "${1:-staging}" in
  staging) BASE="https://sxwdmeprtrkvxjhqeqmx.supabase.co/functions/v1/v1" ;;
  prod)    BASE="https://orkjzimjypavjqztafzl.supabase.co/functions/v1/v1" ;;
  *) echo "Environnement inconnu : $1" >&2; exit 2 ;;
esac

fail() { echo "KAN-51 échec : $*" >&2; exit 1; }
code() { curl -sS -o /dev/null -w '%{http_code}' "$@"; }

[ "$(code "$BASE/platform/organizations")" = 401 ] || fail "liste sans jeton ≠ 401"
[ "$(code -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/platform/organizations")" = 401 ] \
  || fail "création sans jeton ≠ 401"
[ "$(code -H 'Authorization: Bearer jeton-invalide' "$BASE/platform/organizations")" = 401 ] \
  || fail "jeton invalide ≠ 401"
[ "$(code -X POST -H 'Authorization: Bearer x' "$BASE/platform/organizations/pas-un-uuid/status")" = 400 ] \
  || fail "identifiant invalide ≠ 400"
[ "$(code -X GET -H 'Authorization: Bearer x' "$BASE/platform/organizations/00000000-0000-0000-0000-000000000000/status")" = 405 ] \
  || fail "GET sur /status ≠ 405"
[ "$(code -H 'Authorization: Bearer x' "$BASE/platform/inconnu")" = 404 ] || fail "route inconnue ≠ 404"

echo "KAN-51 OK ($1) — accès refusé sans jeton valide, validation des entrées, routes"
