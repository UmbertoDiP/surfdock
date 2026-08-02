import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  GLUETUN_CT, CHECK_URL, TEST_TRACKER, TEST_PORT, QBIT_CONF,
  KILLSWITCH_STATE, IG_POLL_SEC,
} from './config';
import { igLog, log } from './log';
import { QB, qbitApiAlive } from './qbit';
import { run, clearFlag, writeFlag } from './probes';
import { setStartupPhase, dockerReady } from './state';

type CheckResult = [boolean, string];

function runInGluetun(cmd: string[], timeoutMs = 10000) {
  return run('docker', ['exec', GLUETUN_CT, ...cmd], timeoutMs);
}

// 1. gluetun healthy = kill-switch armato
async function checkKillswitch(): Promise<CheckResult> {
  const res = await run('docker', ['inspect', '-f', '{{.State.Health.Status}}', GLUETUN_CT], 10000);
  const status = res.stdout.trim();
  if (status !== 'healthy') return [false, `gluetun non healthy: ${status}`];
  return [true, 'kill-switch armato, gluetun healthy'];
}

// 2. IP di uscita = Mullvad (no leak ISP)
async function checkEgressIp(): Promise<CheckResult> {
  const res = await runInGluetun(['wget', '-qO-', CHECK_URL], 15000);
  if (res.code !== 0) return [false, 'impossibile contattare Mullvad API'];
  try {
    const data = JSON.parse(res.stdout);
    if (!data.mullvad_exit_ip) return [false, `LEAK RILEVATO! IP in chiaro: ${data.ip || '?'}`];
    return [true, `IP blindato: ${data.ip} (${data.city || ''})`];
  } catch {
    return [false, 'risposta API non valida'];
  }
}

// 3. Routing: traffico forzato su tun0
async function checkRoutingTun0(): Promise<CheckResult> {
  const res = await runInGluetun(['ip', 'route', 'get', '8.8.8.8'], 10000);
  if (res.code !== 0) return [false, `impossibile leggere routing table: ${res.stderr.slice(0, 80)}`];
  if (!res.stdout.includes('dev tun0')) return [false, `LEAK ROUTING! Traffico non su tun0: ${res.stdout.trim().slice(0, 80)}`];
  return [true, 'routing forzato su tun0'];
}

// 4. qBittorrent vincolato a tun0
async function checkQbitBinding(): Promise<CheckResult> {
  try {
    const conf = fs.readFileSync(QBIT_CONF, 'utf-8');
    if (!conf.includes('InterfaceName=tun0')) return [false, 'GUINZAGLIO MANCANTE: qBittorrent non vincolato a tun0'];
    return [true, 'qBittorrent vincolato a tun0'];
  } catch {
    return [false, `qBittorrent.conf non trovato: ${QBIT_CONF}`];
  }
}

// 5. DNS risolve tracker via gluetun interno
async function checkDns(): Promise<CheckResult> {
  const res = await runInGluetun(['nslookup', '-timeout=5', TEST_TRACKER], 15000);
  if (res.code !== 0) return [false, `DNS non risolve ${TEST_TRACKER}: ${res.stderr.slice(0, 60)}`];
  if (!res.stdout.includes('Server:')) return [false, 'comportamento DNS anomalo'];
  const serverLine = res.stdout.split(/\r?\n/).find(l => l.includes('Server:'));
  const server = serverLine ? serverLine.split('Server:')[1].trim() : '?';
  if (server !== '127.0.0.1' && server !== '127.0.0.11') return [false, `DNS server sospetto (non gluetun interno): ${server}`];
  return [true, `DNS operativo via gluetun (${server})`];
}

// 6. UDP verso tracker raggiungibile
async function checkUdpTracker(): Promise<CheckResult> {
  const res = await runInGluetun(['nc', '-u', '-z', '-w', '5', TEST_TRACKER, TEST_PORT], 15000);
  if (res.code !== 0) return [false, `UDP bloccato verso ${TEST_TRACKER}:${TEST_PORT} (rc=${res.code})`];
  return [true, 'UDP tracker raggiungibile via tunnel'];
}

export async function runIronGate(): Promise<{ ok: boolean; failed: string[]; msgs: Record<string, string> }> {
  const checks: [string, () => Promise<CheckResult>][] = [
    ['killswitch', checkKillswitch],
    ['egress_ip', checkEgressIp],
    ['routing_tun0', checkRoutingTun0],
    ['qbit_binding', checkQbitBinding],
    ['dns', checkDns],
    ['udp_tracker', checkUdpTracker],
  ];
  const failed: string[] = [];
  const msgs: Record<string, string> = {};
  for (const [name, fn] of checks) {
    let ok: boolean, msg: string;
    try {
      [ok, msg] = await fn();
    } catch (e: any) {
      ok = false;
      msg = `exception: ${String(e?.message || e).slice(0, 60)}`;
    }
    msgs[name] = msg;
    if (!ok) failed.push(`${name}: ${msg}`);
    igLog(`  [${ok ? 'PASS' : 'FAIL'}] ${name}: ${msg}`);
  }
  return { ok: failed.length === 0, failed, msgs };
}

// --- killswitch state ---
interface KillswitchState {
  paused_by_killswitch: string[];
  down_since?: string;
  gate_failures?: string[];
}

