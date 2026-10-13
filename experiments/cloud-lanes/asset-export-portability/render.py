"""One local HTTP server and browser, both owned/closed; use outer heavy/server/browser slots."""
import functools
import argparse
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
from playwright.sync_api import sync_playwright

LANE = Path(__file__).resolve().parent


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def translate_path(self, path):
        translated = Path(super().translate_path(path)).resolve()
        if LANE not in translated.parents and translated != LANE:
            return str(LANE / 'missing')
        return str(translated)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default=str(LANE / 'runs' / 'render'))
    out = Path(parser.parse_args().out).resolve()
    if LANE not in out.parents:
        raise ValueError('Render output must stay in this lane')
    if out == LANE / 'artifacts' or out == LANE / 'receipts':
        raise ValueError('Frozen packet cannot be overwritten; use runs/')
    out.mkdir(parents=True, exist_ok=True)
    start = time.monotonic()
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(LANE)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, failed, requests = [], [], []
    receipt = {'status': 'failed'}
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'], timeout=20000)
            try:
                page = browser.new_page(viewport={'width': 1130, 'height': 820}, device_scale_factor=1)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                page.on('requestfailed', lambda req: failed.append({'url': req.url, 'failure': req.failure}))
                page.on('response', lambda res: requests.append({'url': res.url.split('/')[-1], 'status': res.status}) if res.url.endswith('.glb') else None)
                # Refuse external requests; the experiment needs no external server or account.
                port = server.server_address[1]
                page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{port}/') else route.abort())
                page.goto(f'http://127.0.0.1:{port}/render.html', wait_until='networkidle', timeout=20000)
                page.wait_for_function('window.receipt?.ready === true || window.proofError', timeout=15000)
                assert not page.evaluate('window.proofError'), page.evaluate('window.proofError')
                receipt = page.evaluate('window.receipt')
                assert not errors and not failed, (errors, failed)
                assert len(requests) == 6 and all(req['status'] == 200 for req in requests), requests
                image = out / 'render.png'
                page.screenshot(path=str(image), full_page=True, timeout=8000)
                page.evaluate('window.cleanup()')
                receipt.update({'status': 'passed', 'browserVersion': browser.version, 'disposed': page.evaluate('window.receipt.disposed'),
                    'screenshot': {'path': str(image.relative_to(LANE)), 'bytes': image.stat().st_size, 'sha256': hashlib.sha256(image.read_bytes()).hexdigest()}})
            finally:
                browser.close()
                browser = None
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        receipt.update({'pageErrors': errors, 'failedRequests': failed, 'glbResponses': requests, 'elapsedSeconds': round(time.monotonic()-start, 3), 'serverClosed': not thread.is_alive(), 'browserClosed': browser is None})
        (out / 'browser.json').write_text(json.dumps(receipt, indent=2) + '\n')
        print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
