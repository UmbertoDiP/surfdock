import { run } from './probes';
import { ironGate } from './ironGate';
import { STATE } from './state';
import { ACTIONS_RUNNER_DIR } from './config';

export type DemonInfo = [boolean, string, string, string, string]; // ok, detail, runner, desc, ts

function isWin(): boolean {
  return process.platform === 'win32';
}

async function checkIronGate(): Promise<[boolean, string]> {
  return [!ironGate.vpnDown, `IG: ${ironGate.vpnDown ? 'DOWN' : 'ARMED'}`];
}

async function checkStatePoller(): Promise<[boolean, string]> {
  return [true, `POLL: VPN=${STATE.vpn} DL=${STATE.dl}`];
}

async function checkWatchdog(): Promise<[boolean, string]> {
  try {
    if (isWin()) {
      const r = await run('schtasks', ['/query', '/tn', 'LokinoSentinel-Watchdog'], 8000);
      return [r.code === 0, r.code === 0 ? 'Scheduled Task' : 'MISSING'];
    }
    if (process.platform === 'darwin') {
      const r = await run('launchctl', ['list'], 8000);
      return [r.stdout.includes('lokino-sentinel'), r.stdout.includes('lokino-sentinel') ? 'launchd job' : 'MISSING'];
    }
    const r = await run('systemctl', ['status', 'lokino-sentinel-watchdog.service'], 8000);
    return [r.code === 0, r.code === 0 ? 'systemd service' : 'MISSING'];
  } catch {
    return [false, 'ERR check'];
  }
}

async function checkGithubRunner(): Promise<[boolean, string]> {
  try {
    const fs = await import('fs');
    if (!fs.existsSync(ACTIONS_RUNNER_DIR)) return [false, 'DIR MISSING'];
    if (isWin()) {
      const r = await run('tasklist', ['/fi', 'imagename eq Runner.Listener.exe', '/fo', 'csv', '/nh'], 6000);
      const ok = r.stdout.includes('Runner.Listener');
      return [ok, ok ? 'RUNNING' : 'FERMO'];
    }
    const r = await run('pgrep', ['-f', 'Runner.Listener'], 6000);
    return [r.code === 0, r.code === 0 ? 'RUNNING' : 'FERMO'];
  } catch {
    return [false, 'ERR check'];
  }
}

async function pythonwHas(marker: string): Promise<[boolean, string]> {
  try {
    if (isWin()) {
      const r = await run('tasklist', ['/fi', 'imagename eq pythonw.exe', '/fo', 'csv', '/nh', '/v'], 8000);
      const ok = r.stdout.includes(marker);
      return [ok, ok ? 'RUNNING' : 'FERMO'];
    }
    const r = await run('pgrep', ['-f', marker], 8000);
    return [r.code === 0, r.code === 0 ? 'RUNNING' : 'FERMO'];
  } catch {
    return [false, 'ERR check'];
  }
}

export const DEMON_DEFS: [string, () => Promise<[boolean, string]>, string, string][] = [
  ['Iron Gate (60s)', checkIronGate, 'thread electron', 'Killswitch VPN integrato'],
  ['State Poller (8s)', checkStatePoller, 'thread electron', 'Telemetria qBit/Jellyfin/Docker'],
  ['Watchdog (5 min)', checkWatchdog, 'Scheduled Task', 'Riavvio automatico sentinel'],
  ['GitHub Runner', checkGithubRunner, 'Runner.Listener', 'CI/CD self-hosted'],
  ['UX Telemetry Loop', () => pythonwHas('ux_telemetry'), 'pythonw script', 'Probe UI Jellyfin ogni 120s'],
  ['Metadata Sync', () => pythonwHas('metadata_sync'), 'pythonw script', 'Sync metadati Jellyfin'],
  ['Torrent Pipeline', () => pythonwHas('torrent_pipeline'), 'batch/pythonw', 'Post-download pipeline'],
];

export async function scanDemons(): Promise<Record<string, DemonInfo>> {
  const ts = new Date().toTimeString().slice(0, 8);
  const out: Record<string, DemonInfo> = {};
  for (const [name, fn, runner, desc] of DEMON_DEFS) {
    try {
      const [ok, detail] = await fn();
      out[name] = [ok, detail, runner, desc, ts];
    } catch (e: any) {
      out[name] = [false, String(e?.message || e).slice(0, 40), runner, desc, ts];
    }
  }
  return out;
}
