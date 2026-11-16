#!/usr/bin/env bash
# KAN-52 CA4 — vérifie GET /v1/services contre le contrat docs/api/openapi.yaml.
# La logique de filtrage (territoires, suspension, désactivation) est testée en SQL :
# supabase/tests/database/kan52_catalogue.sql. Ici : contrat HTTP et validation des entrées.
# Usage : tests/api/kan52_services.sh staging|prod
set -euo pipefail

case "${1:-staging}" in
  staging) BASE="https://sxwdmeprtrkvxjhqeqmx.supabase.co/functions/v1/v1" ;;
  prod)    BASE="https://orkjzimjypavjqztafzl.supabase.co/functions/v1/v1" ;;
  *) echo "Environnement inconnu : $1" >&2; exit 2 ;;
esac

fail() { echo "CA4 échec : $*" >&2; exit 1; }

body=$(curl -sS -w '\n%{http_code}' "$BASE/services?lat=46.75&lng=-71.15")
code=$(tail -n1 <<<"$body"); json=$(sed '$d' <<<"$body")
[ "$code" = 200 ] || fail "statut HTTP $code (attendu 200) — $json"
node -e '
  const j = JSON.parse(process.argv[1]);
  if (!Number.isInteger(j.catalog_version) || !Array.isArray(j.services)) process.exit(1);
  const req = ["code","domain","domain_label","category","label","icon","is_emergency","default_priority","recipient","recipient_is_demo"];
  for (const s of j.services) for (const k of req) if (!(k in s)) process.exit(1);
' "$json" || fail "réponse non conforme au schéma Catalog — $json"

for q in "lat=abc&lng=-71.15" "lat=46.75" "lat=95&lng=-71.15" "lat=46.75&lng=-181" "lat=1e3&lng=2"; do
  c=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/services?$q")
  [ "$c" = 400 ] || fail "« $q » renvoie $c (attendu 400)"
done

c=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$BASE/services?lat=46.75&lng=-71.15")
[ "$c" = 405 ] || fail "POST renvoie $c (attendu 405)"

n=$(node -e 'console.log(JSON.parse(process.argv[1]).services.length)' "$json")
echo "CA4 OK ($1) — catalog_version et contrat conformes ; $n service(s) à Lévis"
