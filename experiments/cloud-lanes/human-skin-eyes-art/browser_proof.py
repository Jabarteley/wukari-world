"""Own one local HTTP server/browser and close both. No external requests permitted."""
import functools,json,threading,time,hashlib
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def translate_path(self,path):
        p=Path(super().translate_path(path)).resolve()
        return str(p if p==P or P in p.parents else P/'missing')
s=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(P)))
t=threading.Thread(target=s.serve_forever,daemon=True);t.start();errors=[];failed=[];r={'status':'FAIL'};start=time.monotonic();browser=None
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],timeout=20000)
        try:
            page=browser.new_page(viewport={'width':1248,'height':1400},device_scale_factor=1)
            page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('requestfailed',lambda q:failed.append(q.url))
            root=f'http://127.0.0.1:{s.server_address[1]}/'
            page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(root) else route.abort())
            page.goto(root+'viewer.html',wait_until='networkidle',timeout=25000)
            page.wait_for_function('window.receipt?.ready || window.proofError',timeout=30000)
            assert not page.evaluate('window.proofError'),page.evaluate('window.proofError')
            assert not errors and not failed,(errors,failed)
            r=page.evaluate('window.receipt');r['status']='PASS';r['browserVersion']=browser.version
            image=P/'proof'/'gltf-contact-sheet.jpg';page.screenshot(path=str(image),type='jpeg',quality=90,full_page=True,timeout=10000)
            r['screenshotSha256']=hashlib.sha256(image.read_bytes()).hexdigest()
            page.evaluate('window.cleanup()');r['disposed']=page.evaluate('window.receipt.disposed')
        finally:
            browser.close();browser=None
finally:
    s.shutdown();s.server_close();t.join(timeout=2)
    r.update(pageErrors=errors,failedRequests=failed,elapsedSeconds=round(time.monotonic()-start,3),browserClosed=browser is None,serverClosed=not t.is_alive())
    (P/'receipts'/'browser.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
