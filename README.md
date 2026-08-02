# SurfDock

The safe harbor for your home server: VPN killswitch, live dashboard, per-torrent control and Docker stack management — from a single tray app, on Windows, macOS and Linux.

## Features

- **Iron Gate VPN** — 6 zero-trust checks (gluetun health, egress IP, tun0 routing, qBittorrent binding, DNS, UDP tracker). If the tunnel drops, torrents are paused before a single byte leaks, and resume automatically when the tunnel is back.
- **Live dashboard** — VPN, downloads, seeds, speed, Jellyfin, Docker and Sunshine refreshed every 8 seconds.
- **Per-torrent control** — pause, resume, force, recheck and delete single downloads, plus a global download-rate slider with automatic bandwidth detection.
- **Docker stack** — start/stop/restart your compose stack with one click, per-service status grid with legend.
- **Native tray** — status icon that changes color with VPN state, native notifications, Avvia Tutto / Ferma Tutto.
- **Health endpoint** — `http://localhost:5192/health` for external watchdogs and monitoring.
- **Cross-platform** — Windows (NSIS installer), macOS and Linux (systemd).

## Install (binary)

Download the latest installer from the [Releases](https://github.com/UmbertoDiP/surfdock/releases) page.

## Build from source

Requirements: Node.js 20+, npm, Docker Engine (or Docker Desktop).

```bash
npm install
npm run electron:dev      # dev mode (Vite + Electron)
npm run electron:build    # production NSIS installer in dist_electron/
```

## Configuration

SurfDock works out of the box against a local Docker stack with default ports. Customize via environment variables (highest priority), an optional `config.local.json` in the project folder (development), or the defaults below.

| Variable | Default | Purpose |
|---|---|---|
| `LOKINO_ROOT` | `~/surfdock` | Root of the stack (compose file, logs, config) |
| `SURFDOCK_QBIT_URL` | `http://localhost:8082` | qBittorrent API URL |
| `SURFDOCK_QBIT_USER` | `admin` | qBittorrent user |
| `SURFDOCK_QBIT_PASS` | `adminadmin` | qBittorrent password |
| `SURFDOCK_JELLYFIN_URL` | `http://localhost:8096` | Jellyfin URL |
| `SURFDOCK_GAMES_API` | `http://localhost:5184` | Games manager API |
| `SURFDOCK_GLUETUN_CT` | `gluetun` | VPN container name (Iron Gate) |
| `SURFDOCK_DOCKER_DESKTOP` | platform default | Docker Desktop executable (Windows) |
| `LOKINO_ACTIONS_RUNNER` | `~/actions-runner` | Self-hosted GitHub Actions runner dir |
| `SURFDOCK_DOCKER_PREFIXES` | none | Extra accepted container name prefixes |

Example `config.local.json` (never committed):

```json
{
  "root": "C:\\home-server",
  "qbitUser": "admin",
  "qbitPass": "my-secret",
  "dockerCtPrefixes": ["mystack-"],
  "lanPreferredPrefix": "192.168.1."
}
```

## Architecture

A single Electron daemon: backend in the main process, lightweight React UI, health HTTP server for the watchdog.

```
[BOOT]  start Docker Desktop if off -> wait ready (max 120s)
[GATE]  Iron Gate: 6 zero-trust checks
[ARMED] OK -> auto-resume torrents + telemetry 8s + gate poller 60s
[HEALTH] http://localhost:5192/health for external watchdogs
[AUTOSTART] native Login Item (Windows/macOS), .desktop on Linux
```

## License

See [LICENSE.md](LICENSE.md). SurfDock is source-available: the compiled binary is licensed per home server; the source is provided for personal use and modification. Redistribution of the binaries or the source is not permitted without written consent.

(c) 2026 Umberto Di Puorto
