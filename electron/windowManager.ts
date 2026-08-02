import { BrowserWindow, shell } from 'electron';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { appState } from './state';
import { logDebug } from './utils';

export function focusMain() {
  if (!appState.mainWindow || appState.mainWindow.isDestroyed()) return;
  if (appState.mainWindow.isMinimized()) appState.mainWindow.restore();
  if (!appState.mainWindow.isVisible()) appState.mainWindow.show();
  appState.mainWindow.focus();
}

function probeVite(devUrl: string, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const parsed = new URL(devUrl);
    const t = setTimeout(() => { resolve(false); }, timeoutMs);
    const req = http.get({ hostname: parsed.hostname, port: parseInt(parsed.port || '80'), path: '/' }, (res) => {
      clearTimeout(t);
      resolve(res.statusCode! < 500);
      res.resume();
    });
    req.on('error', () => { clearTimeout(t); resolve(false); });
  });
}

async function loadApp(win: BrowserWindow, __dirname: string) {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    logDebug('[loadApp] Dev mode: ' + devUrl);
    const alive = await probeVite(devUrl, 2000);
    if (alive) {
      win.loadURL(devUrl);
    } else {
      logDebug('[loadApp] Vite non raggiungibile, avvio automatico...');
      const parsed = new URL(devUrl);
      const port = parsed.port || '5174';
      const appRoot = path.join(__dirname, '..');
      appState.viteProcess = spawn('npx', ['vite', '--port', port, '--strictPort', '--host', '0.0.0.0'], {
        cwd: appRoot, stdio: 'pipe', shell: true, env: { ...process.env }
      });
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await probeVite(devUrl, 1500)) {
          logDebug('[loadApp] Vite pronto dopo ' + (i + 1) + 's');
          win.loadURL(devUrl);
          return;
        }
      }
      logDebug('[loadApp] Fallback a dist/index.html');
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } else {
    logDebug('[loadApp] Prod mode');
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

export function createWindow(__dirname: string) {
  appState.mainWindow = new BrowserWindow({
    width: 950,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, '../electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    useContentSize: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/surfdock-icon.ico'),
    title: 'SurfDock'
  });

  appState.mainWindow.setMenuBarVisibility(false);

  // Tray app: la chiusura nasconde la finestra, l'uscita vera passa dal menu tray.
  appState.mainWindow.on('close', (e) => {
    if (!appState.quitting) {
      e.preventDefault();
      appState.mainWindow?.hide();
    }
  });

  appState.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  loadApp(appState.mainWindow, __dirname);
}