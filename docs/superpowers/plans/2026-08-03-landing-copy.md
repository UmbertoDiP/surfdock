# Landing Copy + Sblocco Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere all'app SurfDock la feature "Sblocca temporaneamente" (Iron Gate unlock) e riscrivere la landing con messaggio chiave, galleria screenshot reali (blur privacy), sezione installazione e 12 FAQ.

**Architecture:** Backend Electron (modulo puro `gateUnlock.ts` con persistenza su file + integrazione in `ironGate.ts` poller e `healthServer.ts` API) + UI React (componente `GateUnlock.tsx` nel footer). Landing: un solo file HTML con i18n IT/EN inline; screenshots catturati dall'app reale e oscurati con script PIL.

**Tech Stack:** TypeScript (esbuild backend), React 19 + Vite (UI), vitest (test backend), electron-builder (già attivo), Python PIL (blur), PowerShell (cattura finestra).

**Spec:** `docs/superpowers/specs/2026-08-03-landing-copy-design.md`

## Global Constraints

- Regola landing: si modifica SOLO `landing/index.html`, poi copia byte-identica in `docs/index.html` (GitHub Pages). Mai modificarli separatamente.
- Commit identity: `git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "..."` — mai Co-Authored-By, mai emoji.
- Nessun contenuto di download reale pubblicato: ogni screenshot con titoli torrent deve avere blur.
- Verita' da rispettare: installer SOLO Windows; non firmato (SmartScreen); guardia automatica = gluetun/Mullvad; licenza = badge (nessun lock funzionale).
- Script build verifica: `npm run build:electron` (esbuild) + `npm run build` (vite). UI dev: `npm run dev`.
- Test: `npm run test` (vitest). Lanciare da `C:\Users\umber\Documents\MyProjects\surfdock`.

---

### Task 0: Setup vitest

**Files:**
- Modify: `package.json` (devDependencies + script)
- Create: `vitest.config.ts` (opzionale ma esplicito)

**Interfaces:**
- Consumes: niente
- Produces: comando `npm run test` eseguibile; test runner per i task successivi

- [ ] **Step 1: Installare vitest**

```bash
npm install --save-dev vitest
```

Expected: devDependencies aggiornati, `node_modules/.bin/vitest` presente.

- [ ] **Step 2: Aggiungere lo script test**

In `package.json`, sotto `"scripts"` aggiungere:

```json
    "test": "vitest run"
```

