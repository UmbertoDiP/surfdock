import http from 'http';
import path from 'path';
import fs from 'fs';
import { ROOT, DOCKER_SVCS, STRIPE_BASIC_URL, STRIPE_DEV_URL, ADMIN_EMAIL, CORSARO_NERO } from './config';
import { log } from './log';
import { QB } from './qbit';
import { STATE, startupProgress } from './state';
import { scanDemons } from './demons';
import { ironGate, spawnDetached } from './ironGate';
import { getLicense, activateLicense, clearLicense } from './license';
import { getSources, addSource, removeSource } from './sources';
import { getProfile, setEmail, setVpnEnabled, addVpnConnector, removeVpnConnector, markWizardDone } from './profile';

function sendJson(res: http.ServerResponse, code: number, data: any) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function handleGet(pathname: string, res: http.ServerResponse) {
  if (pathname === '/health') {
    const d = STATE.docker;
    const dup = Object.values(d).filter(v => v === 'running').length;
    const sp = startupProgress();
    const lic = getLicense();
    sendJson(res, 200, {
      status: 'ok',
      vpn: STATE.vpn,
      vpn_detail: STATE.vpn_detail.slice(0, 80),
      iron_gate_down: ironGate.vpnDown,
      startup_phase: sp.phase,
      startup_step: `${sp.step + 1}/${sp.total}`,
      torrent: { dl: STATE.dl, paused: STATE.pa, seed: STATE.seed, total: STATE.tot, speed_kb: STATE.speed },
      rate: { dl_limit_kb: STATE.rate.dl_limit, dl_speed_kb: STATE.rate.dl_speed },
      docker: { up: dup, total: DOCKER_SVCS.length, details: d },
      jellyfin: STATE.jf_ver ? 'OK' : 'OFF',
      sunshine: STATE.sun,
      games_manager: STATE.games,
      license_tier: lic.tier,
      vpn_enabled: getProfile().vpnEnabled,
    });
  } else if (pathname === '/api/startup') {
    sendJson(res, 200, startupProgress());
  } else if (pathname === '/api/torrents') {
    try {
      sendJson(res, 200, await QB.list());
    } catch (e: any) {
      sendJson(res, 500, { error: String(e?.message || e).slice(0, 120) });
    }
  } else if (pathname === '/api/rate') {
    try {
      const ti = await QB.transferInfo();
      sendJson(res, 200, {
        dl_limit_kb: ti.dl_limit > 0 ? Math.round(ti.dl_limit / 1024) : 0,
        dl_speed_kb: Math.round(ti.dl_speed / 1024),
      });
    } catch (e: any) {
      sendJson(res, 500, { error: String(e?.message || e).slice(0, 120) });
    }
  } else if (pathname === '/api/demons') {
    sendJson(res, 200, await scanDemons());
  } else if (pathname === '/api/license') {
    const lic = getLicense();
    sendJson(res, 200, {
      ok: true,
      tier: lic.tier,
      email: lic.email || null,
      activated_at: lic.activatedAt || null,
      expires_at: lic.expiresAt || null,
      has_license: lic.tier !== 'none',
      stripe_basic_url: STRIPE_BASIC_URL,
      stripe_dev_url: STRIPE_DEV_URL,
    });
  } else if (pathname === '/api/sources') {
    sendJson(res, 200, { ok: true, sources: getSources() });
  } else if (pathname === '/api/profile') {
    const profile = getProfile();
    sendJson(res, 200, {
      ok: true,
      profile,
      admin_email: ADMIN_EMAIL || null,
      corsaro_configured: !!CORSARO_NERO.announceUrl,
    });
  } else {
    sendJson(res, 404, { error: 'not found' });
  }
}

