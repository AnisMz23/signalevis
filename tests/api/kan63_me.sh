#!/usr/bin/env bash
# KAN-63 — GET /v1/me : accès refusé sans jeton valide, méthode, contrat.
# Le contenu (super admin, membre, citoyen, faux claims) est testé en SQL :
# supabase/tests/database/kan63_me.sql.
# Usage : tests/api/kan63_me.sh staging|prod
set -euo pipefail

case "${1:-staging}" in
  staging) BASE="https://sxwdmeprtrkvxjhqeqmx.supabase.co/functions/v1/v1" ;;
  prod)    BASE="https://orkjzimjypavjqztafzl.supabase.co/functions/v1/v1" ;;
  *) echo "Environnement inconnu : $1" >&2; exit 2 ;;
esac

fail() { echo "KAN-63 échec : $*" >&2; exit 1; }
code() { curl -sS -o /dev/null -w '%{http_code}' "$@"; }

[ "$(code "$BASE/me")" = 401 ] || fail "/me sans jeton ≠ 401"
[ "$(code -H 'Authorization: Bearer jeton-invalide' "$BASE/me")" = 401 ] || fail "/me jeton invalide ≠ 401"
[ "$(code -X POST -H 'Authorization: Bearer x' "$BASE/me")" = 405 ] || fail "POST /me ≠ 405"
curl -sS "$BASE/health" | grep -q '"version":"0.4.0"' || fail "version API ≠ 0.4.0"

echo "KAN-63 OK ($1) — /me refusé sans jeton valide, méthode contrôlée, API 0.4.0"
