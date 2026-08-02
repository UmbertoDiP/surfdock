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