- [ ] **Step 3: Config esplicita**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['electron/backend/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verificare che vitest giri**

Create `electron/backend/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest funziona', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test`
Expected: PASS (1 test), exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts electron/backend/smoke.test.ts
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: setup vitest per test backend"
```

---

### Task 1: Modulo gateUnlock + test

**Files:**
- Modify: `electron/backend/config.ts` (nuova const)
- Create: `electron/backend/gateUnlock.ts`
- Test: `electron/backend/gateUnlock.test.ts`

**Interfaces:**
- Consumes: `GATE_UNLOCK_FILE` (config), `igLog` (log)
- Produces: `unlockGate(minutes: number): GateUnlockState`, `armGate(): GateUnlockState`, `getGateUnlockState(): GateUnlockState`, `isGateUnlocked(): boolean`, `setGateUnlockPath(p: string)` (solo test), type `GateUnlockState { unlocked: boolean; until: string | null; remainingSec: number; expiresAt: number | null }`

- [ ] **Step 1: Test fallito**

Create `electron/backend/gateUnlock.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { unlockGate, armGate, getGateUnlockState, isGateUnlocked, setGateUnlockPath } from './gateUnlock';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-unlock-test-'));
const tmpFile = path.join(tmpDir, 'gate_unlock.json');
setGateUnlockPath(tmpFile);

describe('gateUnlock', () => {
  beforeEach(() => {
    try { fs.unlinkSync(tmpFile); } catch { /* no-op */ }
  });

  it('unlock imposta stato unlocked con countdown', () => {
    const s = unlockGate(15);
    expect(s.unlocked).toBe(true);
    expect(s.remainingSec).toBeGreaterThan(0);
    expect(s.remainingSec).toBeLessThanOrEqual(15 * 60);
    expect(s.until).not.toBeNull();
    expect(isGateUnlocked()).toBe(true);
  });

  it('minuti validi: clamp 1..60 e default su input non numerico', () => {
    expect(unlockGate(999).remainingSec).toBeLessThanOrEqual(60 * 60);
    expect(unlockGate(0).remainingSec).toBeLessThanOrEqual(60);
    const def = unlockGate(NaN);
    expect(def.remainingSec).toBeGreaterThan(14 * 60);
    expect(def.remainingSec).toBeLessThanOrEqual(15 * 60);
  });

  it('expired: stato locked e file rimosso', () => {
    unlockGate(1);
    fs.writeFileSync(tmpFile, JSON.stringify({ expiresAt: Date.now() - 1000 }), 'utf-8');
    expect(isGateUnlocked()).toBe(false);
    expect(fs.existsSync(tmpFile)).toBe(false);
    expect(getGateUnlockState().unlocked).toBe(false);
  });

  it('arm rimuove lo stato', () => {
    unlockGate(15);
    const s = armGate();
    expect(s.unlocked).toBe(false);
    expect(isGateUnlocked()).toBe(false);
    expect(fs.existsSync(tmpFile)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, atteso FAIL**

Run: `npx vitest run electron/backend/gateUnlock.test.ts`
Expected: FAIL, "Cannot find module './gateUnlock'"

- [ ] **Step 3: Implementare**

In `electron/backend/config.ts`, dopo la riga `KILLSWITCH_STATE`:

```ts
export const GATE_UNLOCK_FILE = path.join(ROOT, 'config', 'gate_unlock.json');
```

Create `electron/backend/gateUnlock.ts`:

```ts
import fs from 'fs';
import path from 'path';
import { GATE_UNLOCK_FILE } from './config';
import { igLog } from './log';

const UNLOCK_DEFAULT_MIN = 15;
const UNLOCK_MAX_MIN = 60;

let gateUnlockPath = GATE_UNLOCK_FILE;

export function setGateUnlockPath(p: string) {
  gateUnlockPath = p;
}

export interface GateUnlockState {
  unlocked: boolean;
  until: string | null;
  remainingSec: number;
  expiresAt: number | null;
}

function loadUnlock(): { expiresAt: number } | null {
  try {
    return JSON.parse(fs.readFileSync(gateUnlockPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function isGateUnlocked(): boolean {
  const data = loadUnlock();
  if (!data || typeof data.expiresAt !== 'number') return false;
  if (Date.now() >= data.expiresAt) {
    try { fs.unlinkSync(gateUnlockPath); } catch { /* no-op */ }
    return false;
  }
  return true;
}

export function unlockGate(minutes: number): GateUnlockState {
  const m = Math.min(Math.max(Math.floor(minutes) || UNLOCK_DEFAULT_MIN, 1), UNLOCK_MAX_MIN);
  const expiresAt = Date.now() + m * 60_000;
  try {
    fs.mkdirSync(path.dirname(gateUnlockPath), { recursive: true });
    fs.writeFileSync(gateUnlockPath, JSON.stringify({ expiresAt }, null, 2), 'utf-8');
  } catch (e: any) {
    igLog(`[ERR] unlock persist: ${e?.message || e}`);
  }
  igLog(`[GATE] unlock richiesto: ${m} min (fino a ${new Date(expiresAt).toISOString()})`);
  return getGateUnlockState();
}

export function armGate(): GateUnlockState {
  try { fs.unlinkSync(gateUnlockPath); } catch { /* no-op */ }
  igLog('[GATE] riarmato manualmente');
  return getGateUnlockState();
}

export function getGateUnlockState(): GateUnlockState {
  const data = loadUnlock();
  if (!data || typeof data.expiresAt !== 'number' || Date.now() >= data.expiresAt) {
    return { unlocked: false, until: null, remainingSec: 0, expiresAt: null };
  }
  return {
    unlocked: true,
    until: new Date(data.expiresAt).toISOString(),
    remainingSec: Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)),
    expiresAt: data.expiresAt,
  };
}
```

- [ ] **Step 4: Run, atteso PASS**

Run: `npx vitest run electron/backend/gateUnlock.test.ts`
Expected: 4 test PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/backend/config.ts electron/backend/gateUnlock.ts electron/backend/gateUnlock.test.ts
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: modulo sblocco temporaneo Iron Gate"
```

---

### Task 2: Integrazione ironGate + healthServer

**Files:**
- Modify: `electron/backend/ironGate.ts` (poller)
- Modify: `electron/backend/healthServer.ts` (import, /health, vpnGuard, route POST)

**Interfaces:**
- Consumes: `isGateUnlocked`, `unlockGate`, `armGate`, `getGateUnlockState` (Task 1)
- Produces: `/health` campi `gate_unlocked: boolean`, `gate_until: string | null`, `gate_remaining: number`; endpoint `POST /api/gate/unlock?minutes=N`, `POST /api/gate/arm`

- [ ] **Step 1: Poller ironGate — skip enforcement se unlocked**

In `electron/backend/ironGate.ts`, import:

```ts
import { isGateUnlocked } from './gateUnlock';
```

Sostituire il blocco `if (!ok) { ... }` del poller (righe ~212-224) con:

```ts
      if (!ok) {
        if (isGateUnlocked()) {
          igLog('[GATE] guardia GIU\', unlock attivo: enforcement sospeso, diagnostica continua');
        } else if (!ironGate.vpnDown) {
          await onVpnDown(failed);
          notify('SurfDock - VPN GIU\'', `Iron Gate fallito (${failed.length} test). Torrent bloccati, Jellyfin resta in LAN.`);
          ironGate.vpnDown = true;
        } else {
          try {
            const active = await QB.activeHashes();
            const state = loadKillswitchState();
            const already = state.paused_by_killswitch || [];
            if (active.some(h => !already.includes(h))) await onVpnDown(failed);
          } catch { /* no-op */ }
        }
      }
```

- [ ] **Step 2: healthServer — import + /health + vpnGuard + route**

In `electron/backend/healthServer.ts`, import:

```ts
import { unlockGate, armGate, getGateUnlockState, isGateUnlocked } from './gateUnlock';
```

Nel blocco `/health`, dopo `vpn_enabled`:

```ts
      const gs = getGateUnlockState();
      sendJson(res, 200, {
        ...
        vpn_enabled: getProfile().vpnEnabled,
        gate_unlocked: gs.unlocked,
        gate_until: gs.until,
        gate_remaining: gs.remainingSec,
      });
```

NB: la riga `const gs = ...` va MESSA PRIMA della chiamata `sendJson` (insieme alle altre const, sopra `sendJson`), non dentro l'oggetto.

Sostituire `const vpnGuard = ...` (riga 151) con:

```ts
  const vpnGuard = STATE.vpn === 'unhealthy' && getProfile().vpnEnabled && !isGateUnlocked();
```

Aggiungere in `handlePost`, prima del `default:`:

```ts
    case '/api/gate/unlock': {
      const raw = search.get('minutes');
      const minutes = raw ? parseInt(raw, 10) : 15;
      if (Number.isNaN(minutes)) { sendJson(res, 400, { ok: false, error: 'minutes non valido' }); break; }
      const gs = unlockGate(minutes);
      sendJson(res, 200, { ok: true, ...gs });
      break;
    }
    case '/api/gate/arm': {
      const gs = armGate();
      sendJson(res, 200, { ok: true, ...gs });
      break;
    }
```

- [ ] **Step 3: Compile**

Run: `npm run build:electron`
Expected: esbuild OK, `dist-electron/` rigenerato.

- [ ] **Step 4: Test end-to-end API (app in dev)**

Avvia l'app con l'API attiva (usare processo esterno per non bloccare):

Run: `npm run build:electron && (npx concurrently -k "cross-env BROWSER=none vite --port 5174 --strictPort --host 127.0.0.1" "wait-on http://127.0.0.1:5174 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5174 electron ." &)`

Poi verificare su `http://127.0.0.1:5192`:

```bash
curl -s http://127.0.0.1:5192/health | grep -o '"gate_unlocked":[a-z]*\|"gate_remaining":[0-9]*'
curl -s -X POST "http://127.0.0.1:5192/api/gate/unlock?minutes=5"
curl -s http://127.0.0.1:5192/health | grep -o '"gate_unlocked":true'
curl -s -X POST http://127.0.0.1:5192/api/gate/arm
curl -s http://127.0.0.1:5192/health | grep -o '"gate_unlocked":false'
```

Expected: prima `false`, poi `true` con `remainingSec` ~300, poi `false` dopo arm. Se l'app e' gia' in esecuzione, saltare il lancio e testare direttamente sull'istanza attiva (l'API non richiede auth, localhost).

- [ ] **Step 5: Commit**

```bash
git add electron/backend/ironGate.ts electron/backend/healthServer.ts
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: endpoint sblocco/riarmo gate e enforcement condizionato"
```

---

### Task 3: UI — stato gate nel footer + componente GateUnlock

**Files:**
- Modify: `src/hooks/usePolling.ts` (SentinelState + apiPost esiste gia')
- Create: `src/components/GateUnlock.tsx`
- Modify: `src/App.tsx` (footer)

**Interfaces:**
- Consumes: campi `/health` `gate_unlocked/gate_until/gate_remaining` (Task 2), `apiPost(path)` (usePolling)
- Produces: componente `GateUnlock` montato nel footer di `App.tsx`

- [ ] **Step 1: Type SentinelState**

In `src/hooks/usePolling.ts`, aggiungere al tipo `SentinelState` (dopo `license_tier`):

```ts
  gate_unlocked: boolean;
  gate_until: string | null;
  gate_remaining: number;
```

- [ ] **Step 2: Componente GateUnlock**

Create `src/components/GateUnlock.tsx`:

```tsx
import { useState } from 'react';
import { ShieldOff, ShieldCheck, Lock, Unlock } from 'lucide-react';
import { apiPost } from '../hooks/usePolling';

interface Props {
  gateDown: boolean;
  unlocked: boolean;
  remainingSec: number;
}

export function GateUnlock({ gateDown, unlocked, remainingSec }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: 'unlock' | 'arm') {
    setBusy(true);
    try {
      await apiPost(action === 'unlock' ? '/api/gate/unlock?minutes=15' : '/api/gate/arm');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const mmss = `${String(Math.floor(remainingSec / 60)).padStart(2, '0')}:${String(remainingSec % 60).padStart(2, '0')}`;

  if (unlocked) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[var(--warning)] font-semibold flex items-center gap-1">
          <Unlock size={12} /> GATE APERTO · riarmo tra {mmss}
        </span>
        <button
          onClick={() => run('arm')}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
        >
          <Lock size={11} /><span className="text-[11px]">Riarma ora</span>
        </button>
      </span>
    );
  }

  if (gateDown) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-[var(--danger)] font-semibold flex items-center gap-1">
          <ShieldOff size={12} /> Iron Gate DOWN
        </span>
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--warning)] transition-colors disabled:opacity-50"
        >
          <Unlock size={11} /><span className="text-[11px]">Sblocca 15 min</span>
        </button>
        {confirming && (
          <span className="flex items-center gap-1.5">
            <span className="text-[var(--warning)] text-[11px]">I torrent viaggeranno in chiaro dal tuo IP.</span>
            <button onClick={() => run('unlock')} className="px-2 py-0.5 rounded-md bg-[var(--danger)] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity">
              Conferma sblocco
            </button>
            <button onClick={() => setConfirming(false)} className="px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text-muted)] text-[11px] hover:text-[var(--accent)] transition-colors">
              Annulla
            </button>
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="text-[var(--success)] font-semibold flex items-center gap-1">
      <ShieldCheck size={12} /> ARMED
    </span>
  );
}
```

- [ ] **Step 3: Footer in App.tsx**

In `src/App.tsx`:
- import: `import { GateUnlock } from './components/GateUnlock';`
- sostituire il blocco `<span className="text-[var(--text-muted)]">...</span>` (righe 74-82) con:

```tsx
          <GateUnlock
            gateDown={state.iron_gate_down}
            unlocked={state.gate_unlocked}
            remainingSec={state.gate_remaining}
          />
          <span className="text-[var(--text-muted)]">
            {' · '}
            {state.vpn === 'healthy' ? 'Iron Gate 6/6' : `VPN: ${state.vpn_detail}`}
          </span>
```

- [ ] **Step 4: Compile + verifica UI**

Run: `npm run build`
Expected: vite build OK senza errori TS.

Verifica manuale (app in dev attiva dal Task 2): nella UI il footer mostra ARMED con VPN attiva. Con `curl -X POST "http://127.0.0.1:5192/api/gate/unlock?minutes=5"` il footer passa a "GATE APERTO · riarmo tra mm:ss" + "Riarma ora" (entro il poll di 3s). Con arm torna ARMED. Se la VPN e' giu' compare "Iron Gate DOWN" + "Sblocca 15 min".

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePolling.ts src/components/GateUnlock.tsx src/App.tsx
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: stato gate aperto/riarmo nella UI"
```

---

### Task 4: Build completa + verifica persistenza

**Files:**
- Nessun file: verifica end-to-end

**Interfaces:**
- Consumes: Task 1-3
- Produces: conferma feature funzionante (anche su build prod)

- [ ] **Step 1: Test unit completi**

Run: `npm run test`
Expected: 5 test PASS (smoke + 4 gateUnlock), exit 0.

- [ ] **Step 2: Build prod**

Run: `npm run build && npm run build:electron`
Expected: entrambi OK.

- [ ] **Step 3: Verifica persistenza su riavvio**

Con l'app in esecuzione (o API attiva):
1. `curl -s -X POST "http://127.0.0.1:5192/api/gate/unlock?minutes=30"`
2. Verificare che esista `%USERPROFILE%\surfdock\config\gate_unlock.json` con `expiresAt` futuro
3. Riavviare l'app (chiudere processo Electron e rilanciare `npm run electron:dev` o l'exe)
4. `curl -s http://127.0.0.1:5192/health | grep -o '"gate_unlocked":true'` — atteso true con countdown ripreso
5. `curl -s -X POST http://127.0.0.1:5192/api/gate/arm` e verificare `"gate_unlocked":false`

- [ ] **Step 4: Verifica blocco 403 onesto**

Su API attiva con VPN giu' (solo se la VPN e' realmente giu'; altrimenti SKIP con nota): add torrent -> 403; unlock -> 200; arm -> 403.

- [ ] **Step 5: Commit eventuali fix + report**

Se sono servite correzioni, commit con l'identita' standard. Il task si chiude con report su `.superpowers/sdd/`.

---

### Task 5: Pipeline screenshot (cattura + blur)

**Files:**
- Create: `scripts/screenshots/shot.ps1` (cattura finestra)
- Create: `scripts/screenshots/blur.py` (blur regioni)
- Create: `landing/assets/screens/` (PNG output)

**Interfaces:**
- Consumes: app con feature Task 1-3 funzionante; stack Docker attivo (verificato: gluetun healthy)
- Produces: `landing/assets/screens/*.png` — 6 immagini: `dashboard.png`, `torrents.png`, `search.png`, `docker.png`, `wizard.png`, `gate-open.png`

- [ ] **Step 1: Script cattura finestra**

Create `scripts/screenshots/shot.ps1`:

```powershell
param([string]$Name = "shot")
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$p = Get-Process | Where-Object { $_.MainWindowTitle -like '*SurfDock*' } | Select-Object -First 1
if (-not $p) { Write-Error "finestra SurfDock non trovata"; exit 1 }
[Win32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
Start-Sleep -Milliseconds 600
$r = New-Object Win32+RECT
[Win32]::GetWindowRect($p.MainWindowHandle, [ref]$r) | Out-Null
$w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$out = Join-Path $PSScriptRoot "../../landing/assets/screens/$Name.png"
$bmp.Save((Resolve-Path (Split-Path $out)).Path + "\$Name.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "salvato: $out"
```

NB: creare la cartella `landing/assets/screens/` prima (`mkdir -p`).

- [ ] **Step 2: Script blur**

Create `scripts/screenshots/blur.py`:

```python
import sys
from PIL import Image, ImageFilter

img_path, out_path = sys.argv[1], sys.argv[2]
regions = []
for arg in sys.argv[3:]:
    x, y, w, h = map(int, arg.split(","))
    regions.append((x, y, w, h))

img = Image.open(img_path).convert("RGB")
for x, y, w, h in regions:
    crop = img.crop((x, y, x + w, y + h)).filter(ImageFilter.GaussianBlur(radius=14))
    img.paste(crop, (x, y))
img.save(out_path)
print(f"blurred -> {out_path} ({len(regions)} regioni)")
```

Verifica prerequisito: `python -c "import PIL"` — se fallisce: `pip install pillow`.

- [ ] **Step 3: Cattura delle 6 viste**

Con l'app in dev aperta (dal Task 2, finestra SurfDock):

1. **dashboard**: stato normale (ARMED, stack su) -> `powershell -ExecutionPolicy Bypass -File scripts/screenshots/shot.ps1 -Name dashboard`
2. **torrents**: finestra con griglia torrent visibile -> shot `torrents`
3. **search**: aprire la modale Cerca (`curl -s "http://127.0.0.1:5192/api/search?q=test"` per scaldare, poi click Cerca nella UI... se non si puo' cliccare via API, usare lo shortcut: avviare la UI e premere il bottone Cerca col mouse non e' possibile da CLI — alternativa: catturare la modale aprendola via UI prima dello shot: chiedere all'utente di NON interagire e usare uno shot con la modale aperta ottenuta lanciando la UI con `showSearch=true`... soluzione semplice: aggiungere temporaneamente `useState(true)` per showSearch NON va bene. APPROCCIO FINALE: catturare la UI, poi l'implementatore usa Playwright/DevTools remoto: lanciare `electron . --remote-debugging-port=9222` e usare `curl http://127.0.0.1:9222/json` + websocket per clickare "Cerca". Se troppo complesso: aprire la modale Cerca con un click simulato via `npx playwright` NON installato -> alternativa pragmatica: catturare search con la modale aperta manualmente dall'utente. L'implementatore decide la via piu' rapida tra: (a) remote-debugging CDP click, (b) chiedere un click all'utente, (c) shot del pannello search state "empty".
4. **docker**: espandere DockerPanel se collassato (clic), shot `docker`
5. **wizard**: `curl -X POST http://127.0.0.1:5192/api/profile/wizard/done` e' gia' done; per mostrare il wizard: shot con modale Setup aperta — stesso problema click; usare CDP o click utente.
6. **gate-open**: `curl -s -X POST "http://127.0.0.1:5192/api/gate/unlock?minutes=30"` poi shot `gate-open` del footer (o vista intera con countdown visibile), poi `curl -s -X POST http://127.0.0.1:5192/api/gate/arm`

REGOLA: se una vista richiede click nella UI e non c'e' modo via CDP in tempi brevi, chiedere all'utente di cliccare (es. "apri la modale Cerca e dimmi quando") — MAI bloccare. Le 4 viste principali (dashboard, torrents, docker, gate-open) sono catturabili senza click.

- [ ] **Step 4: Ispezione e blur**

Per ogni PNG: leggere l'immagine (Read tool) e identificare le regioni con dati sensibili (nomi torrent, hash, seed/peer, IP, credenziali). Applicare blur.py con le coordinate trovate. Rileggere l'immagine blurrata per confermare che NIENTE sia leggibile. Se un titolo resta riconoscibile, blur piu' aggressivo (radius 25) o scarto della vista.

Nomi file finali (NON blurrare le schermate in cui non serve):
- `dashboard.png` — di solito senza titoli (solo pills): verificare
- `torrents.png` — blur su TUTTE le righe dei nomi torrent
- `search.png` — blur sui titoli risultati
- `docker.png` — nessun blur atteso
- `wizard.png` — attenzione a email/nome: blur se presenti
- `gate-open.png` — blur su eventuali dati

- [ ] **Step 5: Commit**

```bash
git add scripts/screenshots landing/assets/screens
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: pipeline screenshot con blur privacy"
```

---

### Task 6: Landing — hero, features, installazione, FAQ, i18n

**Files:**
- Modify: `landing/index.html` (unico file, CSS + HTML + dict)

**Interfaces:**
- Consumes: immagini `landing/assets/screens/*.png` (Task 5)
- Produces: nuova landing completa IT/EN pronta per la copia in `docs/`

- [ ] **Step 1: Hero con payoff e galleria**

Nel `header.hero` di `landing/index.html` (righe 172-177):

1. Cambiare il payoff (riga 173, `hero-sub`) in: **"I tuoi torrent, protetti in automatico dalla VPN"**
2. Riscrivere `hero-desc` in: "La guardia Iron Gate sorveglia la VPN 24/7: se il tunnel cade, blocca i download prima che un byte esca in chiaro — e li riprende da sola. Serve un'eccezione? Sbloccala per 15 minuti. Cerca e aggiungi torrent da tutti i tracker in Prowlarr, controlla Docker e Jellyfin da un unico pannello."
3. Cambiare i badge in: `Windows · Docker Desktop · Prowlarr · Open source Electron` (onesti: niente mac/linux)
4. Dopo `<div class="badges">...`, aggiungere la galleria:

```html
    <div class="shots" style="margin-top:48px; display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; text-align:left;">
      <figure>
        <img src="./assets/screens/dashboard.png" alt="Dashboard SurfDock" loading="lazy" style="width:100%; border-radius:14px; border:1px solid var(--border); box-shadow:0 12px 40px rgba(0,0,0,.45);" />
        <figcaption data-i18n="s1-c" style="margin-top:8px; font-size:13px; color:var(--text-2);">Dashboard live: VPN, torrent e Docker aggiornati ogni 8 secondi.</figcaption>
      </figure>
      <figure>
        <img src="./assets/screens/torrents.png" alt="Griglia torrent" loading="lazy" style="width:100%; border-radius:14px; border:1px solid var(--border); box-shadow:0 12px 40px rgba(0,0,0,.45);" />
        <figcaption data-i18n="s2-c" style="margin-top:8px; font-size:13px; color:var(--text-2);">Ogni torrent sotto controllo: pausa, ripresa, forza, recheck, rimozione.</figcaption>
      </figure>
      <figure>
        <img src="./assets/screens/search.png" alt="Ricerca torrent in-app" loading="lazy" style="width:100%; border-radius:14px; border:1px solid var(--border); box-shadow:0 12px 40px rgba(0,0,0,.45);" />
        <figcaption data-i18n="s3-c" style="margin-top:8px; font-size:13px; color:var(--text-2);">Ricerca integrata: tutti i tracker in Prowlarr, aggiungi con un click.</figcaption>
      </figure>
      <figure>
        <img src="./assets/screens/docker.png" alt="Stack Docker" loading="lazy" style="width:100%; border-radius:14px; border:1px solid var(--border); box-shadow:0 12px 40px rgba(0,0,0,.45);" />
        <figcaption data-i18n="s4-c" style="margin-top:8px; font-size:13px; color:var(--text-2);">Stack Docker: avvia e ferma tutto con un click.</figcaption>
      </figure>
      <figure>
        <img src="./assets/screens/wizard.png" alt="Setup wizard" loading="lazy" style="width:100%; border-radius:14px; border:1px solid var(--border); box-shadow:0 12px 40px rgba(0,0,0,.45);" />
        <figcaption data-i18n="s5-c" style="margin-top:8px; font-size:13px; color:var(--text-2);">Primo avvio guidato: account, licenza, VPN e fonti in 5 passi.</figcaption>
      </figure>
      <figure>
        <img src="./assets/screens/gate-open.png" alt="Gate aperto" loading="lazy" style="width:100%; border-radius:14px; border:1px solid var(--border); box-shadow:0 12px 40px rgba(0,0,0,.45);" />
        <figcaption data-i18n="s6-c" style="margin-top:8px; font-size:13px; color:var(--text-2);">La guardia si sblocca quando serve: countdown e riarmo automatico.</figcaption>
      </figure>
    </div>
```

5. Nel dict IT aggiungere le chiavi `hero-sub`, `hero-desc`, `hero-badges` aggiornate + `s1-c`...`s6-c`; idem in EN.

- [ ] **Step 2: Features — 6 card riordinate**

Sostituire il contenuto di `<div class="grid">` della sezione `#features` con le 6 card in quest'ordine (mantenendo classi/icone esistenti, testi nuovi):

1. **Iron Gate VPN** (icona scudo esistente): "Guardia attiva a 6 test: se il tunnel VPN cade, i torrent vengono bloccati prima che un byte esca in chiaro e riprendono da soli al ripristino. Un'eccezione? Sblocca la guardia per 15 minuti, con riarmo automatico." (chiavi `f1-t`, `f1-p`)
2. **Ricerca torrent in-app** (icona lente — aggiungere SVG search): "Cerca su tutti i tracker configurati in Prowlarr: film, serie, audio, software. Filtra per seed minimo, ordina e aggiungi il magnete con un click." (chiavi `f2-t`, `f2-p` — SPOSTARE: l'attuale f2 e' Dashboard, che diventa f3)
3. **Dashboard live** (icona grafico): testo attuale f2-p invariato (chiavi `f3-t`, `f3-p`)
4. **Torrent per torrent** (chiavi `f4-t`, `f4-p`, testo invariato)
5. **Stack Docker** (chiavi `f5-t`, `f5-p`, testo invariato)
6. **Tray nativo** (chiavi `f6-t`, `f6-p`, testo invariato)

Rimuovere la card "Cross-platform" (f6 attuale). Ordine delle chiavi nel dict: rinominate in `f1..f6` con i nuovi contenuti (niente chiavi orfane).

- [ ] **Step 3: Sezione Installazione**

Dopo la sezione `#features` (prima di `#arch`), inserire:

```html
  <section class="section" id="install">
    <div class="wrap">
      <h2 data-i18n="i-title">Installazione in 6 passi</h2>
      <p class="sub" data-i18n="i-sub">Da zero a protetto in meno di 15 minuti. Richiede Docker Desktop (Windows) o Docker Engine (Linux).</p>
      <div class="grid">
        <div class="card"><h3 data-i18n="i1-t">1. Installa Docker Desktop</h3><p data-i18n="i1-p">Prerequisito: Windows 10/11 con WSL2. Scaricalo da docker.com e avvialo.</p></div>
        <div class="card"><h3 data-i18n="i2-t">2. Avvia il tuo stack</h3><p data-i18n="i2-p">Un docker-compose con gluetun (VPN) e qBittorrent legato al tunnel. SurfDock rileva lo stack da solo.</p></div>
        <div class="card"><h3 data-i18n="i3-t">3. Scarica SurfDock</h3><p data-i18n="i3-p">Installer Windows NSIS dalla pagina delle release. Se SmartScreen si lamenta: e' l'installer non firmato, clicca "Ulteriori informazioni" e "Esegui comunque".</p></div>
        <div class="card"><h3 data-i18n="i4-t">4. Primo avvio</h3><p data-i18n="i4-p">Il wizard ti guida: account, chiave licenza (puoi saltarla), provider VPN, fonti torrent.</p></div>
        <div class="card"><h3 data-i18n="i5-t">5. Verifica la guardia</h3><p data-i18n="i5-p">Nel footer leggi ARMED con Iron Gate 6/6: i torrent sono al sicuro, anche quando chiudi la finestra.</p></div>
        <div class="card"><h3 data-i18n="i6-t">6. Attiva la licenza</h3><p data-i18n="i6-p">Basic 29 EUR o Dev 79 EUR, una tantum, con 12 mesi di aggiornamenti. Nessun abbonamento.</p></div>
      </div>
    </div>
  </section>
```

NB: la card 2 avra' anche un blocco `<pre class="arch">` con compose minimale SOLO se la griglia lo consente; altrimenti niente pre nella card (mantenere il testo puro: la griglia e' la priorita').

- [ ] **Step 4: FAQ 12 card**

Sostituire il contenuto di `<div class="grid">` della sezione `#faq` con 12 card. Testi IT (e traduzioni EN nel dict):

1. `q1` Serve un abbonamento VPN? — "No: la guardia automatica funziona con gluetun/Mullvad; il wizard supporta anche NordVPN, ProtonVPN, Surfshark e OpenVPN."
2. `q2` Cosa succede se cade la VPN? — "I torrent vengono sospesi immediatamente e ripresi in automatico al ripristino del tunnel. Jellyfin resta raggiungibile in LAN."
3. `q3` Funziona senza finestra aperta? — "Si: vive nel tray, si avvia con Windows e un watchdog la riavvia se l'health endpoint non risponde."
4. `q4` Quanto costa? — "Basic 29 EUR una tantum: installer e 1 anno di aggiornamenti. Dev 79 EUR: anche il sorgente completo. Nessun abbonamento."
5. `q5` Windows mostra "PC protetto". Cosa faccio? — "L'installer non e' firmato con certificato commerciale: clicca 'Ulteriori informazioni' poi 'Esegui comunque'. Nessun codice malevolo: il sorgente e' pubblico su GitHub."
6. `q6` Devo installare Docker? — "Si: SurfDock controlla Docker e qBittorrent. Serve Docker Desktop (Windows con WSL2) o Docker Engine (Linux)."
7. `q7` Posso provarlo prima di comprare? — "Certo: tutte le funzioni sono attive anche senza chiave. Il badge Free/Basic/Dev e' la licenza, non un blocco."
8. `q8` La chiave scade? — "La chiave vale 365 giorni, lo stesso periodo degli aggiornamenti. Dopo, l'app continua a funzionare: non rinnovi, smetti solo di ricevere nuove versioni."
9. `q9` Funziona con qualunque VPN? — "La guardia automatica e' ottimizzata per gluetun/Mullvad. Per le altre VPN del wizard la protezione parte dai test che il tuo stack supporta."
10. `q10` Jellyfin resta accessibile se cade la VPN? — "Si, in LAN: la guardia blocca solo il traffico torrent, non i servizi locali."
11. `q11` Come ricevo gli aggiornamenti? — "Scarichi il nuovo installer dalla stessa pagina delle release: dentro c'e' l'update della tua versione. I 12 mesi sono inclusi nella licenza."
12. `q12` Posso usarla su piu' PC? — "La licenza copre 1 home server. Hai due server? Una licenza per ciascuno."

Per ogni card: `<div class="card"><h3 data-i18n="qN-t">...</h3><p data-i18n="qN-p">...</p></div>` con N da 1 a 12.

- [ ] **Step 5: dict IT/EN completi**

Nel blocco `dict` del file, aggiornare/aggiungere TUTTE le chiavi usate dalle nuove stringhe (IT e EN), rimuovendo le orfane (vecchia `hero-sub` "il guardiano...", vecchia `f6` cross-platform). Le chiavi `hero-title`, `nav-*`, `a-*`, `p-*`, `q-title`, `foot-note` restano invariate.

- [ ] **Step 6: Verifica HTML**

Run: `python -m http.server 8000 --directory landing` in background, poi `curl -s http://127.0.0.1:8000/ | grep -c 'data-i18n'` (deve essere alto) e verificare che le immagini referenziate esistano:

```bash
ls landing/assets/screens/*.png
```

Verifica strutturale: ogni `data-i18n` presente nel dict IT e EN. Controllo rapido con grep:

```bash
grep -o 'data-i18n="[^"]*"' landing/index.html | sort -u > /tmp/used.txt
python - <<'EOF'
import re, json
html = open('landing/index.html', encoding='utf-8').read()
used = set(re.findall(r'data-i18n="([^"]+)"', html))
d = html[html.index('const dict'):]
missing = []
for k in used:
    if f"'{k}':" not in d and f'"{k}":' not in d:
        missing.append(k)
print('chiavi usate:', len(used), '| mancanti:', missing or 'nessuna')
EOF
```

Expected: "mancanti: nessuna" (script inline, le chiavi EN derivano dalla struttura del dict).

- [ ] **Step 7: Commit**

```bash
git add landing/index.html landing/assets/screens
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: landing con messaggio chiave, galleria, installazione e 12 FAQ"
```

---

### Task 7: Copia in docs + verifica Pages + taskgemini

**Files:**
- Modify: `docs/index.html` (copia byte-identica di `landing/index.html`)
- Modify: `C:\Users\umber\Documents\MyProjects\07-iot-hardware\jellyfin-server\taskgemini\10-STRIPE-PAYMENT-LINKS.md`

**Interfaces:**
- Consumes: Task 6 (landing finale)
- Produces: sito pubblico aggiornato + doc taskgemini aggiornata

- [ ] **Step 1: Copia byte-identica**

```bash
cp landing/index.html docs/index.html
cmp landing/index.html docs/index.html
```

Expected: cmp esito 0 (nessun output).

- [ ] **Step 2: Verifica GitHub Pages**

Commit + push, poi:

```bash
curl -s https://umbertodip.github.io/surfdock/ | grep -o 'I tuoi torrent, protetti in automatico dalla VPN'
curl -s https://umbertodip.github.io/surfdock/ | grep -o 'assets/screens/dashboard.png'
```

Expected: entrambi i pattern presenti (il deploy Pages richiede ~1 minuto: se il primo curl fallisce, attendere 60s e riprovare).

- [ ] **Step 3: Verifica immagini servite**

```bash
curl -sI https://umbertodip.github.io/surfdock/assets/screens/dashboard.png | head -1
```

Expected: HTTP/2 200.

- [ ] **Step 4: Aggiornare taskgemini**

In `07-iot-hardware/jellyfin-server/taskgemini/10-STRIPE-PAYMENT-LINKS.md` aggiungere sotto lo stato release:

```markdown
### Landing v2 (2026-08-03)

- Landing aggiornata: messaggio chiave "torrent protetti in automatico dalla VPN", galleria screen reali (blur privacy), sezione installazione 6 passi, 12 FAQ.
- Nuova feature app: "Sblocca temporaneamente" Iron Gate (POST /api/gate/unlock?minutes=N, /api/gate/arm), countdown UI + riarmo automatico.
- Bottone Scarica punta a https://github.com/UmbertoDiP/surfdock/releases/latest
```

Commit nel repo jellyfin-server con identita' standard.

- [ ] **Step 5: Commit finale surfdock**

```bash
git add docs/index.html
git -c user.name="Umberto Di Puorto" -c user.email="umberto.dipuorto2@consultant.aruba.it" commit -m "surfdock: landing pubblicata su Pages (copia docs)"
git push
```

Push anche del repo jellyfin-server dopo il commit del passo 4.

---

## Self-Review

- **Spec coverage:** Sezione 1 (unlock) -> Task 1-4; Sezione 3 (screenshot) -> Task 5; Sezione 2 (landing: hero/galleria/features/install/FAQ/i18n) -> Task 6-7. Vincoli verita' (Windows only, SmartScreen, Mullvad) coperti in Task 6 (badge, FAQ q5, install i3, FAQ q9). Nessuna sezione scoperte.
- **Placeholder scan:** nessun TBD; unica zona aperta volutamente: click CDP/utente nelle viste modali (Task 5 Step 3) — risolto con fallback dichiarati.
- **Type consistency:** `GateUnlockState` usata in gateUnlock.ts, healthServer e test con gli stessi campi (`unlocked/until/remainingSec/expiresAt`); campi `/health` `gate_unlocked/gate_until/gate_remaining` coerenti tra Task 2 e Task 3 (`SentinelState`).
- **Nota onesta:** nel Task 2 il comando di lancio con `&` in bash puo' non gestire il processo figlio; l'implementatore deve assicurarsi che l'app sia attiva (es. lanciarla prima, separatamente) prima di testare l'API.
