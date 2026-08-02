import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  GLUETUN_CT, JELLYFIN_URL, GAMES_API, DOCKER_SVCS, DOCKER_CT_PREFIXES, VPN_DOWN_FLAG,
} from './config';

export function run(cmd: string, args: string[], timeoutMs = 10000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      const code = err && typeof (err as any).code === 'number' ? (err as any).code : (err ? 1 : 0);
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

export function clearFlag() {
  try { if (fs.existsSync(VPN_DOWN_FLAG)) fs.unlinkSync(VPN_DOWN_FLAG); } catch { /* no-op */ }
}

export function writeFlag(msg: string) {
  try {
    fs.mkdirSync(path.dirname(VPN_DOWN_FLAG), { recursive: true });
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fs.writeFileSync(VPN_DOWN_FLAG, `${msg} @ ${ts}`, 'utf-8');
  } catch { /* no-op */ }
}

export type VpnStatus = [string, string];

export async function vpnStatus(): Promise<VpnStatus> {
  try {
    const out = await run('docker', ['inspect', '-f', '{{.State.Health.Status}}', GLUETUN_CT], 10000);
    if (out.code === 0) {
      const v = out.stdout.trim();
      if (v === 'healthy') { clearFlag(); return ['healthy', 'gluetun healthy, Iron Gate 6/6']; }
      if (v === 'unhealthy' || v === 'starting') return [v, `gluetun health: ${v}`];
      if (v === 'none') return ['healthy', 'gluetun attivo (no healthcheck)'];
      return ['unknown', `gluetun: ${v}`];
    }
    if (out.stderr.includes('No such object') || out.stderr.toLowerCase().includes('not found')) {
      return ['missing', 'container gluetun non presente'];
    }
    return ['error', out.stderr.trim().slice(0, 80)];
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 80);
    if (msg.toLowerCase().includes('enoent')) return ['starting', 'docker non nel PATH (in avvio?)'];
    return ['error', msg];
  }
}

export type JellyfinInfo = [string | null, string | null, string];

export async function jellyfinInfo(): Promise<JellyfinInfo> {
  try {
    const res = await fetch(`${JELLYFIN_URL}/System/Info/Public`, { signal: AbortSignal.timeout(4000) });
    const d: any = await res.json();
    return [d.Version || '?', d.ServerName || '?', d.OperatingSystem || '?'];
  } catch (e: any) {
    return [null, null, String(e?.message || e).slice(0, 60)];
  }
}

export async function dockerPs(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const r = await run('docker', ['ps', '--format', '{{.Names}}\t{{.Status}}'], 10000);
    const running: Record<string, string> = {};
    for (const line of r.stdout.split(/\r?\n/)) {
      if (line.includes('\t')) {
        const [name, status] = line.split('\t', 2);
        running[name] = status.toLowerCase().startsWith('up') ? 'running' : 'exited';
      }
    }
    for (const svc of DOCKER_SVCS) {
      const cands = DOCKER_CT_PREFIXES.map(p => `${p}${svc}`);
      const key = cands.find(c => c in running);
      out[svc] = key ? running[key] : 'missing';
    }
    return out;
  } catch {
    for (const svc of DOCKER_SVCS) out[svc] = 'error';
    return out;
  }
}

export type ServiceStatus = [string, string];

export async function sunshineStatus(): Promise<ServiceStatus> {
  try {
    if (process.platform === 'win32') {
      const r = await run('sc', ['query', 'SunshineService'], 6000);
      if (r.stdout.includes('RUNNING')) return ['running', 'servizio Sunshine attivo (SunshineService)'];
      if (r.stdout.includes('STOPPED')) return ['stopped', 'servizio Sunshine fermato'];
      if (r.stderr.includes('1060') || r.stderr.toLowerCase().includes('does not exist') || r.stderr.toLowerCase().includes('non esiste')) {
        return ['missing', 'Sunshine non installato (vedi PLAN_01)'];
      }
      return ['unknown', (r.stdout.trim() || r.stderr.trim()).slice(0, 60)];
    }
    const r = await run('systemctl', ['is-active', 'sunshine.service'], 6000);
    const v = r.stdout.trim();
    if (r.code === 0 && v === 'active') return ['running', 'servizio Sunshine attivo (systemd)'];
    if (v === 'inactive' || v === 'failed') return ['stopped', `servizio Sunshine ${v}`];
    return ['missing', 'Sunshine non installato (vedi PLAN_01)'];
  } catch (e: any) {
    return ['error', String(e?.message || e).slice(0, 60)];
  }
}

export async function gamesMgrStatus(): Promise<ServiceStatus> {
  try {
    const res = await fetch(`${GAMES_API}/games`, { signal: AbortSignal.timeout(2000) });
    const arr = await res.json();
    const n = Array.isArray(arr) ? arr.length : 0;
    return ['running', `games manager attivo, ${n} giochi`];
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
      return ['missing', 'games manager non avviato (PLAN_02)'];
    }
    return ['error', msg.slice(0, 60)];
  }
}
