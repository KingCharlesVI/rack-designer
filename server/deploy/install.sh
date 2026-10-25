#!/usr/bin/env bash
# Installs (or upgrades) the Rack Designer registry as a systemd service on Ubuntu/Debian.
# Run from a checkout of the repository:   sudo bash server/deploy/install.sh
# Re-running upgrades the server and keeps your configuration and data.
set -euo pipefail

INSTALL_DIR=/opt/rack-registry
CONFIG_DIR=/etc/rack-registry
CONFIG_FILE=$CONFIG_DIR/registry.env
SERVICE=rack-registry
SERVICE_USER=rack-registry
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo: sudo bash $0" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install it first, e.g.:" >&2
  echo "  sudo apt update && sudo apt install -y nodejs npm" >&2
  exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if (( NODE_MAJOR < 18 )); then
  echo "Node.js 18 or newer is required (found $(node -v))." >&2
  exit 1
fi
NODE_BIN=$(command -v node)

echo "==> Building the server bundle"
# Bundle into a temporary folder so the checkout isn't left with root-owned files.
BUILD_DIR=$(mktemp -d)
trap 'rm -rf "$BUILD_DIR"' EXIT
(cd "$REPO_ROOT" && npx --yes esbuild@0.28.2 server/src/main.ts --bundle --platform=node --format=esm \
   --target=node18 --outfile="$BUILD_DIR/registry-server.mjs" --legal-comments=none --log-level=warning)
BUNDLE="$BUILD_DIR/registry-server.mjs"

echo "==> Creating service user and folders"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$SERVICE_USER"
fi
install -d -m 0755 "$INSTALL_DIR"
install -m 0644 "$BUNDLE" "$INSTALL_DIR/registry-server.mjs"
install -d -m 0750 -o root -g "$SERVICE_USER" "$CONFIG_DIR"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "==> Writing $CONFIG_FILE"
  TOKEN=$(node -e 'console.log(require("crypto").randomBytes(24).toString("hex"))')
  cat >"$CONFIG_FILE" <<EOF
# Rack Designer registry settings. Restart after changes: sudo systemctl restart $SERVICE
PORT=5010
ADMIN_TOKEN=$TOKEN
REGISTRY_NAME=Homelab rack packs
AUTO_APPROVE=false
ACCEPT_SUBMISSIONS=true
SUBMIT_RATE_LIMIT=20
TRUST_PROXY=false
PUBLIC_URL=
EOF
  chown root:"$SERVICE_USER" "$CONFIG_FILE"
  chmod 0640 "$CONFIG_FILE"
  NEW_TOKEN=$TOKEN
fi

echo "==> Installing systemd service"
sed "s#^ExecStart=/usr/bin/node #ExecStart=$NODE_BIN #" "$REPO_ROOT/server/deploy/rack-registry.service" >/etc/systemd/system/$SERVICE.service
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"
sleep 1

PORT=$(grep -E '^PORT=' "$CONFIG_FILE" | cut -d= -f2 || true)
PORT=${PORT:-5010}
if systemctl is-active --quiet "$SERVICE"; then
  echo
  echo "Rack Designer registry is running on port $PORT."
  for ip in $(hostname -I 2>/dev/null); do
    [[ $ip == *:* ]] && continue
    echo "  Registry URL for the app:  http://$ip:$PORT/index.json"
    echo "  Admin console:             http://$ip:$PORT/admin"
  done
  if [[ -n "${NEW_TOKEN:-}" ]]; then
    echo
    echo "  Admin token (also in $CONFIG_FILE):"
    echo "    $NEW_TOKEN"
  fi
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    echo
    echo "  ufw is active. To allow other machines to connect, run:"
    echo "    sudo ufw allow $PORT/tcp"
  fi
  echo
  echo "  Logs: journalctl -u $SERVICE -f"
else
  echo "The service failed to start. Check: journalctl -u $SERVICE -n 50" >&2
  exit 1
fi
