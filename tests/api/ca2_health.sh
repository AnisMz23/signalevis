#!/usr/bin/env bash
# KAN-42 CA2 — vérifie GET /v1/health contre le contrat docs/api/openapi.yaml.
# Usage : tests/api/ca2_health.sh staging|prod
set -euo pipefail

case "${1:-staging}" in
  staging) BASE="https://sxwdmeprtrkvxjhqeqmx.supabase.co/functions/v1/v1" ;;
  prod)    BASE="https://orkjzimjypavjqztafzl.supabase.co/functions/v1/v1" ;;
  *) echo "Environnement inconnu : $1" >&2; exit 2 ;;
esac

fail() { echo "CA2 échec : $*" >&2; exit 1; }

body=$(curl -sS -w '\n%{http_code}' "$BASE/health")
code=$(tail -n1 <<<"$body"); json=$(sed '$d' <<<"$body")

[ "$code" = 200 ] || fail "statut HTTP $code (attendu 200) — $json"
for key in status version postgres postgis; do
  node -e "const j=JSON.parse(process.argv[1]); if(!j['$key']) process.exit(1)" "$json" \
    || fail "champ « $key » absent — $json"
done
node -e "const j=JSON.parse(process.argv[1]); if(j.status!=='ok'||!j.postgres.startsWith('17')) process.exit(1)" "$json" \
  || fail "contenu inattendu — $json"

code404=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/inexistant")
[ "$code404" = 404 ] || fail "route inconnue renvoie $code404 (attendu 404)"

code405=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/health")
[ "$code405" = 405 ] || fail "POST /health renvoie $code405 (attendu 405)"

echo "CA2 OK ($1) — $json"
