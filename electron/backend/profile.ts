import fs from 'fs';
import path from 'path';
import { ROOT, ADMIN_EMAIL, CORSARO_NERO } from './config';
import { getSourceByName, addSource } from './sources';

export interface VpnConnector {
  id: string;
  provider: string;
  label: string;
  username: string;
  password: string;
  server: string;
  enabled: boolean;
  addedAt: string;
}

export interface UserProfile {
  email: string;
  displayName: string;
  role: 'admin' | 'user' | null;
  vpnEnabled: boolean;
  vpn: VpnConnector[];
  wizardDone: boolean;
  updatedAt: string;
}

const PROFILE_FILE = path.join(ROOT, 'config', 'surfdock-profile.json');

const DEFAULT_PROFILE: UserProfile = {
  email: '',
  displayName: '',
  role: null,
  vpnEnabled: true,
  vpn: [],
  wizardDone: false,
  updatedAt: '',
};

function load(): UserProfile {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8')) as UserProfile;
      return { ...DEFAULT_PROFILE, ...raw, vpn: Array.isArray(raw.vpn) ? raw.vpn : [] };
    }
  } catch { /* no-op */ }
  return { ...DEFAULT_PROFILE };
}

let cached = load();

function persist() {
  try {
    fs.mkdirSync(path.dirname(PROFILE_FILE), { recursive: true });
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(cached, null, 2), 'utf-8');
  } catch { /* no-op */ }
}

export function getProfile(): UserProfile {
  return { ...cached, vpn: cached.vpn.map(c => ({ ...c })) };
}

// Auto-configura il tracker privato dell'admin, visibile solo al suo account.
function ensureAdminSource() {
  if (!CORSARO_NERO.announceUrl) return;
  if (getSourceByName('Corsaro Nero')) return;
  addSource({
    name: 'Corsaro Nero',
    announceUrl: CORSARO_NERO.announceUrl,
    username: CORSARO_NERO.username,
    password: CORSARO_NERO.password,
  });
}

export function setEmail(email: string, displayName: string): UserProfile {
  const e = (email || '').trim().toLowerCase();
  cached.email = e;
  cached.displayName = (displayName || '').trim();
  cached.role = e === ADMIN_EMAIL ? 'admin' : e ? 'user' : null;
  if (cached.role === 'admin') ensureAdminSource();
  cached.updatedAt = new Date().toISOString();
  persist();
  return getProfile();
}

export function setVpnEnabled(enabled: boolean): UserProfile {
  cached.vpnEnabled = enabled;
  cached.updatedAt = new Date().toISOString();
  persist();
  return getProfile();
}

export function addVpnConnector(c: { provider: string; label: string; username: string; password: string; server: string }): UserProfile {
  const entry: VpnConnector = {
    ...c,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    enabled: true,
    addedAt: new Date().toISOString(),
  };
  cached.vpn.push(entry);
  cached.vpnEnabled = true;
  cached.updatedAt = new Date().toISOString();
  persist();
  return getProfile();
}

export function removeVpnConnector(id: string): UserProfile {
  cached.vpn = cached.vpn.filter(c => c.id !== id);
  cached.updatedAt = new Date().toISOString();
  persist();
  return getProfile();
}

export function markWizardDone(): UserProfile {
  cached.wizardDone = true;
  cached.updatedAt = new Date().toISOString();
  persist();
  return getProfile();
}

export function wizardNeeded(): boolean {
  return !cached.wizardDone;
}
