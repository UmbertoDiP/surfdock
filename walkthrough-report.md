# SurfDock Walkthrough Report (modalita 11)

Data: 2026-08-03  |  Validazione: DOM + pixel + OpenRouter vision (google/gemini-2.5-flash)

| # | Feature | Esito | DOM ok | Pixel | Vision |
|---|---------|-------|--------|-------|--------|
| 1 | Dashboard: health card + azioni + torrent | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 2 | Apri Configura -> wizard step 0 (benvenuto) | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 3 | Wizard step 1: account (email admin) | WARN | False | C:\Users\umber\AppData\Local\T | PASS |
| 4 | Wizard step 1: scrivi email | WARN | False | C:\Users\umber\AppData\Local\T | PASS |
| 5 | Wizard step 2: licenza | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 6 | Wizard step 3: connessione VPN | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 7 | Wizard step 4: fonti torrent | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 8 | Wizard step 5: riepilogo finale | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 9 | Chiudi wizard -> dashboard pulita | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 10 | Modale Fonti (SourcesModal) | WARN | False | C:\Users\umber\AppData\Local\T | PASS |
| 11 | Chiudi modale Fonti con X | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 12 | Modale Cerca (TorrentSearchModal) | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 13 | Chiudi modale Cerca con X | PASS | True | C:\Users\umber\AppData\Local\T | PASS |
| 14 | Modale Licenza (RegistrationModal) | WARN | False | C:\Users\umber\AppData\Local\T | Problemi: - Il titolo richiesto è "Attiva la licenza", mentre il titolo visualizzato è "Li |
| 15 | Chiudi modale Licenza con X | PASS | True | C:\Users\umber\AppData\Local\T | PASS |

## Dettagli vision per step

### 1. Dashboard: health card + azioni + torrent — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_01.png
  size=(1425, 1023) mean=(24.4, 31.3, 39.5) std=(24.1, 27.2, 27.7) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 2. Apri Configura -> wizard step 0 (benvenuto) — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_02.png
  size=(1425, 1023) mean=(13.6, 19.6, 24.9) std=(15.1, 24.0, 26.2) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 3. Wizard step 1: account (email admin) — WARN

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_03.png
  size=(1425, 1023) mean=(13.3, 19.3, 24.8) std=(13.1, 20.4, 22.4) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 4. Wizard step 1: scrivi email — WARN

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_04.png
  size=(1425, 1023) mean=(13.3, 19.5, 25.0) std=(13.1, 21.1, 23.2) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 5. Wizard step 2: licenza — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_05.png
  size=(1425, 1023) mean=(13.0, 18.4, 23.7) std=(9.5, 17.8, 19.8) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 6. Wizard step 3: connessione VPN — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_06.png
  size=(1425, 1023) mean=(15.9, 26.7, 33.4) std=(20.1, 35.8, 39.7) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 7. Wizard step 4: fonti torrent — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_07.png
  size=(1425, 1023) mean=(13.5, 19.0, 24.4) std=(11.7, 19.5, 21.6) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 8. Wizard step 5: riepilogo finale — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_08.png
  size=(1425, 1023) mean=(13.1, 20.0, 25.6) std=(13.7, 25.1, 27.6) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 9. Chiudi wizard -> dashboard pulita — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_09.png
  size=(1425, 1023) mean=(24.4, 31.3, 39.5) std=(24.1, 27.2, 27.7) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 10. Modale Fonti (SourcesModal) — WARN

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_10.png
  size=(1425, 1023) mean=(14.3, 18.3, 23.5) std=(12.4, 13.3, 13.9) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 11. Chiudi modale Fonti con X — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_11.png
  size=(1425, 1023) mean=(24.4, 31.3, 39.5) std=(24.1, 27.2, 27.7) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 12. Modale Cerca (TorrentSearchModal) — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_12.png
  size=(1425, 1023) mean=(13.2, 17.9, 23.3) std=(11.4, 15.5, 17.0) black=0.0% white=0.0%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 13. Chiudi modale Cerca con X — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_13.png
  size=(1425, 1023) mean=(24.4, 31.3, 39.5) std=(24.1, 27.2, 27.7) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

### 14. Modale Licenza (RegistrationModal) — WARN

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_14.png
  size=(1425, 1023) mean=(16.3, 26.2, 32.7) std=(18.8, 34.9, 38.5) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: Problemi:
- Il titolo richiesto è "Attiva la licenza", mentre il titolo visualizzato è "Licenza SurfDock".

### 15. Chiudi modale Licenza con X — PASS

Pixel: C:\Users\umber\AppData\Local\Temp\validate\walkthrough_15.png
  size=(1425, 1023) mean=(24.4, 31.3, 39.5) std=(24.1, 27.2, 27.7) black=0.0% white=0.1%
  RISULTATO: OK (contenuto vario)

Vision: PASS

