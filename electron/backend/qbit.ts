import { QBIT_URL, QBIT_USER, QBIT_PASS, STOPPED_STATES } from './config';

export interface TorrentInfo {
  hash: string;
  state: string;
  download_speed?: number;
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

// Client qBittorrent API v2 con sessione cookie, parita' con la classe Qbit python.
class Qbit {
  private cookie = '';

  private async login(): Promise<boolean> {
    const res = await fetch(`${QBIT_URL}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(QBIT_USER)}&password=${encodeURIComponent(QBIT_PASS)}`,
      signal: AbortSignal.timeout(5000),
    });
    // qBittorrent v5 usa il cookie QBT_SID_<porta> (v4 usava SID).
    const cookies = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') || ''];
    for (const c of cookies) {
      const m = c.match(/^(QBT_SID_\d+|[A-Za-z]+)=([^;]+)/);
      if (m) { this.cookie = `${m[1]}=${m[2]}`; break; }
    }
    return res.status === 200 || res.status === 204;
  }

  private async ensure(): Promise<void> {
    if (!this.cookie) {
      const ok = await this.login();
      if (!ok) throw new Error('login fallito');
    }
  }

  private async post(ep: string, data: Record<string, string>): Promise<number> {
    await this.ensure();
    const res = await fetch(`${QBIT_URL}/api/v2/${ep}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: this.cookie,
      },
      body: new URLSearchParams(data).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 403) {
      // Sessione scaduta: riprova una volta con login fresco.
      this.cookie = '';
      await this.ensure();
      const retry = await fetch(`${QBIT_URL}/api/v2/${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: this.cookie },
        body: new URLSearchParams(data).toString(),
        signal: AbortSignal.timeout(8000),
      });
      return retry.status;
    }
    return res.status;
  }

  private async getJson(ep: string, timeoutMs = 8000): Promise<any> {
    await this.ensure();
    const res = await fetch(`${QBIT_URL}/api/v2/${ep}`, {
      headers: { Cookie: this.cookie },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 403) {
      this.cookie = '';
      await this.ensure();
      const retry = await fetch(`${QBIT_URL}/api/v2/${ep}`, {
        headers: { Cookie: this.cookie },
        signal: AbortSignal.timeout(timeoutMs),
      });
      return retry.json();
    }
    return res.json();
  }

  resetSession() { this.cookie = ''; }

  info(): Promise<TorrentInfo[]> { return this.getJson('torrents/info'); }
  async list(): Promise<TorrentDetail[]> {
    const raw: any[] = await this.getJson('torrents/info?sort=added_on');
    return raw.map(t => ({
      hash: t.hash,
      name: t.name || t.hash,
      state: t.state,
      progress: t.progress ?? 0,
      size: t.size ?? 0,
      dlspeed: t.dlspeed || 0,
      upspeed: t.upspeed || 0,
      seeds: t.num_seeds ?? 0,
      peers: t.num_leechs ?? 0,
      eta: t.eta ?? -1,
      added_on: t.added_on ?? 0,
      category: t.category ?? '',
    }));
  }
  stopAll() { return this.post('torrents/stop', { hashes: 'all' }); }
  startAll() { return this.post('torrents/start', { hashes: 'all' }); }
  stopHashes(hashes: string[]) {
    if (!hashes.length) return Promise.resolve(0);
    return this.post('torrents/stop', { hashes: hashes.join('|') });
  }
  startHashes(hashes: string[]) {
    if (!hashes.length) return Promise.resolve(0);
    return this.post('torrents/start', { hashes: hashes.join('|') });
  }
  async forceStartHashes(hashes: string[]) {
    if (!hashes.length) return Promise.resolve(0);
    await this.post('torrents/start', { hashes: hashes.join('|') });
    return this.post('torrents/setForceStart', { hashes: hashes.join('|'), value: 'true' });
  }
  recheckHashes(hashes: string[]) {
    if (!hashes.length) return Promise.resolve(0);
    return this.post('torrents/recheck', { hashes: hashes.join('|') });
  }
  deleteHashes(hashes: string[], deleteFiles: boolean) {
    if (!hashes.length) return Promise.resolve(0);
    return this.post('torrents/delete', { hashes: hashes.join('|'), deleteFiles: deleteFiles ? 'true' : 'false' });
  }
  async forceStartAll() {
    await this.post('torrents/start', { hashes: 'all' });
    return this.post('torrents/setForceStart', { hashes: 'all', value: 'true' });
  }
  async activeHashes(): Promise<string[]> {
    const ts: TorrentInfo[] = await this.getJson('torrents/info', 10000);
    return ts.filter(t => !STOPPED_STATES.includes(t.state)).map(t => t.hash);
  }
  // Limiti globali: v5 usa dl_rate_limit (byte/s, 0 = nessun limite), v4 dl_info_limit (-1 = unlimited).
  async transferInfo(): Promise<{ dl_speed: number; dl_limit: number }> {
    const t = await this.getJson('transfer/info');
    return { dl_speed: t.dl_info_speed || 0, dl_limit: t.dl_rate_limit ?? t.dl_info_limit ?? -1 };
  }
  // bytes <= 0 => senza limite (0/negativo = unlimited per l'API v2).
  setDownloadLimit(bytes: number) {
    return this.post('transfer/setDownloadLimit', { limit: String(bytes <= 0 ? 0 : bytes) });
  }
  addMagnet(magnet: string, category = '') {
    const data: Record<string, string> = { urls: magnet };
    if (category) data.category = category;
    return this.post('torrents/add', data);
  }
}

export const QB = new Qbit();

export async function qbitApiAlive(): Promise<boolean> {
  try {
    await fetch(`${QBIT_URL}/api/v2/app/version`, { signal: AbortSignal.timeout(5000) });
    return true;
  } catch {
    return false;
  }
}
