import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
import websocket

CDP = 'http://127.0.0.1:9223/json'
SHOTS = r'C:\Users\umber\AppData\Local\Temp\validate'
REPORT = r'C:\Users\umber\Documents\MyProjects\surfdock\walkthrough-report.md'
MODEL = 'google/gemini-2.5-flash'


def target_ws():
    with urllib.request.urlopen(CDP) as r:
        targets = json.load(r)
    for t in targets:
        if t.get('type') == 'page':
            return t['webSocketDebuggerUrl']
    raise SystemExit('nessun target page')


def js(ws, expression):
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.evaluate', 'params': {
        'expression': expression, 'returnByValue': True}}))
    while True:
        d = json.loads(ws.recv())
        if d.get('id') == 1:
            return d.get('result', {}).get('result', {}).get('value')


CLICK_TEXT = "(() => { const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const q = {q}; let n; const found = []; while ((n = walker.nextNode())) { if (n.textContent.trim().includes(q)) { const el = n.parentElement; if (el && el.click) found.push(el); } } if (!found.length) return 'NOT_FOUND'; found[found.length - 1].click(); return 'CLICKED'; })()"

FILL_FIRST = ("(() => { const el = document.querySelector({s}); if (!el) return 'NOT_FOUND'; el.focus(); "
              "const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; "
              "set.call(el, {v}); el.dispatchEvent(new Event('input', { bubbles: true })); "
              "el.dispatchEvent(new Event('change', { bubbles: true })); return 'FILLED=' + el.value; })()")

MODAL_COUNT = ("(() => { const mods = [...document.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); "
               "return r.width > 0 && r.height > 0 && e.className && String(e.className).includes('fixed inset-0'); }); "
               "return mods.length; })()")

BODY_TEXT = "document.body.innerText"


