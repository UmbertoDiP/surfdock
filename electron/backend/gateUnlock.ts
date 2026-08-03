import fs from 'fs';
import path from 'path';
import { GATE_UNLOCK_FILE } from './config';
import { igLog } from './log';

const UNLOCK_DEFAULT_MIN = 15;
const UNLOCK_MAX_MIN = 60;

let gateUnlockPath = GATE_UNLOCK_FILE;

export function setGateUnlockPath(p: string) {
  gateUnlockPath = p;
}

export interface GateUnlockState {
  unlocked: boolean;
  until: string | null;
  remainingSec: number;
  expiresAt: number | null;
}

function loadUnlock(): { expiresAt: number } | null {
  try {
    return JSON.parse(fs.readFileSync(gateUnlockPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function isGateUnlocked(): boolean {
  const data = loadUnlock();
  if (!data || typeof data.expiresAt !== 'number') return false;
  if (Date.now() >= data.expiresAt) {
    try { fs.unlinkSync(gateUnlockPath); } catch { /* no-op */ }
    return false;
  }
  return true;
}

export function unlockGate(minutes: number): GateUnlockState {
  const m = Math.min(Math.max(Number.isFinite(minutes) ? Math.floor(minutes) : UNLOCK_DEFAULT_MIN, 1), UNLOCK_MAX_MIN);
  const expiresAt = Date.now() + m * 60_000;
  try {
    fs.mkdirSync(path.dirname(gateUnlockPath), { recursive: true });
    fs.writeFileSync(gateUnlockPath, JSON.stringify({ expiresAt }, null, 2), 'utf-8');
  } catch (e: any) {
    igLog(`[ERR] unlock persist: ${e?.message || e}`);
  }
  igLog(`[GATE] unlock richiesto: ${m} min (fino a ${new Date(expiresAt).toISOString()})`);
  return getGateUnlockState();
}

export function armGate(): GateUnlockState {
  try { fs.unlinkSync(gateUnlockPath); } catch { /* no-op */ }
  igLog('[GATE] riarmato manualmente');
  return getGateUnlockState();
}

export function getGateUnlockState(): GateUnlockState {
  const data = loadUnlock();
  if (!data || typeof data.expiresAt !== 'number' || Date.now() >= data.expiresAt) {
    return { unlocked: false, until: null, remainingSec: 0, expiresAt: null };
  }
  return {
    unlocked: true,
    until: new Date(data.expiresAt).toISOString(),
    remainingSec: Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)),
    expiresAt: data.expiresAt,
  };
}