async function handlePost(pathname: string, search: URLSearchParams, res: http.ServerResponse) {
  const hash = (search.get('hash') || '').trim();
  const hashes = hash ? [hash] : [];
  const vpnGuard = STATE.vpn === 'unhealthy' && getProfile().vpnEnabled;
  switch (pathname) {
    case '/api/torrent/pause':
      if (hashes.length) { await QB.stopHashes(hashes); sendJson(res, 200, { ok: true, action: 'pause', hash }); }
      else { await QB.stopAll(); sendJson(res, 200, { ok: true, action: 'pause' }); }
      break;
    case '/api/torrent/resume':
      if (vpnGuard) sendJson(res, 403, { ok: false, error: 'VPN giu\'' });
      else if (hashes.length) { await QB.startHashes(hashes); sendJson(res, 200, { ok: true, action: 'resume', hash }); }
      else { await QB.startAll(); sendJson(res, 200, { ok: true, action: 'resume' }); }
      break;
    case '/api/torrent/force':
      if (vpnGuard) sendJson(res, 403, { ok: false, error: 'VPN giu\'' });
      else if (hashes.length) { await QB.forceStartHashes(hashes); sendJson(res, 200, { ok: true, action: 'force', hash }); }
      else { await QB.forceStartAll(); sendJson(res, 200, { ok: true, action: 'force' }); }
      break;
    case '/api/torrent/recheck':
      if (hashes.length) { await QB.recheckHashes(hashes); sendJson(res, 200, { ok: true, action: 'recheck', hash }); }
      else sendJson(res, 400, { ok: false, error: 'hash richiesto' });
      break;
    case '/api/torrent/delete':
      if (hashes.length) {
        const delFiles = search.get('deleteFiles') === 'true';
        await QB.deleteHashes(hashes, delFiles);
        sendJson(res, 200, { ok: true, action: 'delete', hash, deleteFiles: delFiles });
      } else sendJson(res, 400, { ok: false, error: 'hash richiesto' });
      break;
    case '/api/docker/up':
      spawnDetached('docker', ['compose', 'up', '-d'], ROOT);
      sendJson(res, 200, { ok: true, action: 'docker up' });
      break;
    case '/api/docker/down':
      spawnDetached('docker', ['compose', 'down'], ROOT);
      sendJson(res, 200, { ok: true, action: 'docker down' });
      break;
    case '/api/docker/restart':
      spawnDetached('docker', ['compose', 'restart'], ROOT);
      sendJson(res, 200, { ok: true, action: 'docker restart' });
      break;
    case '/api/avvia-tutto': {
      const script = path.join(ROOT, 'scripts', 'avvia_tutto.ps1');
      if (!fs.existsSync(script)) {
        sendJson(res, 404, { ok: false, error: 'script avvia_tutto.ps1 non presente' });
        break;
      }
      spawnDetached('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-NoTray'], ROOT);
      sendJson(res, 200, { ok: true, action: 'avvia tutto' });
      break;
    }
    case '/api/ferma-tutto':
      try { await QB.stopAll(); } catch { /* no-op */ }
      spawnDetached('docker', ['compose', 'down'], ROOT);
      sendJson(res, 200, { ok: true, action: 'ferma tutto' });
      break;
    case '/api/rate': {
      const raw = search.get('dl');
      if (raw === null) { sendJson(res, 400, { ok: false, error: 'parametro dl richiesto (KB/s, 0 = illimitato)' }); break; }
      const kb = parseInt(raw, 10);
      if (Number.isNaN(kb) || kb < 0) { sendJson(res, 400, { ok: false, error: 'dl non valido' }); break; }
      await QB.setDownloadLimit(kb * 1024);
      const ti = await QB.transferInfo();
      sendJson(res, 200, {
        ok: true,
        dl_limit_kb: ti.dl_limit > 0 ? Math.round(ti.dl_limit / 1024) : 0,
        dl_speed_kb: Math.round(ti.dl_speed / 1024),
      });
      break;
    }
    case '/api/license/activate': {
      const key = (search.get('key') || '').trim();
      if (!key) { sendJson(res, 400, { ok: false, error: 'key richiesto' }); break; }
      const result = activateLicense(key);
      if (result.tier === 'none') { sendJson(res, 403, { ok: false, error: 'chiave non valida' }); break; }
      sendJson(res, 200, { ok: true, tier: result.tier, expires_at: result.expiresAt });
      break;
    }
    case '/api/license/clear':
      clearLicense();
      sendJson(res, 200, { ok: true, tier: 'none' });
      break;
    case '/api/sources/add': {
      const name = (search.get('name') || '').trim();
      const announceUrl = (search.get('announceUrl') || '').trim();
      const username = (search.get('username') || '').trim();
      const password = (search.get('password') || '').trim();
      if (!name || !announceUrl) { sendJson(res, 400, { ok: false, error: 'name e announceUrl richiesti' }); break; }
      const entry = addSource({ name, announceUrl, username, password });
      sendJson(res, 200, { ok: true, source: entry });
      break;
    }
    case '/api/sources/remove': {
      const id = (search.get('id') || '').trim();
      if (!id) { sendJson(res, 400, { ok: false, error: 'id richiesto' }); break; }
      const ok = removeSource(id);
      sendJson(res, 200, { ok, removed: ok });
      break;
    }
    case '/api/profile/save': {
      const email = (search.get('email') || '').trim();
      const displayName = (search.get('displayName') || '').trim();
      if (!email) { sendJson(res, 400, { ok: false, error: 'email richiesta' }); break; }
      const profile = setEmail(email, displayName);
      sendJson(res, 200, { ok: true, profile });
      break;
    }
    case '/api/profile/vpn/set': {
      const raw = (search.get('enabled') || '').trim();
      if (raw !== 'true' && raw !== 'false') { sendJson(res, 400, { ok: false, error: 'enabled richiesto (true|false)' }); break; }
      const profile = setVpnEnabled(raw === 'true');
      sendJson(res, 200, { ok: true, profile });
      break;
    }
    case '/api/profile/vpn/add': {
      const provider = (search.get('provider') || '').trim();
      const username = (search.get('username') || '').trim();
      const password = (search.get('password') || '').trim();
      const server = (search.get('server') || '').trim();
      const label = (search.get('label') || provider || 'VPN').trim();
      if (!provider) { sendJson(res, 400, { ok: false, error: 'provider richiesto' }); break; }
      const profile = addVpnConnector({ provider, label, username, password, server });
      sendJson(res, 200, { ok: true, profile });
      break;
    }
    case '/api/profile/vpn/remove': {
      const id = (search.get('id') || '').trim();
      if (!id) { sendJson(res, 400, { ok: false, error: 'id richiesto' }); break; }
      const profile = removeVpnConnector(id);
      sendJson(res, 200, { ok: true, profile });
      break;
    }
    case '/api/profile/wizard/done': {
      const profile = markWizardDone();
      sendJson(res, 200, { ok: true, profile });
      break;
    }
    default:
      sendJson(res, 404, { error: 'not found' });
  }
}

export function startHealthServer(port = 5192): http.Server {
  const srv = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const pathname = url.pathname;
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
      } else if (req.method === 'GET') {
        await handleGet(pathname, res);
      } else if (req.method === 'POST') {
        await handlePost(pathname, url.searchParams, res);
      } else {
        sendJson(res, 405, { error: 'method not allowed' });
      }
    } catch (e: any) {
      sendJson(res, 500, { error: String(e?.message || e).slice(0, 120) });
    }
  });
  srv.on('error', (e: any) => log(`Health endpoint err: ${e?.message || e}`));
  srv.listen(port, '127.0.0.1', () => log(`Health endpoint avviato su :${port}`));
  return srv;
}