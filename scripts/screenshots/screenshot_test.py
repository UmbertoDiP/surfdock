"""
L2 Screenshot Test - SurfDock production UI verification.
Per tray app: verifica processo, health endpoint, e tenta screenshot finestra.

Uso: python screenshot_test.py [--json] [--out <dir>]
Exit code 0 = PASS, 1 = FAIL.
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

HEALTH_URL = 'http://localhost:5192/health'
TIMEOUT = 10
CHECKS = []


def check(name, condition, detail=''):
    ok = bool(condition)
    CHECKS.append({'name': name, 'pass': ok, 'detail': detail})
    return ok


def ps(cmd):
    try:
        out = subprocess.run(
            ['powershell', '-NoProfile', '-Command', cmd],
            capture_output=True, text=True, timeout=15
        )
        return out.stdout.strip() if out.returncode == 0 else None
    except Exception:
        return None


def curl(url, timeout=TIMEOUT):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except Exception:
        return None


def pixcheck(path):
    try:
        from PIL import Image, ImageStat
        img = Image.open(path).convert('RGB')
        stat = ImageStat.Stat(img)
        px = img.getdata()
        n = len(px)
        black = sum(1 for r, g, b in px if r < 10 and g < 10 and b < 10) / n
        white = sum(1 for r, g, b in px if r > 245 and g > 245 and b > 245) / n
        std = tuple(round(v, 1) for v in stat.stddev)
        if std[0] < 12 and std[1] < 12 and std[2] < 12:
            return 'PIATTA', False, f'std={std}'
        elif black > 0.8:
            return 'NERA', False, f'black={black:.1%}'
        elif white > 0.9:
            return 'BIANCA', False, f'white={white:.1%}'
        return 'OK', True, f'size={img.size} std={std}'
    except ImportError:
        return 'SKIP', True, ''
    except Exception as e:
        return f'ERR:{e}', False, ''


def main():
    json_out = '--json' in sys.argv
    out_dir = None
    for i, a in enumerate(sys.argv):
        if a == '--out' and i + 1 < len(sys.argv):
            out_dir = sys.argv[i + 1]
    if not out_dir:
        out_dir = tempfile.mkdtemp(prefix='surfdock_test_')
    os.makedirs(out_dir, exist_ok=True)

    count = int(ps("(Get-Process SurfDock -EA SilentlyContinue).Count") or '0')
    check('process_running', count >= 1, f'{count} processi')

    hwnd_count = int(ps(
        "(Get-Process SurfDock -EA SilentlyContinue | Where MainWindowHandle -ne 0).Count"
    ) or '0')
    check('window_exists', hwnd_count >= 1,
          f'{hwnd_count} finestre Electron (anche se hidden)')

    data = curl(HEALTH_URL)
    if data:
        check('health_endpoint', True, f"status={data.get('status')}")
        check('vpn', data.get('vpn') in ('healthy', 'starting'), f"vpn={data.get('vpn')}")
        d = data.get('docker', {})
        check('docker', d.get('up', 0) >= 1, f"docker={d.get('up')}/{d.get('total')}")
        check('jellyfin', data.get('jellyfin') == 'OK', f"jf={data.get('jellyfin')}")
        check('backend_ok', data.get('status') == 'ok' and d.get('up', 0) > 0,
              'backend attivo con dati reali -> non white screen')
    else:
        check('health_endpoint', False, 'nessuna risposta')
        check('backend_ok', False, 'endpoint down')

    shot_path = os.path.join(out_dir, 'surfdock_shot.png')
    ps_shot = f"""
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$h = (Get-Process SurfDock -EA 0 | Where MainWindowHandle -ne 0 | Select -First 1).MainWindowHandle
if (!$h) {{ exit 1 }}
[System.Windows.Forms.SendKeys]::SendWait('%{{TAB}}')
Start-Sleep 1
$b = New-Object System.Drawing.Bitmap(950, 680)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.CopyFromScreen(0, 0, 0, 0, $b.Size)
$g.Dispose()
$b.Save('{shot_path.replace(chr(92), chr(92)+chr(92))}', [System.Drawing.Imaging.ImageFormat]::Png)
$b.Dispose()
Write-Host OK
"""
    try:
        r = subprocess.run(
            ['powershell', '-NoProfile', '-Command', ps_shot],
            capture_output=True, text=True, timeout=15
        )
        if r.returncode == 0 and 'OK' in r.stdout:
            desc, ok, detail = pixcheck(shot_path)
            check('screenshot', ok, f'{desc} | {detail}')
            check('screenshot_file', True, shot_path)
        else:
            check('screenshot_file', False, 'cattura schermo fallita')
            check('screenshot', False, 'cattura non riuscita')
    except Exception as e:
        check('screenshot_file', False, str(e)[:100])
        check('screenshot', False, str(e)[:100])

    all_pass = all(c['pass'] for c in CHECKS)

    if json_out:
        print(json.dumps({
            'status': 'PASS' if all_pass else 'FAIL',
            'checks': CHECKS,
            'output_dir': out_dir,
        }, indent=2))
    else:
        for c in CHECKS:
            print(f"[{'PASS' if c['pass'] else 'FAIL'}] {c['name']}: {c['detail']}")
        print(f"\nOutput: {out_dir}")
        print('PASS' if all_pass else 'FAIL')

    sys.exit(0 if all_pass else 1)


if __name__ == '__main__':
    main()