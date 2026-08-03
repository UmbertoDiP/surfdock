# Release Automatica Installer Windows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pubblicare l'installer Windows NSIS di SurfDock come release GitHub automatica tramite GitHub Actions e sbloccare il bottone "Scarica per Windows" della landing.

**Architecture:** Workflow GitHub Actions su push di tag `v*` compila l'app su `windows-latest` con `npm run electron:build` (script esistente), crea una release draft con l'`.exe` allegato, poi pubblicazione manuale della draft. Il bottone landing punta a `https://github.com/UmbertoDiP/surfdock/releases/latest`.

**Tech Stack:** GitHub Actions (windows-latest, Node 22), npm, electron-builder 26, esbuild, vite 8, softprops/action-gh-release v2, gh CLI.

**Spec:** `docs/superpowers/specs/2026-08-03-release-automatica-design.md`

## Global Constraints

- Target di build: SOLO Windows NSIS (config electron-builder esistente, non modificare)
- Il tag semver `vX.Y.Z` deve combaciare con `version` in `package.json` (attuale: `1.0.0`, tag `v1.0.0`)
- Modifiche landing SOLO in `landing/index.html`; `docs/index.html` e' copia identica da riscrivere a ogni cambio
- La release viene creata come **draft**; la pubblicazione e' un click manuale dopo verifica
- Commit: `git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit` — mai Co-Authored-By, mai emoji
- Push automatico dopo commit (override temporaneo attivo fino 2026-08-15)
- Nessuna firma codice (code signing): il warning SmartScreen al primo avvio e' atteso e fuori scope

---

### Task 1: Verifica build locale

Validare la catena di build completa prima di toccare il CI. Se la build locale fallisce, fixare prima di procedere.

**Files:**
- Test (generato): `dist_electron/SurfDock Setup 1.0.0.exe`

- [ ] **Step 1: Lanciare la build**

Run:
```bash
npm run electron:build
```
Nel workdir `C:\Users\umber\Documents\MyProjects\surfdock`. Durata attesa 2-5 min (scarica Electron + tool NSIS al primo run).

- [ ] **Step 2: Verificare che l'installer esista**

Run:
```bash
ls -la dist_electron/*.exe
```
Expected: `SurfDock Setup 1.0.0.exe` presente (e `latest.yml` accanto, se generato).

- [ ] **Step 3: Commit eventuali fix (solo se la build ha richiesto modifiche)**

```bash
git add -A
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: fix build installer windows"
git push
```
Se la build e' passata senza modifiche, saltare lo step.

---

