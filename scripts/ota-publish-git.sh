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
BRANCH="${OTA_GIT_BRANCH:-ota-production}"
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
  echo "Configuring OTA repository ($BRANCH)..."
  if git ls-remote --exit-code --heads "$REPO" "$BRANCH" >/dev/null 2>&1; then
    echo "Branch exists remotely. Cloning only this branch..."
    git clone --branch "$BRANCH" --single-branch "$REPO" "$TEMP_DIR"
  else
    echo "Creating new orphan branch: $BRANCH"
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    git init
    git checkout --orphan "$BRANCH"
    git remote add origin "$REPO"
  fi
else
  echo "Updating local repository..."
  git -C "$TEMP_DIR" fetch origin || true
  git -C "$TEMP_DIR" checkout "$BRANCH" 2>/dev/null || git -C "$TEMP_DIR" checkout -b "$BRANCH"
  if git ls-remote --exit-code --heads "$REPO" "$BRANCH" >/dev/null 2>&1; then
    git -C "$TEMP_DIR" reset --hard "origin/$BRANCH"
  fi
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
