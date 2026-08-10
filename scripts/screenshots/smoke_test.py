"""
L1 Smoke Test - SurfDock production health verification.
Verifica che l'app installata risponda correttamente su :5192/health.
Uso: python smoke_test.py [--json]
Exit code 0 = PASS, 1 = FAIL.
"""
import json
import sys
import urllib.request
import urllib.error

HEALTH_URL = 'http://localhost:5192/health'
TIMEOUT = 10

REQUIRED_FIELDS = {
    'status': 'ok',
    'vpn': ['healthy', 'starting'],
    'docker.up': lambda v: v >= 1,
    'jellyfin': ['OK'],
}

CHECKS = []


def check(name, condition, detail=''):
    ok = bool(condition)
    CHECKS.append({'name': name, 'pass': ok, 'detail': detail})
    return ok


def main():
    json_out = '--json' in sys.argv

    try:
        req = urllib.request.Request(HEALTH_URL)
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            data = json.load(r)
    except urllib.error.URLError as e:
        if json_out:
            print(json.dumps({'status': 'FAIL', 'error': f'endpoint non raggiungibile: {e.reason}'}))
        else:
            print(f'[FAIL] Health endpoint non raggiungibile: {e.reason}')
        sys.exit(1)
    except Exception as e:
        if json_out:
            print(json.dumps({'status': 'FAIL', 'error': str(e)}))
        else:
            print(f'[FAIL] Errore: {e}')
        sys.exit(1)

    check('health_status_ok', data.get('status') == 'ok',
          f"status={data.get('status')}")
    check('vpn_healthy', data.get('vpn') in ('healthy', 'starting'),
          f"vpn={data.get('vpn')}")
    check('docker_running', isinstance(data.get('docker', {}).get('up'), int) and data['docker']['up'] >= 1,
          f"docker_up={data.get('docker', {}).get('up')}/{data.get('docker', {}).get('total')}")
    check('jellyfin_ok', data.get('jellyfin') == 'OK',
          f"jellyfin={data.get('jellyfin')}")
    check('startup_not_stuck', data.get('startup_phase') != 'BOOT',
          f"phase={data.get('startup_phase')} step={data.get('startup_step')}")

    all_pass = all(c['pass'] for c in CHECKS)

    if json_out:
        print(json.dumps({
            'status': 'PASS' if all_pass else 'FAIL',
            'checks': CHECKS,
            'data': {k: data.get(k) for k in ('vpn', 'docker', 'jellyfin', 'startup_phase', 'torrent')}
        }, indent=2))
    else:
        for c in CHECKS:
            status = 'PASS' if c['pass'] else 'FAIL'
            print(f"[{status}] {c['name']}: {c['detail']}")
        print(f"\n{'TUTTI I TEST SUPERATI' if all_pass else 'ALCUNI TEST FALLITI'}")

    sys.exit(0 if all_pass else 1)


if __name__ == '__main__':
    main()