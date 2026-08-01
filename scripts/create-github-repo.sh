#!/usr/bin/env bash
# Create the GitHub repository for Callimachus and push the initial commit.
#
# Callimachus is published as a public open-source TEMPLATE. No secrets
# are committed; every credential lives in env vars (see SETUP.md and
# PRIVATE.md). This script only handles the GitHub side of the launch.
#
# Requires:
#   - gh CLI installed and authenticated (gh auth login)
#   - repo name     (override via REPO env var; default: callimachus)
#   - visibility    (override via VISIBLE env var; default: public)
#
# Usage:
#   scripts/create-github-repo.sh
#   REPO=callimachus VISIBLE=public scripts/create-github-repo.sh

set -euo pipefail

REPO="${REPO:-callimachus}"
VISIBLE="${VISIBLE:-public}"
DESCRIPTION="Callimachus — clean-room Bangladeshi HSC study tracker PWA template."

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
echo "Done. Recommended next steps:"
echo
echo "  1. Set branch protection on 'main':"
echo "     gh api -X PUT repos/:owner/$REPO/branches/main/protection \\"
echo "       -H 'Accept: application/vnd.github+json' \\"
echo "       -f required_status_checks='{\"strict\":true,\"contexts\":[\"build-test\"]}' \\"
echo "       -f enforce_admins=true \\"
echo "       -f required_pull_request_reviews='{\"required_approving_review_count\":1}'"
echo
echo "  2. Add GitHub Actions secrets used by .github/workflows/ci.yml"
echo "     (VITE_FIREBASE_*, LHCI_GITHUB_APP_TOKEN)."
echo
echo "  3. Enable repo topics: pwa firebase typescript vite education."
