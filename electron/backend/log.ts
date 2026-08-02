import fs from 'fs';
import { LOG_DIR, LOG_FILE, IG_LOG_FILE } from './config';

function ensureDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch { /* no-op */ }
}

// Rotazione semplice: oltre 2MB rinomina in .1 (come RotatingFileHandler del python).
function rotateIfNeeded(file: string) {
  try {
    const st = fs.statSync(file);
    if (st.size > 2 * 1024 * 1024) {
      try { fs.unlinkSync(file + '.1'); } catch { /* no-op */ }
      fs.renameSync(file, file + '.1');
    }
  } catch { /* no-op */ }
}

export function log(msg: string) {
  ensureDir();
  const line = `${new Date().toISOString()} [INFO] ${msg}`;
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8'); } catch { /* no-op */ }
  try { console.log(msg); } catch { /* no-op */ }
}

export function igLog(msg: string) {
  ensureDir();
  rotateIfNeeded(IG_LOG_FILE);
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  try { fs.appendFileSync(IG_LOG_FILE, `${ts} ${msg}\n`, 'utf-8'); } catch { /* no-op */ }
}
