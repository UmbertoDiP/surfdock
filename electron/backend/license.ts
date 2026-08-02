import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ROOT } from './config';

const VALIDATOR_SECRET: string = process.env.SURFDOCK_LICENSE_SECRET || 'surfdock-validator-v1-2026';
const LICENSE_FILE = path.join(ROOT, 'config', 'surfdock-license.json');

export type LicenseTier = 'basic' | 'dev' | 'none';

export interface LicenseState {
  tier: LicenseTier;
  email: string;
  activatedAt: string;
  expiresAt: string;
  licenseKey: string;
}

const FREE_STATE: LicenseState = {
  tier: 'none',
  email: '',
  activatedAt: '',
  expiresAt: '',
  licenseKey: '',
};

function defaultState(): LicenseState {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      const raw = fs.readFileSync(LICENSE_FILE, 'utf-8');
      const data = JSON.parse(raw) as LicenseState;
      if (data.tier === 'basic' || data.tier === 'dev') return data;
    }
  } catch { /* no-op */ }
  return FREE_STATE;
}

let cached = defaultState();

export function getLicense(): LicenseState {
  return cached;
}

export function generateLicenseKey(tier: LicenseTier, email: string, expDays = 365): string {
  const ts = Date.now().toString(36);
  const data = `${tier}:surfdock-key:${ts}`;
  const hmac = crypto.createHmac('sha256', VALIDATOR_SECRET).update(data).digest('hex').toUpperCase();
  const token = hmac.slice(0, 20);
  return `SURFDK-${tier.toUpperCase()}-${ts}-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}-${token.slice(12, 16)}`;
}

export function validateLicenseKey(licenseKey: string): LicenseState {
  try {
    const cleaned = licenseKey.replace(/-/g, '').toUpperCase();
    if (!cleaned.startsWith('SURFDK')) return FREE_STATE;
    let tier: LicenseTier;
    let rest: string;
    // Formato: SURFDK + BASIC(5)|DEV(3) + ts36(8) + token HMAC(16).
    if (cleaned.startsWith('SURFDKBASIC')) { tier = 'basic'; rest = cleaned.slice(11); }
    else if (cleaned.startsWith('SURFDKDEV')) { tier = 'dev'; rest = cleaned.slice(9); }
    else return FREE_STATE;
    const keyPart = rest.slice(8, 24);
    // Il ts e' base36 case-sensitive: il generatore lo emette minuscolo.
    const tsPart = rest.slice(0, 8).toLowerCase();
    const expected = crypto.createHmac('sha256', VALIDATOR_SECRET)
      .update(`${tier}:surfdock-key:${tsPart}`)
      .digest('hex').toUpperCase().slice(0, 16);
    if (keyPart !== expected) return FREE_STATE;
    const expMs = parseInt(tsPart, 36);
    if (Number.isNaN(expMs)) return FREE_STATE;
    const expDate = new Date(expMs + 365 * 24 * 60 * 60 * 1000);
    return {
      tier,
      email: '',
      activatedAt: new Date(expMs).toISOString(),
      expiresAt: expDate.toISOString(),
      licenseKey,
    };
  } catch { return FREE_STATE; }
}

export function activateLicense(licenseKey: string): LicenseState {
  const state = validateLicenseKey(licenseKey);
  if (state.tier === 'none') return state;
  state.activatedAt = new Date().toISOString();
  try {
    fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch { /* no-op */ }
  cached = state;
  return state;
}

export function clearLicense() {
  try { if (fs.existsSync(LICENSE_FILE)) fs.unlinkSync(LICENSE_FILE); } catch { /* no-op */ }
  cached = FREE_STATE;
}