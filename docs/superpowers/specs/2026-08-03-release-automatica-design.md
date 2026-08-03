# Release Automatica Installer Windows — Design

Data: 2026-08-03
Stato: approvato (design review 2026-08-03)

## Obiettivo

Pubblicare l'installer Windows NSIS di SurfDock come release GitHub automatica, sbloccando il bottone "Scarica per Windows" della landing page che oggi punta a `href="#"`.

## Architettura

Workflow GitHub Actions `release.yml` sul repo `UmbertoDiP/surfdock`:

- Trigger: push di tag semver `v*` (es. `v1.0.0`)
- Runner: `windows-latest` (electron-builder richiede Windows per target NSIS)
- Steps:
  1. checkout con fetch di tag (serve per il versioning)
  2. setup Node 22 con cache npm
  3. `npm ci`
  4. `npm run electron:build` (script esistente: build:electron + vite + electron-builder, output `dist_electron`, target NSIS, icona, EULA)
  5. upload artifact del `.exe`
  6. creazione release **draft** con `softprops/action-gh-release` (asset: `.exe`; `fail_on_unmatched_files: true`)

## Componenti

| Componente | Cosa fa | Dipendenze |
|---|---|---|
| `.github/workflows/release.yml` | Builda l'installer e crea la release draft | `package.json` (script electron:build), azione `softprops/action-gh-release` |
| Release GitHub (draft) | Contiene l'asset `.exe` scaricabile | workflow |
| Landing `#hero-cta` | Link al download | release pubblicata |

## Flusso dati

1. Lo sviluppatore tagga `v1.0.0` e fa push del tag
2. Il workflow compila l'installer NSIS su Windows
3. Viene creata una release **draft** con l'`.exe` allegato
4. Lo sviluppatore pubblica la draft dal pannello GitHub (verifica manuale: un click, niente release rotte in pubblico)
5. Il bottone "Scarica per Windows" (`https://github.com/UmbertoDiP/surfdock/releases/latest`) risolve nella release pubblicata

## Dettagli implementativi

- **Versione**: il tag deve combaciare con `version` in `package.json` (electron-builder usa la versione del package). Es. tag `v1.0.0` richiede `version: 1.0.0`.
- **Token**: `${{ github.token }}` predefinito, nessun secret aggiuntivo.
- **Release draft**: evita pubblicazioni accidentali; la pubblicazione è un click manuale sul pannello GitHub.
- **Bottone landing**: `href="#"` (riga 175 di `landing/index.html`) diventa `https://github.com/UmbertoDiP/surfdock/releases/latest`; i18n `hero-cta` aggiornato IT/EN. Modifiche in `landing/`, poi copia in `docs/` (sono copie identiche).
- **Asset multipli**: se electron-builder produce `.yml`/`.blockmap` accanto all'`.exe`, vengono allegati solo i file previsti (`**.exe` esplicito, `fail_on_unmatched_files: true` per fallire subito se il build non genera l'installer).

## Gestione errori

- Build fallita (errore compilazione, assenza `.exe`): workflow rosso, nessuna release creata, nessun intervento manuale richiesto oltre a fix + retag.
- `.exe` mancante dopo build: `fail_on_unmatched_files: true` fa fallire il job prima di creare la draft.
- Release draft errata: cancellabile dal pannello GitHub senza impatto pubblico (il link `/releases/latest` continua a puntare alla release pubblicata).

## Test e verifica

- `npm run electron:build` locale su Windows per validare la catena di build prima del primo tag
- `gh run list` per stato del workflow dopo il push del tag
- `gh release view` per confermare asset presente nella draft
- Pubblicazione draft + `curl -sI https://github.com/UmbertoDiP/surfdock/releases/latest` (302 verso la release)
- `curl -s https://umbertodip.github.io/surfdock/ | grep releases/latest` per il bottone aggiornato

## Fuori scope

- Installer macOS/Linux (solo Windows NSIS, come da config esistente)
- Auto-update (electron-updater non configurato)
- Passkey Corsaro Blu e altre attività di seeding
- Verifica webhook Stripe in produzione reale
