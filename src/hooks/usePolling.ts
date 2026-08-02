export interface SentinelState {
  status: string;
  vpn: string;
  vpn_detail: string;
  iron_gate_down: boolean;
  startup_phase: string;
  startup_step: string;
  torrent: { dl: number; paused: number; seed: number; total: number; speed_kb?: number };
  rate?: { dl_limit_kb: number; dl_speed_kb: number };
  docker: { up: number; total: number; details: Record<string, string> };
  jellyfin: string;
  sunshine: string;
  games_manager: string;
  license_tier: string;
}

export interface StartupProgress {
  phase: string;
  step: number;
  total: number;
  detail: string;
  log: string[];
}

export interface TorrentDetail {
  hash: string;
  name: string;
  state: string;
  progress: number;
  size: number;
  dlspeed: number;
  upspeed: number;
  seeds: number;
  peers: number;
  eta: number;
  added_on: number;
  category: string;
}

const API = 'http://127.0.0.1:5192';

export async function fetchState(): Promise<SentinelState> {
  const res = await fetch(`${API}/health`);
  return res.json();
}

export async function fetchStartup(): Promise<StartupProgress> {
  const res = await fetch(`${API}/api/startup`);
  return res.json();
}

export async function fetchTorrents(): Promise<TorrentDetail[]> {
  const res = await fetch(`${API}/api/torrents`);
  return res.json();
}

export async function apiPost(path: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}${path}`, { method: 'POST' });
  return res.json();
}

export async function fetchRate(): Promise<{ dl_limit_kb: number; dl_speed_kb: number }> {
  const res = await fetch(`${API}/api/rate`);
  return res.json();
}

export async function setRateLimit(dlKb: number): Promise<{ ok: boolean; dl_limit_kb: number }> {
  const res = await fetch(`${API}/api/rate?dl=${dlKb}`, { method: 'POST' });
  return res.json();
}

export interface LicenseInfo {
  ok: boolean;
  tier: 'basic' | 'dev' | 'none';
  email: string | null;
  activated_at: string | null;
  expires_at: string | null;
  has_license: boolean;
  stripe_basic_url?: string;
  stripe_dev_url?: string;
}

export async function fetchLicense(): Promise<LicenseInfo> {
  const res = await fetch(`${API}/api/license`);
  return res.json();
}

export async function activateLicense(key: string): Promise<{ ok: boolean; tier: string; expires_at: string }> {
  const res = await fetch(`${API}/api/license/activate?key=${encodeURIComponent(key)}`, { method: 'POST' });
  return res.json();
}

export async function clearLicense(): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/api/license/clear`, { method: 'POST' });
  return res.json();
}

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

export interface ProfileResponse {
  ok: boolean;
  profile: UserProfile;
  admin_email: string | null;
  corsaro_configured: boolean;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${API}/api/profile`);
  return res.json();
}

export async function saveProfileEmail(email: string, displayName: string): Promise<ProfileResponse> {
  const res = await fetch(`${API}/api/profile/save?email=${encodeURIComponent(email)}&displayName=${encodeURIComponent(displayName)}`, { method: 'POST' });
  return res.json();
}

export async function setVpnEnabled(enabled: boolean): Promise<ProfileResponse> {
  const res = await fetch(`${API}/api/profile/vpn/set?enabled=${enabled}`, { method: 'POST' });
  return res.json();
}

export async function addVpnConnector(c: { provider: string; label: string; username: string; password: string; server: string }): Promise<ProfileResponse> {
  const p = new URLSearchParams(c);
  const res = await fetch(`${API}/api/profile/vpn/add?${p}`, { method: 'POST' });
  return res.json();
}

export async function removeVpnConnector(id: string): Promise<ProfileResponse> {
  const res = await fetch(`${API}/api/profile/vpn/remove?id=${id}`, { method: 'POST' });
  return res.json();
}

export async function markWizardDone(): Promise<ProfileResponse> {
  const res = await fetch(`${API}/api/profile/wizard/done`, { method: 'POST' });
  return res.json();
}

export interface TrackerSource {
  id: string;
  name: string;
  announceUrl: string;
  username: string;
  password: string;
  addedAt: string;
}

export async function fetchSources(): Promise<TrackerSource[]> {
  const res = await fetch(`${API}/api/sources`);
  const data = await res.json();
  return data.sources || [];
}

export async function addSource(src: { name: string; announceUrl: string; username: string; password: string }): Promise<boolean> {
  const params = new URLSearchParams(src);
  const res = await fetch(`${API}/api/sources/add?${params}`, { method: 'POST' });
  return res.ok;
}

export async function removeSource(id: string): Promise<boolean> {
  const res = await fetch(`${API}/api/sources/remove?id=${id}`, { method: 'POST' });
  return res.ok;
}