import { ipcMain, shell } from 'electron';
import fs from 'fs';
import os from 'os';
import { appState } from './state';
import { LAN_PREFERRED_PREFIX } from './backend/config';

// Miglior IP LAN per i link servizi: la subnet preferita (configurabile), altrimenti il
// primo IPv4 privato disponibile. Mai localhost, perche' i link devono funzionare anche
// dagli altri dispositivi sulla LAN.
function bestLanIp(): string | null {
  const ifaces = os.networkInterfaces();
  const all: string[] = [];
  const reserved: string[] = [];
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      all.push(net.address);
      if (net.address.startsWith(LAN_PREFERRED_PREFIX)) reserved.push(net.address);
    }
  }
  return reserved[0] || all[0] || null;
}

export function registerIpc() {
  ipcMain.handle('get-theme', () => {
    try {
      return JSON.parse(fs.readFileSync(appState.settingsPath, 'utf-8')).theme || 'dark';
    } catch { return 'dark'; }
  });

  ipcMain.on('set-theme', (_e, theme) => {
    try {
      const s = JSON.parse(fs.readFileSync(appState.settingsPath, 'utf-8'));
      s.theme = theme;
      fs.writeFileSync(appState.settingsPath, JSON.stringify(s, null, 2));
    } catch {
      fs.writeFileSync(appState.settingsPath, JSON.stringify({ theme }, null, 2));
    }
  });

  ipcMain.handle('get-server-urls', () => {
    const ip = bestLanIp();
    const base = ip ? `http://${ip}` : 'http://localhost';
    return {
      base,
      services: [
        { label: 'Jellyfin', url: `${base}:8096` },
        { label: 'qBittorrent', url: `${base}:8082` },
        { label: 'Sonarr', url: `${base}:8989` },
        { label: 'Radarr', url: `${base}:7878` },
        { label: 'Prowlarr', url: `${base}:9696` },
      ],
    };
  });

  ipcMain.on('open-external', (_e, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  ipcMain.on('window-minimize', () => appState.mainWindow?.minimize());
  ipcMain.on('window-close', () => appState.mainWindow?.close());
}
