import { execFile } from 'child_process';
import {
  STARTUP_PHASES, DOCKER_RETRY_MAX, DOCKER_RETRY_DELAY, dockerDesktopPath, DOCKER_SVCS,
} from './config';
import { log } from './log';
import { QB, TorrentInfo } from './qbit';
import { vpnStatus, jellyfinInfo, dockerPs, sunshineStatus, gamesMgrStatus, run } from './probes';

export interface SentinelState {
  vpn: string;
  vpn_detail: string;
  dl: number;
  pa: number;
  tot: number;
  speed: number;
  seed: number;
  err: string;
  jf_ver: string | null;
  jf_name: string | null;
  jf_err: string;
  docker: Record<string, string>;
  sun: string;
  sun_detail: string;
  games: string;
  games_detail: string;
  // limite globale download (KB/s, 0 = illimitato) + velocita' corrente (KB/s)
  rate: { dl_limit: number; dl_speed: number };
}

export const STATE: SentinelState = {
  vpn: 'unknown', vpn_detail: '', dl: 0, pa: 0, tot: 0, speed: 0, seed: 0, err: '',
  jf_ver: null, jf_name: null, jf_err: '',
  docker: {}, sun: 'unknown', sun_detail: '', games: 'missing', games_detail: '',
  rate: { dl_limit: 0, dl_speed: 0 },
};

// --- startup phases (SentryFlow) ---
export interface StartupProgress {
  phase: string;
  step: number;
  total: number;
  detail: string;
  log: string[];
}

const startup: StartupProgress = { phase: 'BOOT', step: 0, total: 6, detail: 'Avvio sentinel...', log: [] };

export function setStartupPhase(phase: string, detail: string) {
  const idx = STARTUP_PHASES.includes(phase) ? STARTUP_PHASES.indexOf(phase) : startup.step;
  startup.phase = phase;
  startup.step = idx;
  startup.detail = detail;
  startup.log.push(`[${idx + 1}/6] ${phase}: ${detail}`);
  log(`STARTUP [${idx + 1}/6] ${phase}: ${detail}`);
}

export function startupProgress(): StartupProgress {
  return { ...startup, log: [...startup.log] };
}

// --- refresh stato (parallelo, parita' con ThreadPoolExecutor python) ---
const DL_STATES_SET = new Set(['downloadingDL', 'metaDL', 'forcedDL', 'forcedMetaDL', 'checkingDL', 'queuedDL', 'stalledDL']);

export function humanSpeed(b: number): string {
  for (const u of ['B', 'KB', 'MB', 'GB']) {
    if (b < 1024) return `${b.toFixed(1)} ${u}`;
    b /= 1024;
  }
  return `${b.toFixed(1)} TB`;
}

type UpdateListener = () => void;
const listeners: UpdateListener[] = [];
export function onStateUpdate(fn: UpdateListener) { listeners.push(fn); }
function notifyUpdate() { for (const fn of listeners) { try { fn(); } catch { /* no-op */ } } }

