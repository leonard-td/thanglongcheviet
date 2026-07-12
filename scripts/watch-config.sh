#!/bin/bash
# Watches config files that the running dev containers can NOT hot-reload on
# their own, and re-applies them automatically:
#
#   - infra/docker-compose.yml : only `docker compose up -d` re-reads this and
#     recreates whichever service's effective config actually changed.
#   - apps/backend/medusa-config.ts : read once at process start by
#     `medusa develop`, outside the src/ tree its file watcher covers, so a
#     plain code-reload never picks it up — the backend process itself needs
#     restarting.
#
# Polls (not inotify) because the project lives on a Windows drive mounted
# into WSL over 9p, which doesn't reliably deliver inotify events for edits
# made from the Windows side (see docker-compose.yml's top comment / the
# CHOKIDAR_USEPOLLING settings it sets on the containers for the same reason).
set -u

# Must match start.dev.sh's env file exactly — a different file here would
# silently recreate containers with different env on every config change.
COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env.dev"
COMPOSE_FILE="infra/docker-compose.yml"
MEDUSA_CONFIG="apps/backend/medusa-config.ts"

mtime() { stat -c %Y "$1" 2>/dev/null || echo 0; }

compose_mtime=$(mtime "$COMPOSE_FILE")
medusa_config_mtime=$(mtime "$MEDUSA_CONFIG")
# Debounce flags: a file that just changed is marked "pending" instead of
# acted on immediately. The action only fires once its mtime has been
# unchanged for a full poll interval (i.e. edits settled) — an editor/agent
# saving several times within a couple seconds (e.g. a few quick fixes to
# medusa-config.ts in a row) previously fired `restart backend` /
# `up -d` once per save. Each restart cuts off the backend's own ~90s boot
# sequence (migrations/seed scripts/vite) mid-flight, and if that keeps
# happening the container never finishes booting, its healthcheck never
# passes, and nginx (which waits on that healthcheck) can get stuck in a
# half-started state — which looks like the admin page endlessly
# reloading. Coalescing rapid bursts into one restart avoids that.
compose_pending=0
medusa_pending=0

while true; do
  sleep 2

  new_compose_mtime=$(mtime "$COMPOSE_FILE")
  if [ "$new_compose_mtime" != "$compose_mtime" ]; then
    compose_mtime="$new_compose_mtime"
    compose_pending=1
  elif [ "$compose_pending" = "1" ]; then
    compose_pending=0
    echo "[watch-config] docker-compose.yml changed -> \$COMPOSE up -d"
    $COMPOSE up -d
  fi

  new_medusa_config_mtime=$(mtime "$MEDUSA_CONFIG")
  if [ "$new_medusa_config_mtime" != "$medusa_config_mtime" ]; then
    medusa_config_mtime="$new_medusa_config_mtime"
    medusa_pending=1
  elif [ "$medusa_pending" = "1" ]; then
    medusa_pending=0
    echo "[watch-config] medusa-config.ts changed -> restarting backend"
    $COMPOSE restart backend
  fi
done
