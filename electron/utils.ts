import fs from 'fs';
import { appState } from './state';

export function logDebug(msg: string) {
  try {
    if (!appState.debugLogPath) return;
    fs.appendFileSync(appState.debugLogPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* no-op */ }
}
