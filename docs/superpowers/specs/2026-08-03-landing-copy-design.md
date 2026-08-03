# Design: Landing copy + feature "Sblocca temporaneamente" — SurfDock

Data: 2026-08-03
Stato: approvato dall'utente (sezioni 1-3)
Repo: `C:\Users\umber\Documents\MyProjects\surfdock`

## Obiettivo

Rifare la landing di SurfDock per comunicare il messaggio chiave — i torrent sono protetti in automatico dalla guardia VPN attiva (Iron Gate), sbloccabile se l'utente lo vuole — mostrando tutta l'app tramite screenshot reali. Per rendere il messaggio onesto serve prima una piccola feature nell'app: l'unlock temporaneo della guardia, oggi inesistente.

## Contesto verificato (analisi app)

- Unico demone Electron, API locale `127.0.0.1:5192` (`electron/backend/healthServer.ts`), stato pollato 8s, UI 3s.
- Iron Gate: protezione ATTIVA zero-trust, 6 test (gluetun health, egress Mullvad, routing tun0, bind qBittorrent, DNS, UDP tracker). VPN giu' => pausa tutti i torrent + 403 su add/resume/force + auto-resume al ripristino.
- NON esiste unlock/disarm temporaneo: unico off-switch = toggle wizard "VPN attiva/Nessuna VPN".
- Ricerca torrent in-app: TorrentSearchModal -> Prowlarr (Film/Serie/Audio/Software, min seeders, sort, add magnet).
- Docker: avvia/ferma stack (compose), 6 servizi monitorati. Tray, autostart, watchdog esterno.
- Licenza: HMAC-SHA256, chiavi SURFDK-BASIC/DEV, 365 giorni; tier `none` e' solo badge, nessun lock funzionale.
- UI: italiana primaria (wizard+registration IT/EN), dark `#0A0E14` + ciano `#06B6D4`, colonna verticale di pannelli, footer con status Iron Gate + Configura/Fonti/Cerca.
- Verita' da non vendere oltre il vero: installer SOLO Windows NSIS; non firmato (SmartScreen); egress check Mullvad-specifico.

## Sezione 1 — Feature: "Sblocca temporaneamente" (Iron Gate unlock)

Scopo: rendere vera la promessa del copy ("guardia attiva che puoi sbloccare se vuoi").

### Comportamento

- `POST /api/gate/unlock?minutes=N` (default 15, max 60): disarma SOLO l'enforcement (pausa torrent + blocco 403) per N minuti. I test diagnostici continuano; la UI mostra stato "gate aperto".
- Persistenza su file `config/gate_unlock.json` (expiry timestamp): sopravvive a riavvio app. Al boot, se expiry passato -> riarmo immediato; altrimenti riprende il countdown.
- `POST /api/gate/arm`: riarmo manuale immediato.
- Log dedicato e notifica tray.
- UI: bottone "Sblocca 15 min" nel footer accanto allo status Iron Gate, visibile quando la guardia e' GIU'. Countdown visibile ("Gate aperto — riarmo tra mm:ss" + "Riarma ora"). Conferma esplicita prima dell'unlock ("Senza la guardia i torrent viaggiano in chiaro dal tuo IP").
- i18n IT/EN.

### File

- `electron/backend/ironGate.ts` (logica unlock, check nel poller)
- `electron/backend/healthServer.ts` (route unlock/arm, stato nel /health)
- `electron/backend/state.ts` (esposizione stato unlock)
- `src/App.tsx` (footer status + azioni) + nuovo componente `src/components/GateUnlock.tsx`
- i18n UI (IT/EN)

### Verifica

API test con VPN giu' simulata: add torrent -> 403; unlock -> add ok; scaduto -> 403 di nuovo; riarmo manuale -> 403. Persistenza: riavvio con countdown attivo.

## Sezione 2 — Nuova landing (`landing/index.html` + copia in `docs/index.html`)

Regola: si modifica solo `landing/`, poi copia byte-identica in `docs/`.

### Hero

- Headline "SurfDock" + payoff nuovo: "I tuoi torrent, protetti in automatico dalla VPN".
- Sottotitolo: guardia attiva Iron Gate che protegge da sola, sbloccabile se vuoi; ricerca torrent integrata (trova e aggiunge in un click).
- CTA "Scarica per Windows" invariato (link release) + badge.
- Galleria screen (4-6 immagini reali, captions brevi): Dashboard (ARMED), Griglia torrent (titoli sfocati), Ricerca in-app, Docker stack, Wizard setup, Tray.

### Features (6 card, riordinate)

1. Iron Gate VPN — guardia attiva, blocca/riprende da sola, sbloccabile
2. Ricerca torrent in-app (SOSTITUISCE "Cross-platform", fuorviante: installer solo Windows) — cerca su tutti i tracker in Prowlarr, aggiungi col magnete
3. Dashboard live (8s)
4. Torrent per torrent
5. Stack Docker
6. Tray nativo

### Installazione (nuova sezione, 6 passi)

1. Installa Docker Desktop (WSL2)
2. Avvia lo stack con gluetun (snippet compose minimale)
3. Scarica SurfDock
4. Wizard 5 step
5. Iron Gate ARMED = protetto
6. Licenza Basic/Dev

Con nota SmartScreen (installer non firmato) e requisiti minimi.

### FAQ (12 card, griglia senza buchi a ogni breakpoint)

Esistenti (4): abbonamento VPN, caduta VPN, senza finestra, costo.
Nuove (8): SmartScreen; Docker/WSL2; trial prima dell'acquisto (funzioni non bloccate); scadenza chiave (365 giorni); VPN compatibili (gluetun/Mullvad + provider wizard); Jellyfin in LAN con VPN giu'; come ricevo 12 mesi di update; licenza = 1 home server.

### Pricing

Invariato (Basic 29 / Dev 79).

### i18n

Tutte le nuove stringhe in IT + EN (dizionario `dict` nel file).

## Sezione 3 — Pipeline screenshot (reali, blur privacy)

1. Cattura: app in dev (`npm run dev`) su stack reale attivo; cattura di: dashboard, griglia torrent, ricerca, docker panel, wizard, tray.
2. Blur: script Python (PIL) con sfocatura gaussiana su regioni sensibili (nomi torrent, hash, IP). Nessun contenuto di download reale pubblicato.
3. Asset: `landing/assets/screens/` (PNG ottimizzati). Nessun dato sensibile nel repo.
4. Verifica: ispezione di ogni immagine; blur piu' aggressivo o scarto se riconoscibile.
5. Screen "gate aperto" (VPN giu') solo dopo la Sezione 1; stato normale subito.

## Vincoli e verita'

- Installer Windows NSIS only -> nessuna promessa mac/linux nella landing.
- Non firmato -> FAQ SmartScreen.
- Egress Mullvad-specifico -> "gluetun/Mullvad".
- Tier licenza = badge (nessun lock): FAQ trial onesta.

## Ordinamento lavori

1. Sezione 1 (feature unlock) + test
2. Sezione 3 (screenshot: stato normale subito; stato unlocked dopo la 1)
3. Sezione 2 (landing copy + galleria + i18n)

## Fuori scope

- Firma codice installer
- Build mac/linux
- Lock funzionali per tier
