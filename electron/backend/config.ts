import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config locale non versionata (config.local.json nel progetto o nella dir di lancio).
// Priorita': variabili d'ambiente > config.local.json > default pubblici generici.
interface LocalConfig {
  root?: string;
  qbitUrl?: string;
  qbitUser?: string;
  qbitPass?: string;
  jellyfinUrl?: string;
  gamesApi?: string;
  gluetunCt?: string;
  dockerDesktopExe?: string;
  dockerCtPrefixes?: string[];
  lanPreferredPrefix?: string;
  actionsRunnerDir?: string;
  stripeBasicUrl?: string;
  stripeDevUrl?: string;
  adminEmail?: string;
  prowlarrUrl?: string;
  prowlarrApiKey?: string;
  corsaroNero?: { announceUrl?: string; username?: string; password?: string };
}

function loadLocalConfig(): LocalConfig {
  const candidates = [
    path.join(__dirname, '..', 'config.local.json'),
    path.join(process.cwd(), 'config.local.json'),
  ];
  for (const p of candidates) {
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { /* no-op */ }
  }
  return {};
}

const local = loadLocalConfig();

function env(k: string): string | undefined {
  const v = process.env[k];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

// ROOT dello stack: env LOKINO_ROOT > config.local.json > cartella generica dell'utente.
export const ROOT = env('LOKINO_ROOT') ?? local.root ?? path.join(os.homedir(), 'surfdock');

export const QBIT_URL = env('SURFDOCK_QBIT_URL') ?? local.qbitUrl ?? 'http://localhost:8082';
export const QBIT_USER = env('SURFDOCK_QBIT_USER') ?? local.qbitUser ?? 'admin';
export const QBIT_PASS = env('SURFDOCK_QBIT_PASS') ?? local.qbitPass ?? 'adminadmin';
export const JELLYFIN_URL = env('SURFDOCK_JELLYFIN_URL') ?? local.jellyfinUrl ?? 'http://localhost:8096';
export const GAMES_API = env('SURFDOCK_GAMES_API') ?? local.gamesApi ?? 'http://localhost:5184';
export const GLUETUN_CT = env('SURFDOCK_GLUETUN_CT') ?? local.gluetunCt ?? 'gluetun';

export const STRIPE_BASIC_URL = env('SURFDOCK_STRIPE_BASIC') ?? local.stripeBasicUrl ?? '';
export const STRIPE_DEV_URL = env('SURFDOCK_STRIPE_DEV') ?? local.stripeDevUrl ?? '';

// Prowlarr: motore di ricerca torrent multi-tracker (API v1).
export const PROWLARR_URL = env('SURFDOCK_PROWLARR_URL') ?? local.prowlarrUrl ?? 'http://localhost:9696';
export const PROWLARR_KEY = env('SURFDOCK_PROWLARR_KEY') ?? local.prowlarrApiKey ?? '';

// Account admin del prodotto: solo lui riceve l'auto-configurazione dei tracker privati.
export const ADMIN_EMAIL = (env('SURFDOCK_ADMIN_EMAIL') ?? local.adminEmail ?? '').toLowerCase();

// Tracker privato dell'admin (Corsaro Nero), mai esposto nel codice pubblico.
export const CORSARO_NERO = {
  announceUrl: env('SURFDOCK_CORSARO_ANNOUNCE') ?? local.corsaroNero?.announceUrl ?? '',
  username: env('SURFDOCK_CORSARO_USER') ?? local.corsaroNero?.username ?? '',
  password: env('SURFDOCK_CORSARO_PASS') ?? local.corsaroNero?.password ?? '',
};

export const POLL_SEC = 8;
export const IG_POLL_SEC = 60;
export const DOCKER_RETRY_MAX = 40;
export const DOCKER_RETRY_DELAY = 3;

// Percorso della GUI Docker per piattaforma (Linux usa il demone nativo, nessun launch).
export function dockerDesktopPath(): string | null {
  if (process.platform === 'win32') {
    return env('SURFDOCK_DOCKER_DESKTOP') ?? local.dockerDesktopExe ?? 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
  }
  if (process.platform === 'darwin') return '/Applications/Docker.app/Contents/MacOS/Docker';
  return null;
}

// Prefissi accettati per i nomi container dello stack (oltre al nome nudo).
export const DOCKER_CT_PREFIXES = ['', 'jellyfin-server-', ...(local.dockerCtPrefixes ?? [])];
// Subnet LAN preferita per i link servizi (configurabile).
export const LAN_PREFERRED_PREFIX = local.lanPreferredPrefix ?? '192.168.1.';
// Directory del runner GitHub Actions self-hosted (verifica demone).
export const ACTIONS_RUNNER_DIR = env('LOKINO_ACTIONS_RUNNER') ?? local.actionsRunnerDir ?? path.join(os.homedir(), 'actions-runner');

export const LOG_DIR = path.join(ROOT, 'logs');
export const LOG_FILE = path.join(LOG_DIR, 'control_center.log');
export const IG_LOG_FILE = path.join(LOG_DIR, 'vpn_killswitch.log');
export const VPN_DOWN_FLAG = path.join(ROOT, 'config', '.vpn-down');
export const KILLSWITCH_STATE = path.join(ROOT, 'config', '.killswitch_state.json');
export const QBIT_CONF = path.join(ROOT, 'config', 'qbittorrent', 'qBittorrent', 'qBittorrent.conf');

export const DOCKER_SVCS = ['jellyfin', 'gluetun', 'qbittorrent', 'sonarr', 'radarr', 'prowlarr'];
export const STOPPED_STATES = ['stoppedDL', 'stoppedUP', 'missingFiles', 'error'];
export const DL_STATES = ['downloadingDL', 'metaDL', 'forcedDL', 'forcedMetaDL', 'checkingDL', 'queuedDL', 'stalledDL'];

export const STARTUP_PHASES = ['BOOT', 'DOCKER_START', 'DOCKER_WAIT', 'STACK_UP', 'GATE_COLD', 'ARMED'];

export const CHECK_URL = 'https://am.i.mullvad.net/json';
export const TEST_TRACKER = 'tracker.opentrackr.org';
export const TEST_PORT = '1337';
