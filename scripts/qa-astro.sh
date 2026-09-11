#!/usr/bin/env bash
# Local smoke checks for Astro + Sanity site (filesystem or Sanity content).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0
ok() {
  local name="$1"
  shift
  if eval "$@"; then
    echo "OK $name"
  else
    echo "FAIL $name"
    fail=1
  fi
}

echo "== Building =="
export USE_FS_CONTENT="${USE_FS_CONTENT:-0}"
export PUBLIC_SANITY_PROJECT_ID="${PUBLIC_SANITY_PROJECT_ID:-t6bu0f9m}"
export PUBLIC_SANITY_DATASET="${PUBLIC_SANITY_DATASET:-production}"
export ASTRO_TELEMETRY_DISABLED=1
npm run build

DIST=dist

ok "home_renders" 'test -f "$DIST/index.html"'
ok "about_renders" 'test -f "$DIST/about/index.html"'
ok "no_clarity" '! grep -q "clarity\\.ms" "$DIST/index.html"'
ok "no_consent_banner" '! grep -Eq "rbe-consent|consent-banner" "$DIST/index.html"'
ok "site_js" 'grep -q "/js/site.js" "$DIST/index.html"'
ok "robots_disallow_admin" 'grep -q "Disallow: /admin/" "$DIST/robots.txt"'
ok "css_bundled" 'grep -q "_astro/" "$DIST/index.html"'
ok "news_index" 'test -f "$DIST/news/index.html"'
ok "events_index" 'test -f "$DIST/events/index.html"'
ok "causes_index" 'test -f "$DIST/causes/index.html"'
ok "brandkit" 'test -f "$DIST/brandkit/index.html"'
ok "rss" 'test -f "$DIST/rss.xml"'
ok "pagefind" 'test -d "$DIST/pagefind"'
ok "privacy_ga_copy" 'grep -q "Google Analytics" "$DIST/privacy/index.html"'
ok "studio_route" 'test -f "$DIST/admin/index.html"'
ok "no_decap_config" '! test -f "$DIST/admin/config.yml"'
ok "indexnow_key" 'test -f "$DIST/b689725f013d420fbf61a6c4df192c77.txt" && grep -q "b689725f013d420fbf61a6c4df192c77" "$DIST/b689725f013d420fbf61a6c4df192c77.txt"'
ok "connect_route" 'test -f "$DIST/connect/index.html"'
ok "robots_disallow_connect" 'grep -q "Disallow: /connect/" "$DIST/robots.txt"'

post_count=$(find "$DIST/news" -name index.html | wc -l | tr -d ' ')
ok "news_pages_built" "test \"$post_count\" -gt 5"
if [[ "$fail" -eq 0 ]]; then
  echo "All Astro QA checks passed."
  exit 0
fi
echo "QA failed."
exit 1
