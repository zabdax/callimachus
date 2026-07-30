#!/usr/bin/env bash
# Create the GitHub repository for HSC Crackers and push the initial commit.
#
# Requires:
#   - gh CLI installed and authenticated (gh auth login)
#   - repo name (override via REPO env var; default: hsc-crackers)
#   - visibility (override via VISIBLE env var; default: private)
#
# Usage:
#   scripts/create-github-repo.sh
#   REPO=hsc-crackers VISIBLE=public scripts/create-github-repo.sh

set -euo pipefail

REPO="${REPO:-hsc-crackers}"
VISIBLE="${VISIBLE:-private}"
DESCRIPTION="HSC Crackers — Bangladeshi HSC study tracker PWA (clean-room re-implementation)."

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: 'gh' CLI is not installed." >&2
  echo "Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: 'gh' is not authenticated. Run: gh auth login" >&2
  exit 1
fi

echo "Creating repo: $REPO (visibility: $VISIBLE)"
gh repo create "$REPO" --"$VISIBLE" --description "$DESCRIPTION" --source=. --remote=origin --push

echo
echo "Done. Set default branch protection next:"
echo "  gh api -X PUT repos/:owner/$REPO/branches/main/protection \\"
echo "    -H 'Accept: application/vnd.github+json' \\"
echo "    -f required_status_checks='{\"strict\":true,\"contexts\":[\"build-test\"]}' \\"
echo "    -f enforce_admins=true \\"
echo "    -f required_pull_request_reviews='{\"required_approving_review_count\":1}'"