function loadKillswitchState(): KillswitchState {
  try {
    return JSON.parse(fs.readFileSync(KILLSWITCH_STATE, 'utf-8'));
  } catch {
    return { paused_by_killswitch: [] };
  }
}

function saveKillswitchState(s: KillswitchState) {
  try {
    fs.mkdirSync(path.dirname(KILLSWITCH_STATE), { recursive: true });
    fs.writeFileSync(KILLSWITCH_STATE, JSON.stringify(s, null, 2), 'utf-8');
  } catch { /* no-op */ }
}

function nowStr(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function onVpnDown(failed: string[]) {
  igLog(`[KILL] Iron Gate fallito: ${failed.join('; ')}`);
  try {
    const state = loadKillswitchState();
    const active = await QB.activeHashes();
    const already = state.paused_by_killswitch || [];
    state.paused_by_killswitch = [...new Set([...already, ...active])].sort();
    state.down_since = nowStr();
    state.gate_failures = failed;
    await QB.stopAll();
    saveKillswitchState(state);
    writeFlag(`${failed.join('; ')} | torrent fermati`);
    igLog(`[KILL] ${active.length} torrent fermati (${state.paused_by_killswitch.length} totali in stato)`);
  } catch (e: any) {
    igLog(`[ERR] on_vpn_down: ${e}`);
  }
}

async function onVpnRecovery(): Promise<number> {
  const state = loadKillswitchState();
  const paused = state.paused_by_killswitch || [];
  if (!paused.length) return 0;
  igLog(`[RECOVERY] Iron Gate OK - resume ${paused.length} torrent`);
  try {
    await QB.startHashes(paused);
    const resumed = paused.length;
    state.paused_by_killswitch = [];
    delete state.down_since;
    delete state.gate_failures;
    saveKillswitchState(state);
    clearFlag();
    igLog(`[RECOVERY] ${resumed} torrent ripresi`);
    return resumed;
  } catch (e: any) {
    igLog(`[ERR] recovery: ${e}`);
    return 0;
  }
}

// --- poller 60s ---
export type NotifyFn = (title: string, body: string) => void;

export const ironGate = { vpnDown: false };

// auto-resume unico al boot: riprende TUTTI i torrent al primo ARMED dopo avvio app
let autoResumeDone = false;

export async function ironGatePoller(notify: NotifyFn, stop: () => boolean): Promise<void> {
  if (!(await dockerReady())) {
    log('Docker non pronto dopo attesa, Iron Gate in attesa del prossimo ciclo');
    setStartupPhase('DOCKER_WAIT', 'Docker non ancora pronto, attendo...');
    notify('SurfDock - Docker in avvio', 'Docker Desktop non ancora pronto. Iron Gate entrera\' in funzione appena Docker sara\' disponibile.');
    while (!stop() && !(await dockerReady())) {
      await new Promise(r => setTimeout(r, 15000));
    }
    if (!stop()) {
      log('Docker ora disponibile, avvio Iron Gate');
      setStartupPhase('STACK_UP', 'Docker pronto, stack in avvio...');
      notify('SurfDock - Docker pronto', 'Iron Gate attivato.');
    }
  }
  setStartupPhase('GATE_COLD', 'Primo check Iron Gate in corso...');
  while (!stop()) {
    try {
      const { ok, failed } = await runIronGate();
      if (!ok) {
        if (!ironGate.vpnDown) {
          await onVpnDown(failed);
          notify('SurfDock - VPN GIU\'', `Iron Gate fallito (${failed.length} test). Torrent bloccati, Jellyfin resta in LAN.`);
          ironGate.vpnDown = true;
        } else {
          try {
            const active = await QB.activeHashes();
            const state = loadKillswitchState();
            const already = state.paused_by_killswitch || [];
            if (active.some(h => !already.includes(h))) await onVpnDown(failed);
          } catch { /* no-op */ }
        }
      } else {
        if (ironGate.vpnDown) {
          const resumed = await onVpnRecovery();
          notify('SurfDock - VPN OK', `Iron Gate 6/6. ${resumed} torrent ripresi.`);
          ironGate.vpnDown = false;
        } else {
          clearFlag();
        }
        setStartupPhase('ARMED', 'Iron Gate 6/6, sistema pronto.');
        if (!autoResumeDone) {
          try {
            await QB.startAll();
            autoResumeDone = true;
            igLog('[AUTO-RESUME] boot: tutti i torrent avviati automaticamente');
          } catch (e: any) {
            igLog(`[ERR] auto-resume boot: ${e}`);
          }
        }
        if (!(await qbitApiAlive())) {
          igLog('[CRITICAL] VPN OK ma qBittorrent API morta: namespace zombie');
          try {
            await run('docker', ['restart', 'qbittorrent'], 90000);
            await new Promise(r => setTimeout(r, 10000));
            igLog('qBittorrent restart completato');
            QB.resetSession();
            await QB.startAll();
            igLog('[AUTO-RESUME] torrent riavviati dopo restart qBittorrent');
          } catch (e: any) {
            igLog(`[ERR] restart qbittorrent fallito: ${e}`);
          }
        }
      }
    } catch (e: any) {
      log(`iron_gate poller err: ${e}`);
    }
    await new Promise(r => setTimeout(r, IG_POLL_SEC * 1000));
  }
}

export function spawnDetached(cmd: string, args: string[], cwd: string) {
  const child = execFile(cmd, args, { cwd, windowsHide: true }, () => { /* fire and forget */ });
  child.unref();
}
