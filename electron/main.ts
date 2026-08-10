import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { appState } from './state';
import { logDebug } from './utils';
import { createWindow } from './windowManager';
import { registerIpc } from './ipcHandlers';
import { createTray, destroyTray, notify } from './tray';
import { log } from './backend/log';
import {
  setStartupPhase, ensureDockerDesktop, refreshState,
} from './backend/state';
import { startHealthServer } from './backend/healthServer';
import { ironGatePoller } from './backend/ironGate';
import { POLL_SEC } from './backend/config';

app.setPath('userData', path.join(app.getPath('appData'), 'LokinoSentinel'));
app.setPath('logs', path.join(app.getPath('userData'), 'logs'));

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  console.log('[SurfDock] Single instance lock not obtained. Another instance may be running or a stale lock exists.');
  console.log('[SurfDock] userData:', app.getPath('userData'));
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (appState.mainWindow) {
    if (appState.mainWindow.isMinimized()) appState.mainWindow.restore();
    appState.mainWindow.focus();
  }
});

// Sostituisce il vecchio .lnk python: login item nativo (Windows/macOS, dev e prod).
// Su Linux il login item non e' gestito da Electron: si usa un .desktop autostart manuale.
function setupAutostart() {
  try {
    if (process.platform === 'linux') {
      log('Autostart: usare ~/.config/autostart/surfdock.desktop su Linux');
      return;
    }
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath,
      args: app.isPackaged ? [] : [path.resolve(app.getAppPath())],
    });
    log('Autostart registrato (Login Item)');
  } catch (e: any) {
    log(`autostart err: ${e?.message || e}`);
  }
}

let stopping = false;
const isStopping = () => stopping;

async function bootBackend() {
  setStartupPhase('BOOT', 'Avvio sentinel...');
  log('=== SurfDock (Electron) - avvio demone ===');

  startHealthServer(5192);

  setStartupPhase('DOCKER_START', 'Avvio Docker Desktop...');
  const [dockerOk, dockerMsg] = await ensureDockerDesktop();
  setStartupPhase(dockerOk ? 'DOCKER_WAIT' : 'DOCKER_START', dockerMsg);
  log(`docker: ${dockerMsg}`);
  if (!dockerOk) notify('SurfDock - Avvio Docker Desktop', 'Attendo Docker...');

  // Iron Gate: gestisce da solo l'attesa Docker e le fasi GATE_COLD -> ARMED.
  void ironGatePoller(notify, isStopping);

  // State poller 8s (primo refresh immediato).
  void refreshState();
  const timer = setInterval(() => {
    if (stopping) { clearInterval(timer); return; }
    void refreshState();
  }, POLL_SEC * 1000);
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;

  appState.settingsPath = path.join(app.getPath('userData'), 'lokino-settings.json');
  appState.debugLogPath = path.join(app.getPath('userData'), 'lokino-debug.log');

  try { fs.writeFileSync(appState.debugLogPath, `[${new Date().toISOString()}] SurfDock start\n`); } catch { /* no-op */ }
  logDebug(`debug log: ${appState.debugLogPath}`);

  setupAutostart();
  registerIpc();
  createWindow(__dirname);
  createTray();
  void bootBackend();

  app.on('activate', function () {
    if (!appState.mainWindow || appState.mainWindow.isDestroyed()) createWindow(__dirname);
  });
});

// Tray app: resta viva in background anche senza finestre.
app.on('window-all-closed', function () { /* no-op: vive nel tray */ });

app.on('before-quit', () => {
  appState.quitting = true;
  stopping = true;
  destroyTray();
});
