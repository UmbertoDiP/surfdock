import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { unlockGate, armGate, getGateUnlockState, isGateUnlocked, setGateUnlockPath } from './gateUnlock';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-unlock-test-'));
const tmpFile = path.join(tmpDir, 'gate_unlock.json');
setGateUnlockPath(tmpFile);

describe('gateUnlock', () => {
  beforeEach(() => {
    try { fs.unlinkSync(tmpFile); } catch { /* no-op */ }
  });

  it('unlock imposta stato unlocked con countdown', () => {
    const s = unlockGate(15);
    expect(s.unlocked).toBe(true);
    expect(s.remainingSec).toBeGreaterThan(0);
    expect(s.remainingSec).toBeLessThanOrEqual(15 * 60);
    expect(s.until).not.toBeNull();
    expect(isGateUnlocked()).toBe(true);
  });

  it('minuti validi: clamp 1..60 e default su input non numerico', () => {
    expect(unlockGate(999).remainingSec).toBeLessThanOrEqual(60 * 60);
    expect(unlockGate(0).remainingSec).toBeLessThanOrEqual(60);
    const def = unlockGate(NaN);
    expect(def.remainingSec).toBeGreaterThan(14 * 60);
    expect(def.remainingSec).toBeLessThanOrEqual(15 * 60);
  });

  it('expired: stato locked e file rimosso', () => {
    unlockGate(1);
    fs.writeFileSync(tmpFile, JSON.stringify({ expiresAt: Date.now() - 1000 }), 'utf-8');
    expect(isGateUnlocked()).toBe(false);
    expect(fs.existsSync(tmpFile)).toBe(false);
    expect(getGateUnlockState().unlocked).toBe(false);
  });

  it('arm rimuove lo stato', () => {
    unlockGate(15);
    const s = armGate();
    expect(s.unlocked).toBe(false);
    expect(isGateUnlocked()).toBe(false);
    expect(fs.existsSync(tmpFile)).toBe(false);
  });
});
