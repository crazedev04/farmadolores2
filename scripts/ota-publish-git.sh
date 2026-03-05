#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'USAGE'
Usage: yarn ota:git
Optional env vars:
  OTA_GIT_REPO
  OTA_GIT_BRANCH
  OTA_GIT_BUNDLE_PATH
  OTA_GIT_ASSETS_PATH
  OTA_GIT_TEMP_DIR
  OTA_GIT_COMMIT_MESSAGE
USAGE
  exit 0
fi

REPO="${OTA_GIT_REPO:-https://github.com/crazedev04/farmadolores.git}"
BRANCH="${OTA_GIT_BRANCH:-main}"
BUNDLE_PATH="${OTA_GIT_BUNDLE_PATH:-ota/android/main.jsbundle}"
ASSETS_PATH="${OTA_GIT_ASSETS_PATH:-ota/android}"
TEMP_DIR="${OTA_GIT_TEMP_DIR:-${TMPDIR:-/tmp}/farmadolores_ota_public}"
COMMIT_MESSAGE="${OTA_GIT_COMMIT_MESSAGE:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$COMMIT_MESSAGE" ]; then
  COMMIT_MESSAGE="ota(android): update $(date '+%Y-%m-%d %H:%M')"
fi

echo "Using temp repo: $TEMP_DIR"

if [ ! -d "$TEMP_DIR/.git" ]; then
  if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
  echo "Cloning public repo..."
  git clone --branch "$BRANCH" "$REPO" "$TEMP_DIR"
else
  echo "Updating public repo..."
  git -C "$TEMP_DIR" fetch origin
  git -C "$TEMP_DIR" checkout "$BRANCH"
  git -C "$TEMP_DIR" reset --hard "origin/$BRANCH"
  git -C "$TEMP_DIR" clean -fd
fi

BUNDLE_OUTPUT="$TEMP_DIR/$BUNDLE_PATH"
ASSETS_OUTPUT="$TEMP_DIR/$ASSETS_PATH"
BUNDLE_DIR="$(dirname "$BUNDLE_OUTPUT")"

if [ -d "$BUNDLE_DIR" ]; then
  rm -rf "$BUNDLE_DIR"
fi
mkdir -p "$BUNDLE_DIR" "$ASSETS_OUTPUT"

echo "Generating bundle..."
(
  cd "$ROOT_DIR"
  npx react-native bundle \
    --platform android \
    --dev false \
    --entry-file index.js \
    --bundle-output "$BUNDLE_OUTPUT" \
    --assets-dest "$ASSETS_OUTPUT"
)

echo "Staging changes..."
git -C "$TEMP_DIR" add "$(dirname "$BUNDLE_PATH")"
git -C "$TEMP_DIR" add -f "$BUNDLE_PATH"

if [ -z "$(git -C "$TEMP_DIR" status --porcelain)" ]; then
  echo "No changes to push."
  exit 0
fi

USER_EMAIL="$(git -C "$TEMP_DIR" config --get user.email || true)"
if [ -z "$USER_EMAIL" ]; then
  git -C "$TEMP_DIR" config user.email "ota-bot@local"
fi
USER_NAME="$(git -C "$TEMP_DIR" config --get user.name || true)"
if [ -z "$USER_NAME" ]; then
  git -C "$TEMP_DIR" config user.name "OTA Bot"
fi

git -C "$TEMP_DIR" commit -m "$COMMIT_MESSAGE"
git -C "$TEMP_DIR" push origin "$BRANCH"

echo "Done! Published to $REPO ($BRANCH)"