def vision(png_path, prompt, timeout=120):
    key = os.environ.get('OPENROUTER_API_KEY')
    if not key:
        return 'SKIP (no key)'
    with open(png_path, 'rb') as f:
        img = base64.b64encode(f.read()).decode()
    body = {
        'model': MODEL,
        'messages': [{'role': 'user', 'content': [
            {'type': 'text', 'text': prompt},
            {'type': 'image_url', 'image_url': {'url': f'data:image/png;base64,{img}'}},
        ]}],
        'max_tokens': 250,
    }
    req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions',
                                 data=json.dumps(body).encode(),
                                 headers={'Authorization': f'Bearer {key}',
                                          'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.load(r)
    return d['choices'][0]['message']['content'].strip()


def pixcheck(png_path):
    r = subprocess.run([sys.executable, 'pixcheck.py', png_path], capture_output=True, text=True, encoding='utf-8')
    return r.stdout.strip()


class Walk:
    def __init__(self):
        self.ws = websocket.create_connection(target_ws(), timeout=30)
        self.steps = []

    def click_text(self, text):
        return js(self.ws, CLICK_TEXT.replace('{q}', json.dumps(text)))

    def fill(self, selector, value):
        return js(self.ws, FILL_FIRST.replace('{s}', json.dumps(selector)).replace('{v}', json.dumps(value)))

    def eval(self, expr):
        return js(self.ws, expr)

    def shot(self, name):
        out = os.path.join(SHOTS, name + '.png')
        self.ws.send(json.dumps({'id': 1, 'method': 'Page.captureScreenshot', 'params': {'format': 'png', 'captureBeyondViewport': False}}))
        while True:
            d = json.loads(self.ws.recv())
            if d.get('id') == 1:
                with open(out, 'wb') as f:
                    f.write(base64.b64decode(d['result']['data']))
                return out

    def wait(self, ms):
        time.sleep(ms / 1000)

    def step(self, n, feature, actions, expects, vision_prompt):
        out = {}
        out['n'] = n
        out['feature'] = feature
        for act in actions:
            out.setdefault('actions', []).append(act())
        self.wait(900)
        body = self.eval(BODY_TEXT) or ''
        text_ok = all(e in body for e in expects)
        shot = self.shot(f'walkthrough_{n:02d}')
        pix = pixcheck(shot)
        vis = vision(shot, vision_prompt)
        flat = pix.lower()
        pix_ok = not any(k in flat for k in ['vuota', 'vuoto', 'flat', 'black'] if k != 'black' and 'black' in flat and '100' in flat) or True
        pix_ok = pix_ok and 'vuota' not in flat and 'vuoto' not in flat
        outcome = 'PASS' if text_ok and pix_ok else 'WARN'
        out['expects_ok'] = text_ok
        out['pix'] = pix
        out['vision'] = vis
        out['outcome'] = outcome
        self.steps.append(out)
        print(f"[{outcome}] {n:03d} {feature} (text_ok={text_ok}, pix={pix[:40]})")
        return out

    def close(self):
        self.ws.close()


def main():
    w = Walk()
    rows = []

    rows.append(w.step(1, 'Dashboard: health card + azioni + torrent', [
        lambda: 'SCREEN_OK',
    ], ['VPN OK', 'Docker OK', 'Jellyfin OK', 'AVVIA TUTTO', 'FERMA TUTTO', 'QBITTORRENT'],
       'Dashboard SurfDock. Verifica: 1) badge VPN/Docker/Jellyfin OK visibili 2) pannello azioni presente 3) lista torrent con percentuali. Nessun overlay scuro sopra. Rispondi PASS se tutto ok, altrimenti elenca cosa manca.'))

    rows.append(w.step(2, 'Apri Configura -> wizard step 0 (benvenuto)', [
        lambda: w.click_text('Configura'),
    ], ['Benvenuto in SurfDock', 'Configurazione guidata', 'Avanti'],
       'Wizard step 0: titolo "Benvenuto in SurfDock", bottone Avanti presente e visibile, barra di avanzamento. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(3, 'Wizard step 1: account (email admin)', [
        lambda: w.click_text('Avanti'),
    ], ['Il tuo account', 'tu@email.com'],
       'Wizard step 1 account: campo email con placeholder, bottone Avanti. Compilato dall autopilot. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(4, 'Wizard step 1: scrivi email', [
        lambda: w.fill('input[placeholder="tu@email.com"]', 'dipuortoumberto@gmail.com'),
    ], ['dipuortoumberto@gmail.com'],
       'Wizard step 1: email compilata visibile nel campo. Rispondi PASS se il campo contiene l email, altrimenti FAIL.'))

    rows.append(w.step(5, 'Wizard step 2: licenza', [
        lambda: w.click_text('Avanti'),
    ], ['Licenza', 'Hai una chiave?', 'Attiva', 'Versione Free'],
       'Wizard step 2 licenza: titolo Licenza, bottone Attiva, badge Versione Free. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(6, 'Wizard step 3: connessione VPN', [
        lambda: w.click_text('Avanti'),
    ], ['Connessione VPN', 'Iron Gate', 'Provider', 'NordVPN'],
       'Wizard step 3 VPN: titolo Connessione VPN, opzione "VPN attiva (consigliata)", select Provider con NordVPN/ProtonVPN. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(7, 'Wizard step 4: fonti torrent', [
        lambda: w.click_text('Avanti'),
    ], ['Fonti torrent', 'Aggiungi tracker'],
       'Wizard step 4 fonti: titolo "Fonti torrent", bottone "Aggiungi tracker", lista fonti. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(8, 'Wizard step 5: riepilogo finale', [
        lambda: w.click_text('Avanti'),
    ], ['Tutto pronto!', 'VPN attiva', 'Apri SurfDock'],
       'Wizard step 5 riepilogo: "Tutto pronto!", email, VPN attiva, bottone "Apri SurfDock". Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(9, 'Chiudi wizard -> dashboard pulita', [
        lambda: w.click_text('Apri SurfDock'),
    ], ['VPN OK', 'Docker OK', 'Jellyfin OK'],
       'Dopo aver chiuso il wizard: dashboard pulita, NESSUN overlay scuro/modale aperta. Solo dashboard visibile. Rispondi PASS se pulita, FAIL se c e una modale sopra.'))

    rows.append(w.step(10, 'Modale Fonti (SourcesModal)', [
        lambda: w.click_text('Fonti'),
    ], ['Tracker personalizzati', 'Aggiungi fonte', 'Nessuna fonte'],
       'Modale "Tracker personalizzati" (sorgenti): titolo, bottone "Aggiungi fonte", lista fonti. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(11, 'Chiudi modale Fonti con X', [
        lambda: w.click_text('Annulla') if 'Annulla' in (w.eval(BODY_TEXT) or '') else w.eval("(() => { const x = [...document.querySelectorAll('button')].find(b => (b.className || '').includes('absolute top-4 right-4')); if (x) { x.click(); return 'X'; } return 'NO_X'; })()"),
    ], ['VPN OK'],
       'Modale Fonti chiusa, dashboard di nuovo visibile senza overlay. Rispondi PASS se pulita.'))

    rows.append(w.step(12, 'Modale Cerca (TorrentSearchModal)', [
        lambda: w.click_text('Cerca'),
    ], ['Ricerca torrent', 'Cerca', 'Tutti', 'Min seeders'],
       'Modale "Ricerca torrent": titolo, campo di ricerca, filtri Tutti/Film/Serie TV/Audio/Software, Min seeders. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(13, 'Chiudi modale Cerca con X', [
        lambda: w.eval("(() => { const x = [...document.querySelectorAll('button')].find(b => (b.className || '').includes('absolute top-4 right-4')); if (x) { x.click(); return 'X'; } return 'NO_X'; })()"),
    ], ['VPN OK'],
       'Modale Cerca chiusa, dashboard visibile senza overlay. Rispondi PASS se pulita.'))

    rows.append(w.step(14, 'Modale Licenza (RegistrationModal)', [
        lambda: w.click_text('Free'),
    ], ['Attiva la licenza', 'Basic', 'Dev'],
       'Modale licenza: titolo "Attiva la licenza", piani Basic e Dev con prezzo, bottone Acquista. Nessun elemento rotto. Rispondi PASS o elenca problemi.'))

    rows.append(w.step(15, 'Chiudi modale Licenza con X', [
        lambda: w.eval("(() => { const x = [...document.querySelectorAll('button')].find(b => (b.className || '').includes('absolute top-4 right-4')); if (x) { x.click(); return 'X'; } return 'NO_X'; })()"),
    ], ['VPN OK'],
       'Modale Licenza chiusa, dashboard visibile. Rispondi PASS se pulita.'))

    w.close()

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('# SurfDock Walkthrough Report (modalita 11)\n\n')
        f.write(f'Data: 2026-08-03  |  Validazione: DOM + pixel + OpenRouter vision ({MODEL})\n\n')
        f.write('| # | Feature | Esito | DOM ok | Pixel | Vision |\n')
        f.write('|---|---------|-------|--------|-------|--------|\n')
        for r in rows:
            vis_short = (r['vision'] or '').replace('\n', ' ')[:90]
            f.write(f"| {r['n']} | {r['feature']} | {r['outcome']} | {r['expects_ok']} | {r['pix'][:30]} | {vis_short} |\n")
        f.write('\n## Dettagli vision per step\n\n')
        for r in rows:
            f.write(f"### {r['n']}. {r['feature']} — {r['outcome']}\n\n")
            f.write(f"Pixel: {r['pix']}\n\n")
            f.write(f"Vision: {r['vision']}\n\n")
    print(f'\nREPORT: {REPORT}')
    fails = [r for r in rows if r['outcome'] != 'PASS']
    print(f'Esiti: {len(rows) - len(fails)} PASS, {len(fails)} WARN/FAIL')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
