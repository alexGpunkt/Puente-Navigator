#!/usr/bin/env bash
set -euo pipefail
if [ ! -f .gitignore ] || ! grep -qxF '_site/' .gitignore; then
  printf '\n_site/\n' >> .gitignore
fi
git rm -r --cached --ignore-unmatch _site >/dev/null 2>&1 || true
echo 'Build directory _site is now ignored and will not be committed.'
