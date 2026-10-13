"""Lane-local ephemeral raw GLTFLoader render. Acquire heavy/server/browser slots externally."""
import argparse
import functools
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

LANE=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*_):pass
    def translate_path(self,path):
        out=Path(super().translate_path(path)).resolve()
        return str(out if LANE in out.parents else LANE/'missing')

p=argparse.ArgumentParser();p.add_argument('--folder',default='c01-v1');p.add_argument('--style',default='curl-crop');p.add_argument('--out',required=True);args=p.parse_args()
out=(LANE/args.out).resolve();assert LANE in out.parents;out.mkdir(parents=True,exist_ok=True)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(LANE)));t=threading.Thread(target=server.serve_forever,daemon=True);t.start()
errors=[];responses=[];receipt={'status':'failed'}
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],timeout=20000)
        try:
            page=browser.new_page(viewport={'width':1176,'height':958},device_scale_factor=1)
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('requestfailed',lambda r:errors.append(r.url))
            page.on('response',lambda r:responses.append({'path':r.url.split('/')[-1],'status':r.status}) if r.url.endswith('.glb') else None)
            url=f'http://127.0.0.1:{server.server_address[1]}/'
            page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url) else r.abort())
            page.goto(url+f'render.html?folder={args.folder}&style={args.style}',wait_until='networkidle',timeout=25000)
            page.wait_for_function('window.receipt?.ready || window.proofError',timeout=25000)
            assert not page.evaluate('window.proofError'),page.evaluate('window.proofError')
            assert not errors,errors
            assert all(r['status']==200 for r in responses) and len(responses)==3,responses
            page.screenshot(path=str(out/'contact-sheet.png'),full_page=True)
            page.evaluate('window.cleanup()');receipt=page.evaluate('window.receipt');receipt['status']='passed';receipt['browserVersion']=browser.version
        finally:browser.close()
finally:
    server.shutdown();server.server_close();t.join(2)
    receipt.update(errors=errors,responses=responses,serverClosed=not t.is_alive())
    (out/'browser.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
