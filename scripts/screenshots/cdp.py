import json
import sys
import base64
import urllib.request
import websocket

CDP = 'http://127.0.0.1:9223/json'


def target_ws():
    with urllib.request.urlopen(CDP) as r:
        targets = json.load(r)
    for t in targets:
        if t.get('type') == 'page':
            return t['webSocketDebuggerUrl']
    raise SystemExit('nessun target page')


def send(ws, method, params=None, msg_id=1):
    ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
    while True:
        data = json.loads(ws.recv())
        if data.get('id') == msg_id:
            return data.get('result', {})


def main():
    action = sys.argv[1]
    ws = websocket.create_connection(target_ws(), timeout=30)
    try:
        if action == 'shot':
            out = sys.argv[2]
            res = send(ws, 'Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})
            with open(out, 'wb') as f:
                f.write(base64.b64decode(res['data']))
            print(f'saved {out}')
        elif action == 'click':
            selector = sys.argv[2]
            js = f"(() => {{ const el = document.querySelector({json.dumps(selector)}); if (!el) return 'NOT_FOUND'; el.click(); return 'CLICKED'; }})()"
            res = send(ws, 'Runtime.evaluate', {'expression': js, 'returnByValue': True})
            print(res.get('result', {}).get('value') or res.get('exceptionDetails', {}).get('text', 'ERR'))
        elif action == 'clickText':
            text = sys.argv[2]
            js = ("(() => { const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); "
                  f"const q = {json.dumps(text)}; let n; const found = []; "
                  "while ((n = walker.nextNode())) { if (n.textContent.trim().includes(q)) { "
                  "const el = n.parentElement; if (el && el.click) found.push(el); } } "
                  "if (!found.length) return 'NOT_FOUND'; found[found.length - 1].click(); return 'CLICKED'; })()")
            res = send(ws, 'Runtime.evaluate', {'expression': js, 'returnByValue': True})
            print(res.get('result', {}).get('value') or res.get('exceptionDetails', {}).get('text', 'ERR'))
        elif action == 'fill':
            selector, value = sys.argv[2], sys.argv[3]
            js = ("(() => { const el = document.querySelector(" + json.dumps(selector) + "); "
                  "if (!el) return 'NOT_FOUND'; el.focus(); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; "
                  "set.call(el, " + json.dumps(value) + "); "
                  "el.dispatchEvent(new Event('input', { bubbles: true })); "
                  "el.dispatchEvent(new Event('change', { bubbles: true })); return 'FILLED'; })()")
            res = send(ws, 'Runtime.evaluate', {'expression': js, 'returnByValue': True})
            print(res.get('result', {}).get('value') or res.get('exceptionDetails', {}).get('text', 'ERR'))
        elif action == 'wait':
            import time
            time.sleep(int(sys.argv[2]) / 1000)
            print('WAITED')
        elif action == 'keys':
            selector, value = sys.argv[2], sys.argv[3]
            js = ("(() => { const el = document.querySelector(" + json.dumps(selector) + "); "
                  "if (!el) return 'NOT_FOUND'; el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); "
                  "el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); return 'KEYED'; })()")
            res = send(ws, 'Runtime.evaluate', {'expression': js, 'returnByValue': True})
            print(res.get('result', {}).get('value') or res.get('exceptionDetails', {}).get('text', 'ERR'))
        elif action == 'eval':
            js = sys.argv[2]
            res = send(ws, 'Runtime.evaluate', {'expression': js, 'returnByValue': True})
            print(json.dumps(res.get('result', {}), ensure_ascii=False)[:500])
        elif action == 'text':
            res = send(ws, 'Runtime.evaluate', {'expression': 'document.body.innerText.slice(0, 2000)', 'returnByValue': True})
            print(res.get('result', {}).get('value', '')[:2000])
    finally:
        ws.close()


if __name__ == '__main__':
    main()
