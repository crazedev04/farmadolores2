#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  "MYAPP_RELEASE_STORE_FILE"
  "MYAPP_RELEASE_STORE_PASSWORD"
  "MYAPP_RELEASE_KEY_ALIAS"
  "MYAPP_RELEASE_KEY_PASSWORD"
)

missing=()
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    missing+=("${var_name}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Faltan variables de firma Android:"
  for item in "${missing[@]}"; do
    echo " - ${item}"
  done
  echo
  echo "Definilas en tu shell/CI como ORG_GRADLE_PROJECT_<nombre> o en ~/.gradle/gradle.properties."
  exit 1
fi

store_file="${MYAPP_RELEASE_STORE_FILE}"
if [[ ! -f "${store_file}" ]]; then
  echo "No existe el keystore en la ruta indicada:"
  echo " - MYAPP_RELEASE_STORE_FILE=${store_file}"
  exit 1
fi

echo "OK: variables de firma cargadas y keystore disponible."
