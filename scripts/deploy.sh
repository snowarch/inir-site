#!/usr/bin/env bash
# Builds the site and publishes dist/ to the gh-pages branch, which GitHub Pages serves.
# CI does the same on every push; this is for publishing from a local checkout.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_BASE="${SITE_BASE:-/inir-site/}" npm run build
touch dist/.nojekyll
remote="$(git remote get-url origin)"
name="$(git config user.name)"; email="$(git config user.email)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp -r dist/. "$work"
cd "$work"
git init -q -b gh-pages
git add -A
git -c user.name="$name" -c user.email="$email" commit -q -m "build: publish site"
git push -q -f "$remote" gh-pages
echo "Published to gh-pages."
