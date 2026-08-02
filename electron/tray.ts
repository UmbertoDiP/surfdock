import { Tray, Menu, Notification, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { makeIcon, iconColorForState, ICON_COLORS } from './backend/iconGen';
import { STATE, refreshState, onStateUpdate } from './backend/state';
import { QB } from './backend/qbit';
import { spawnDetached } from './backend/ironGate';
import { focusMain } from './windowManager';
import { appState } from './state';
import { ROOT, DOCKER_SVCS } from './backend/config';

let tray: Tray | null = null;

export function notify(title: string, body: string) {
  try {
    new Notification({ title, body }).show();
  } catch { /* no-op */ }
}

function trayTitle(): string {
  const vpnT: Record<string, string> = {
    healthy: 'VPN OK', unhealthy: 'VPN GIU\'', starting: 'VPN avvio',
    missing: 'no VPN', error: 'VPN err', unknown: 'VPN?',
  };
  return `SurfDock - ${vpnT[STATE.vpn] || '?'} | DL:${STATE.dl} Pausa:${STATE.pa}`;
}

function dockerStatusLine(): string {
  const up = Object.values(STATE.docker).filter(v => v === 'running').length;
  const sunMap: Record<string, string> = { running: 'OK', stopped: 'off', missing: 'n/a' };
  return `Docker: ${up}/${DOCKER_SVCS.length} | Sunshine: ${sunMap[STATE.sun] || '?'}`;
}

function avviaTutto() {
  try {
    const script = path.join(ROOT, 'scripts', 'avvia_tutto.ps1');
    if (!fs.existsSync(script)) {
      notify('SurfDock', 'Script avvia_tutto.ps1 non trovato in ROOT/scripts');
      return;
    }
    spawnDetached('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-NoTray'], ROOT);
    notify('SurfDock', 'Avvia Tutto lanciato. Apri il pannello per seguire il progresso.');
  } catch (e: any) {
    notify('SurfDock', `Errore: ${String(e?.message || e).slice(0, 50)}`);
  }
}

async function fermaTutto() {
  try {
    await QB.stopAll();
    notify('SurfDock', 'Torrent sospesi.');
  } catch (e: any) {
    notify('SurfDock', `Errore stop torrent: ${String(e?.message || e).slice(0, 50)}`);
  }
  try {
    spawnDetached('docker', ['compose', 'down'], ROOT);
    notify('SurfDock', 'Docker stack fermato.');
  } catch (e: any) {
    notify('SurfDock', `Errore Docker down: ${String(e?.message || e).slice(0, 50)}`);
  }
}

function rebuildTray() {
  if (!tray) return;
  tray.setImage(makeIcon(iconColorForState(STATE.vpn, STATE.dl)));
  tray.setToolTip(trayTitle());
  const menu = Menu.buildFromTemplate([
    { label: 'Mostra Pannello', click: () => focusMain() },
    { label: 'Avvia Tutto', click: () => avviaTutto() },
    { label: 'Ferma Tutto', click: () => { void fermaTutto(); } },
    { type: 'separator' },
    { label: trayTitle(), enabled: false },
    { label: dockerStatusLine(), enabled: false },
    { type: 'separator' },
    {
      label: 'Esci',
      click: () => {
        appState.quitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}

export function createTray() {
  tray = new Tray(makeIcon(ICON_COLORS.idle));
  tray.on('double-click', () => focusMain());
  rebuildTray();
  onStateUpdate(rebuildTray);
  return tray;
}

export function destroyTray() {
  if (tray) { tray.destroy(); tray = null; }
}
