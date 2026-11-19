#!/bin/sh
# Keeps /repo in sync with GitHub and tells the app to refresh when content changes.
# Runs in the `puller` service (alpine/git). Env: REPO_URL, BRANCH, INTERVAL, REVALIDATE_SECRET, APP_URL.
BRANCH="${BRANCH:-main}"; INTERVAL="${INTERVAL:-3600}"; APP_URL="${APP_URL:-http://app:3000}"
log() { echo "[puller $(date -u +%FT%TZ)] $*"; }

revalidate() {
  for i in 1 2 3 4 5 6; do
    if wget -q -O - --post-data= --header "x-revalidate-secret: $REVALIDATE_SECRET" "$APP_URL/api/revalidate" >/dev/null 2>&1; then
      log "revalidated app"; return 0
    fi
    sleep 10
  done
  log "WARN: could not reach $APP_URL/api/revalidate (pages refresh within 1h anyway)"
}

[ -n "$REPO_URL" ] || { log "REPO_URL is not set"; while :; do sleep 3600; done; }
git config --global --add safe.directory /repo

until [ -d /repo/.git ]; do
  log "cloning $REPO_URL ($BRANCH)"
  # The volume may already hold leftovers; clone into a temp dir and move it in.
  rm -rf /tmp/clone && git clone -q --depth 1 --branch "$BRANCH" "$REPO_URL" /tmp/clone \
    && find /repo -mindepth 1 -delete && cp -a /tmp/clone/. /repo/ && rm -rf /tmp/clone \
    || { log "clone failed, retrying in 60s"; sleep 60; }
done
cd /repo || exit 1
revalidate # a freshly started app should never serve content baked in at build time

while :; do
  sleep "$INTERVAL"
  if ! git fetch -q --depth 1 origin "$BRANCH"; then log "fetch failed, keeping current content"; continue; fi
  [ "$(git rev-parse HEAD)" = "$(git rev-parse FETCH_HEAD)" ] && continue
  outside=$(git diff --name-only HEAD FETCH_HEAD 2>/dev/null | grep -v '^content/' || true)
  git reset -q --hard FETCH_HEAD && git clean -qfd
  log "updated to $(git log -1 --format='%h %s')"
  [ -n "$outside" ] && log "NOTE: code changed outside content/, rebuild needed: git pull && docker compose up -d --build"
  revalidate
done
