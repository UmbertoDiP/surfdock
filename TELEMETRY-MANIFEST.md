# TELEMETRY-MANIFEST — SurfDock

> Ultimo aggiornamento: 2026-08-12
> Versione app: v1.0.3
> Mappato da: Umberto Di Puorto
> Stato: MAPPATO — Telemetria attiva

## Copertura

| Layer | Telemetria | Sentry |
|-------|-----------|--------|
| Client (Electron/React) | ACTIVE | CODE READY |

## Eventi Tracciati

### SESSION
| Event Type | Dove | Payload | Trigger |
|-----------|------|---------|---------|
| `SESSION` | `src/main.tsx` | `{ action: 'app_start', version }` | Montaggio app completato |
| `SESSION` | `src/App.tsx` | `{ action: 'startup_loaded', hasIssues }` | Startup poll completato |
| `SESSION` | `src/App.tsx` | `{ action: 'open_setup' }` | Click pulsante setup wizard |
| `SESSION` | `src/App.tsx` | `{ action: 'open_sources' }` | Click pulsante fonti |
| `SESSION` | `src/App.tsx` | `{ action: 'open_search' }` | Click pulsante cerca torrent |

## File Creati
- `src/utils/telemetry.ts` — SDK telemetria TypeScript (appName='surfdock')

## File Modificati
- `src/main.tsx` — import + initTelemetry + track SESSION dopo mount
- `src/App.tsx` — import + track su startup_loaded, open_setup, open_sources, open_search
