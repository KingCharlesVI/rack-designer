# Rack Designer registry server

A lightweight, self-hosted registry for Rack Designer community packs. Run it on a homelab box and everyone on your network can browse, install and publish packs straight from the app. No GitHub needed.

- A single ~50 KB Node.js file with no dependencies. Packs are stored as plain JSON files.
- Listens on **port 5010**.
- Publishing works from the app's **Create & share** tab. Uploads wait for your approval in a small web admin console, or can be published instantly.
- Each pack id is claimed by its first publisher with a secret **edit key**, so nobody else can overwrite it.
- Every upload is validated with the same rules the app uses. Uploads are size-limited (5 MB) and rate-limited per IP address.

## Install with Docker (recommended)

On the Ubuntu box, with Docker and the compose plugin installed:

```sh
git clone https://github.com/KingCharlesVI/rack-designer.git
cd rack-designer/server
cp .env.example .env
sed -i "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=$(openssl rand -hex 24)/" .env   # or edit .env by hand
docker compose up -d --build
```

Data is kept in the `registry-data` Docker volume. Logs: `docker compose logs -f`. To upgrade: `git pull && docker compose up -d --build`.

## Install without Docker (systemd)

Needs Node.js 18 or newer (`sudo apt install -y nodejs npm` on Ubuntu 24.04 is enough).

```sh
git clone https://github.com/KingCharlesVI/rack-designer.git
cd rack-designer
sudo bash server/deploy/install.sh
```

The script:
- creates a `rack-registry` system user;
- installs the server to `/opt/rack-registry`, with data in `/var/lib/rack-registry` and settings in `/etc/rack-registry/registry.env` (it generates an admin token);
- starts a hardened systemd service;
- prints the URLs to use.

Re-run it after `git pull` to upgrade; your settings and data are kept.

- Logs: `journalctl -u rack-registry -f`
- Change settings: edit `/etc/rack-registry/registry.env`, then `sudo systemctl restart rack-registry`
- Uninstall: `sudo systemctl disable --now rack-registry && sudo rm -r /etc/systemd/system/rack-registry.service /opt/rack-registry /etc/rack-registry`. Then delete `/var/lib/rack-registry` too if you don't want to keep the packs.

If `ufw` is enabled, open the port: `sudo ufw allow 5010/tcp`.

## Using it from Rack Designer

1. In the app, open **File → Community packs… → Browse → Change registry…**.
2. Enter `http://<server-ip>:5010/index.json` and click **Use**.
3. **Browse** now lists your server's packs. On **Create & share**, the button becomes **Publish to <registry name>**.

When you publish a new pack id, the app receives an edit key and saves it. It's needed to publish updates (bump the version each time) and is shown once so you can back it up.

The app accepts plain `http://` only for private-network addresses (`10.x`, `192.168.x`, `172.16–31.x`, `100.64–127.x`, `localhost`, and `.lan`, `.local` or `.home.arpa` names). Anything public must use `https://`. Downloads are always checked against the checksum in the index.

## Admin console

Open `http://<server-ip>:5010/admin` and sign in with `ADMIN_TOKEN`. From there you can approve or reject pending uploads (with a preview of their contents) and delete published packs. Ten failed sign-ins from one address lock it out for 15 minutes.

You can also add pack files directly, for example to seed the registry with the repository's community packs:

```sh
# Docker (from the server/ folder)
docker compose cp ../community/packs/. registry:/tmp/packs/
docker compose exec registry sh -c 'node registry-server.mjs import /tmp/packs/*.json'
docker compose restart

# systemd (from the repository root)
sudo env DATA_DIR=/var/lib/rack-registry node /opt/rack-registry/registry-server.mjs import community/packs/*.json
sudo chown -R rack-registry:rack-registry /var/lib/rack-registry
sudo systemctl restart rack-registry
```

`import` prints an edit key for each newly added pack. Add `--overwrite` to replace existing packs. Restart the server afterwards so it picks up the new files.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5010` | Port to listen on |
| `HOST` | `0.0.0.0` | Address to bind |
| `DATA_DIR` | `./data` | Where packs are stored (`/data` in Docker) |
| `ADMIN_TOKEN` | *(unset)* | Enables the admin console and API. Without it, nothing can be approved |
| `AUTO_APPROVE` | `false` | `true` publishes uploads immediately |
| `ACCEPT_SUBMISSIONS` | `true` | `false` makes the registry read-only (add packs with `import`) |
| `REGISTRY_NAME` | `Rack Designer pack registry` | Shown in the app and on the landing page |
| `SUBMIT_RATE_LIMIT` | `20` | Uploads per client IP per hour |
| `TRUST_PROXY` | `false` | Use `X-Forwarded-For`/`-Proto` from a reverse proxy |
| `PUBLIC_URL` | *(from request)* | Base URL shown on the landing page |

## HTTPS (optional)

To reach the registry from outside your network, put it behind a reverse proxy with TLS and set `TRUST_PROXY=true`. For example, with Caddy:

```
racks.example.com {
    reverse_proxy 127.0.0.1:5010
}
```

## Backups

All state is in the data directory: `packs/` (published packs), `meta/` (edit-key hashes and history) and `pending/` (the review queue). Back up that folder. Edit keys are only stored as hashes.

## API

| Method & path | Description |
| --- | --- |
| `GET /index.json` | Registry index (what the app reads) |
| `GET /packs/<id>.json` | A published pack |
| `GET /` | Landing page listing the packs |
| `GET /health` | `{ ok, packs, pending }` for monitoring |
| `POST /api/submissions` | Upload a pack (JSON body). Send the `X-Pack-Key` header to update an existing pack. Returns `201` (published) or `202` (pending) |
| `GET /api/admin/submissions` | Pending uploads and published packs. Needs `Authorization: Bearer <ADMIN_TOKEN>`, as do all admin routes |
| `POST /api/admin/submissions/<sid>/approve` | Publish a pending upload |
| `POST /api/admin/submissions/<sid>/reject` | Discard a pending upload |
| `DELETE /api/admin/packs/<id>` | Remove a published pack |

## Development

```sh
npm run server:dev     # run from source with tsx (uses ./data)
npm run server:build   # bundle to server/dist/registry-server.mjs
npm test               # includes the server tests
```