export async function refreshState(): Promise<void> {
  const [vpnR, torR, jfR, dckR, sunR, gmsR] = await Promise.allSettled([
    vpnStatus(),
    (async () => {
      let dl = 0, pa = 0, tot = 0, seed = 0, speed = 0, err = '';
      try {
        const arr: TorrentInfo[] = await QB.info();
        tot = arr.length;
        dl = arr.filter(t => DL_STATES_SET.has(t.state)).length;
        pa = arr.filter(t => t.state.startsWith('stopped') || t.state.startsWith('paused')).length;
        seed = arr.filter(t => t.state.endsWith('UP') && !DL_STATES_SET.has(t.state)).length;
        speed = arr.reduce((s, t) => s + (t.download_speed || 0), 0);
      } catch (e: any) {
        err = String(e?.message || e).slice(0, 80);
        log(`qbit ERRORE info: ${err}`);
      }
      try {
        const ti = await QB.transferInfo();
        STATE.rate = {
          dl_limit: ti.dl_limit > 0 ? Math.round(ti.dl_limit / 1024) : 0,
          dl_speed: Math.round(ti.dl_speed / 1024),
        };
      } catch { /* no-op */ }
      return { dl, pa, tot, seed, speed, err };
    })(),
    jellyfinInfo(),
    dockerPs(),
    sunshineStatus(),
    gamesMgrStatus(),
  ]);

  if (vpnR.status === 'fulfilled') { STATE.vpn = vpnR.value[0]; STATE.vpn_detail = vpnR.value[1]; }
  if (torR.status === 'fulfilled') {
    STATE.dl = torR.value.dl; STATE.pa = torR.value.pa; STATE.tot = torR.value.tot;
    STATE.seed = torR.value.seed; STATE.speed = torR.value.speed; STATE.err = torR.value.err;
  }
  if (jfR.status === 'fulfilled') { STATE.jf_ver = jfR.value[0]; STATE.jf_name = jfR.value[1]; STATE.jf_err = jfR.value[2]; }
  if (dckR.status === 'fulfilled') STATE.docker = dckR.value;
  if (sunR.status === 'fulfilled') { STATE.sun = sunR.value[0]; STATE.sun_detail = sunR.value[1]; }
  if (gmsR.status === 'fulfilled') { STATE.games = gmsR.value[0]; STATE.games_detail = gmsR.value[1]; }

  const up = Object.values(STATE.docker).filter(v => v === 'running').length;
  log(`REFRESH vpn=${STATE.vpn} dl=${STATE.dl} pa=${STATE.pa} seed=${STATE.seed} speed=${humanSpeed(STATE.speed)} jf=${STATE.jf_ver ? 'OK' : 'OFF'} docker_up=${up}/${DOCKER_SVCS.length} sun=${STATE.sun} games=${STATE.games}`);
  notifyUpdate();
}

// --- Docker Desktop bootstrap ---
export function ensureDockerDesktop(): Promise<[boolean, string]> {
  return (async () => {
    try {
      const r = await run('docker', ['info'], 8000);
      if (r.code === 0) return [true, 'docker gia\' pronto'];
    } catch { /* no-op */ }
    const desktop = dockerDesktopPath();
    if (!desktop) {
      // Linux/macOS senza Docker.app: il demone va avviato dal servizio di sistema.
      return [false, 'docker non attivo (avviare il daemon manualmente)'];
    }
    try {
      const fs = await import('fs');
      if (fs.existsSync(desktop)) {
        log('Docker Desktop non attivo, avvio...');
        const child = execFile(desktop, { windowsHide: true }, () => { /* avvio async */ });
        child.unref();
        return [false, 'Docker Desktop avviato, attendo...'];
      }
      return [false, `Docker Desktop non trovato in ${desktop}`];
    } catch (e: any) {
      return [false, `ERR avvio Docker Desktop: ${String(e?.message || e).slice(0, 60)}`];
    }
  })();
}

export async function dockerReady(): Promise<boolean> {
  for (let attempt = 0; attempt < DOCKER_RETRY_MAX; attempt++) {
    try {
      const r = await run('docker', ['info'], 8000);
      if (r.code === 0) {
        log(`docker pronto dopo ${(attempt + 1) * DOCKER_RETRY_DELAY}s`);
        return true;
      }
    } catch { /* no-op */ }
    if (attempt % 5 === 0 && attempt > 0) {
      setStartupPhase('DOCKER_WAIT', `Docker in avvio... ${attempt * DOCKER_RETRY_DELAY}s`);
      log(`attesa Docker... ${attempt * DOCKER_RETRY_DELAY}s`);
    }
    await new Promise(r => setTimeout(r, DOCKER_RETRY_DELAY * 1000));
  }
  log(`Docker non pronto dopo ${DOCKER_RETRY_MAX * DOCKER_RETRY_DELAY}s`);
  return false;
}