### Task 2: Workflow GitHub Actions

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `package.json` script `electron:build` (gia' esistente), tag `v1.0.0` (Task 4)
- Produces: release draft su `UmbertoDiP/surfdock` con asset `dist_electron/*.exe`

- [ ] **Step 1: Creare il workflow**

Create `.github/workflows/release.yml` con questo contenuto:

```yaml
name: Release Installer

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run electron:build
      - uses: softprops/action-gh-release@v2
        with:
          draft: true
          files: dist_electron/*.exe
          fail_on_unmatched_files: true
```

Note: `permissions: contents: write` serve all'azione per creare la release; `fail_on_unmatched_files: true` fa fallire il job se l'`.exe` non viene prodotto.

- [ ] **Step 2: Commit e push del workflow**

```bash
git add .github/workflows/release.yml
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: workflow release automatica installer"
git push
```

- [ ] **Step 3: Verificare che il workflow sia sul main remoto**

Run:
```bash
git ls-tree HEAD .github/workflows/release.yml
```
Expected: blob presente. Il workflow verra' esercitato per davvero in Task 4.

---

### Task 3: Bottone landing "Scarica per Windows"

**Files:**
- Modify: `landing/index.html:175`
- Modify: `docs/index.html:175` (copia della landing)

**Interfaces:**
- Produces: link `https://github.com/UmbertoDiP/surfdock/releases/latest` nella hero; nessun cambio alle chiavi i18n

- [ ] **Step 1: Aggiornare l'href in landing**

In `landing/index.html`, riga 175, sostituire:

```html
<a class="cta" href="#" data-i18n="hero-cta">Scarica per Windows</a>
```

con:

```html
<a class="cta" href="https://github.com/UmbertoDiP/surfdock/releases/latest" data-i18n="hero-cta">Scarica per Windows</a>
```

Le chiavi i18n `hero-cta` (righe ~304 e ~340) restano invariate.

- [ ] **Step 2: Copiare in docs e verificare identita'**

```bash
cp landing/index.html docs/index.html
diff landing/index.html docs/index.html && echo IDENTICAL
```
Expected: `IDENTICAL`.

- [ ] **Step 3: Commit e push**

```bash
git add landing/index.html docs/index.html
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: bottone scarica punta alle release github"
git push
```

- [ ] **Step 4: Verificare il deploy Pages**

Run:
```bash
curl -s https://umbertodip.github.io/surfdock/ | grep -o 'releases/latest' | head -1
```
Expected: `releases/latest` (puo' richiedere 1-2 minuti per il rebuild Pages).

---

### Task 4: Tag, build CI, pubblicazione release

**Files:**
- Nessun file: operazioni git + GitHub

**Interfaces:**
- Consumes: workflow (Task 2) presente su main, `version` `1.0.0` in package.json
- Produces: release pubblica `v1.0.0` con l'installer, bottone funzionante

- [ ] **Step 1: Tag semver**

```bash
git tag v1.0.0
git push origin v1.0.0
```

- [ ] **Step 2: Monitorare il run del workflow**

Run:
```bash
gh run list --workflow release.yml
gh run watch $(gh run list --workflow release.yml --json databaseId -q '.[0].databaseId')
```
Expected: run verdi (build ~5-10 min). In caso di rosso, leggere i log:
```bash
gh run view --log-failed
```

- [ ] **Step 3: Verificare la release draft**

Run:
```bash
gh release view v1.0.0 --json isDraft,assets --jq '.isDraft, .assets[].name'
```
Expected: `true` e `SurfDock Setup 1.0.0.exe` (attivo `isDraft: true` per via di `draft: true` nel workflow).

- [ ] **Step 4: Pubblicare la draft**

```bash
gh release publish v1.0.0
```

- [ ] **Step 5: Verificare il redirect del link latest**

Run:
```bash
curl -sI https://github.com/UmbertoDiP/surfdock/releases/latest
```
Expected: HTTP/2 302 con `location` verso la release `v1.0.0` (segue 200 sulla pagina).

- [ ] **Step 6: Verificare il bottone su Pages**

Run:
```bash
curl -s https://umbertodip.github.io/surfdock/ | grep -o 'https://github.com/UmbertoDiP/surfdock/releases/latest'
```
Expected: il link completo presente nella pagina.

---

### Task 5: Documentazione taskgemini

**Files:**
- Modify: `C:\Users\umber\Documents\MyProjects\07-iot-hardware\jellyfin-server\taskgemini\10-STRIPE-PAYMENT-LINKS.md`

**Interfaces:**
- Consumes: esito di Task 4
- Produces: sezione stato download/installer aggiornata

- [ ] **Step 1: Aggiornare la sezione download/installer**

Aggiungere al fondo del file una sezione con esito: tag `v1.0.0`, workflow `release.yml` attivo, URL release, bottone landing aggiornato, comando per rifare una release futura:

```
## Stato download installer (2026-08-03)

- Workflow .github/workflows/release.yml su UmbertoDiP/surfdock: build windows-latest + release draft su tag v*
- Release pubblicata: https://github.com/UmbertoDiP/surfdock/releases/tag/v1.0.0
- Bottone landing "Scarica per Windows" -> https://github.com/UmbertoDiP/surfdock/releases/latest
- Per una nuova release: bump version in package.json, git tag vX.Y.Z, git push origin vX.Y.Z, poi pubblicare la draft con gh release publish vX.Y.Z
```

- [ ] **Step 2: Commit e push**

```bash
git add taskgemini/10-STRIPE-PAYMENT-LINKS.md
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "taskgemini: stato download installer surfdock"
git push
```
Nel workdir `C:\Users\umber\Documents\MyProjects\07-iot-hardware\jellyfin-server`.

---

### Self-Review

**Spec coverage:**
- Workflow release.yml + draft + fail_on_unmatched_files → Task 2 ✓
- Verifica build locale pre-tag → Task 1 ✓
- Bottone landing + i18n invariata + copia docs → Task 3 ✓
- Tag/push/verifica/pubblicazione → Task 4 ✓
- Doc taskgemini → Task 5 ✓
- Fuori scope (macOS/Linux, auto-update, passkey, webhook) → non presenti nel piano ✓

**Placeholder scan:** nessun TBD/TODO; ogni step ha comando o codice completo.

**Type consistency:** nome asset atteso (`SurfDock Setup 1.0.0.exe`, glob `dist_electron/*.exe`) coerente in Task 1-4; tag `v1.0.0` coerente con `version: 1.0.0`.
