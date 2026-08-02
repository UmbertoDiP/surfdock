import { BrowserWindow } from 'electron';

export const appState = {
  mainWindow: null as BrowserWindow | null,
  settingsPath: '',
  debugLogPath: '',
  viteProcess: null as any,
  quitting: false,
};
