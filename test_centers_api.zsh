#!/usr/bin/env zsh
set -euo pipefail

# Evita que zsh interprete '!' del token como history expansion
set +H

# ==== Config ====
API_BASE="https://o4ouasjufi.execute-api.eu-west-1.amazonaws.com/prod/t1d-centers-proxy"
ORIGIN="https://t1d-centers-app.org"
ADMIN_TOKEN='S3cret-Token-2025!'

# Curl helper
req() {
  local METHOD="$1"
  local PATH="$2"
  local DATA="${3:-}"
  echo
  echo "===> $METHOD $API_BASE$PATH"
  if [[ -n "$DATA" ]]; then
    echo "-- payload --"
    echo "$DATA"
  fi
  if [[ -n "$DATA" ]]; then
    curl -sS -i \
      -H "Origin: $ORIGIN" \
      -H "Content-Type: application/json" \
      -X "$METHOD" \
      --data "$DATA" \
      "$API_BASE$PATH"
  else
    curl -sS -i \
      -H "Origin: $ORIGIN" \
      -X "$METHOD" \
      "$API_BASE$PATH"
  fi
  echo
  echo
}

# Curl helper con header de admin
admin_req() {
  local METHOD="$1"
  local PATH="$2"
  local DATA="${3:-}"
  echo
  echo "===> [ADMIN] $METHOD $API_BASE$PATH"
  if [[ -n "$DATA" ]]; then
    echo "-- payload --"
    echo "$DATA"
  fi
  if [[ -n "$DATA" ]]; then
    curl -sS -i \
      -H "Origin: $ORIGIN" \
      -H "X-Admin-Token: $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -X "$METHOD" \
      --data "$DATA" \
      "$API_BASE$PATH"
  else
    curl -sS -i \
      -H "Origin: $ORIGIN" \
      -H "X-Admin-Token: $ADMIN_TOKEN" \
      -X "$METHOD" \
      "$API_BASE$PATH"
  fi
  echo
  echo
}

echo "### 0) Health check"
req GET "/health"

echo "### 1) Migración: add-geo-columns (segura, no borra datos)"
admin_req POST "/admin/add-geo-columns"

echo "### 2) Inserta un centro (Madrid)"
CREATE_BODY='{
  "name": "Centro Clínico Madrid",
  "address": "Calle Mayor 1",
  "city": "Madrid",
  "country": "Spain",
  "zip_code": "28013",
  "contact_name_1": "Dr. Juan Pérez",
  "email_1": "juanperez@example.com",
  "phone_1": "+34 600 123 456"
}'
CREATE_RESP=$(curl -sS \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  -X POST \
  --data "$CREATE_BODY" \
  "$API_BASE/centers")
echo
echo "HTTP/JSON:"
echo "$CREATE_RESP"
echo

# Extrae id (jq si existe, si no fallback)
CENTER_ID=""
if command -v jq >/dev/null 2>&1; then
  CENTER_ID=$(echo "$CREATE_RESP" | jq -r '.id // .success // empty')
  # Si la respuesta es {success:true,id:...}, jq -r '.id' funciona
  CENTER_ID=$(echo "$CREATE_RESP" | jq -r '.id // empty')
else
  CENTER_ID=$(echo "$CREATE_RESP" | sed -n 's/.*"id":[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)
fi

if [[ -z "${CENTER_ID:-}" ]]; then
  echo "No pude extraer el ID del centro creado. Continuo listando, pero no puedo actualizar."
else
  echo "ID insertado: $CENTER_ID"
fi

echo
echo "### 3) Listar centros"
req GET "/centers"

if [[ -n "${CENTER_ID:-}" ]]; then
  echo "### 4) Actualizar el centro $CENTER_ID (cambia city/zip_code)"
  UPDATE_BODY='{"city":"Barcelona","zip_code":"08001","country":"Spain"}'
  req PUT "/centers/$CENTER_ID" "$UPDATE_BODY"

  echo "### 5) Volver a listar centros"
  req GET "/centers"
fi

echo "### DONE"
