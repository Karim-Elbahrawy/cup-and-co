#!/usr/bin/env bash
# Cup & Co — GitHub setup script.
# Run once after cloning. Authenticates `gh`, creates the remote repo, and pushes main.
#
# Usage:
#   ./scripts/setup-github.sh                 # creates Karim-Elbahrawy/cup-and-co (private)
#   ./scripts/setup-github.sh public          # creates as public
#   REPO_NAME=my-name ./scripts/setup-github.sh
set -euo pipefail

REPO_NAME="${REPO_NAME:-cup-and-co}"
VISIBILITY="${1:-private}"
GH="/c/Program Files/GitHub CLI/gh.exe"
[[ -x "$GH" ]] || GH="gh"

echo ">> Cup & Co GitHub setup"
echo ">> Repo:       $REPO_NAME ($VISIBILITY)"
echo

if ! "$GH" auth status >/dev/null 2>&1; then
  echo ">> You're not signed in to GitHub CLI. Starting device-code login..."
  "$GH" auth login --web --hostname github.com --git-protocol https
fi

OWNER=$("$GH" api user --jq .login)
echo ">> Authed as: $OWNER"

if "$GH" repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo ">> Repo $OWNER/$REPO_NAME already exists. Linking remote..."
else
  echo ">> Creating repo $OWNER/$REPO_NAME..."
  "$GH" repo create "$OWNER/$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --description="Cup & Co — campus coffee kiosk app (iOS + web + admin + API)"
fi

# Make sure the remote exists
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
fi

echo ">> Pushing main..."
git push -u origin main

echo
echo ">> Done. Repo: https://github.com/$OWNER/$REPO_NAME"
