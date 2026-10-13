"""Two matched local-only screenshots, one owned browser and server, no loop."""
from pathlib import Path
import functools,json,threading,time,hashlib
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent;LANE=HERE.parent
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def translate_path(self,path):
  p=Path(super().translate_path(path)).resolve();return str(p if p==LANE or LANE in p.parents else LANE/'not-found')
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(LANE)));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
browser=None;rows=[];errors=[];failures=[];start=time.monotonic();receipt={'status':'FAILED'}
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],timeout=15000)
  try:
   for detail,name in [(False,'frozen-envelope-neutral-extremes.jpg')]:
    page=browser.new_page(viewport={'width':1050,'height':1350 if not detail else 1030},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failures.append({'url':r.url,'failure':r.failure}))
    origin=f'http://127.0.0.1:{server.server_address[1]}/';page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
    page.goto(origin+'envelope-fit-v1/proof.html'+('?detail=1' if detail else ''),wait_until='networkidle',timeout=20000);page.wait_for_function('window.receipt?.ready || window.proofError',timeout=15000)
    assert not page.evaluate('window.proofError'),page.evaluate('window.proofError');assert not errors and not failures,(errors,failures)
    r=page.evaluate('window.receipt');path=HERE/'artifacts'/name;page.screenshot(path=str(path),type='jpeg',quality=90,full_page=True,timeout=8000)
    r['image']={'path':str(path.relative_to(HERE)),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()};page.evaluate('window.cleanup()');r['disposed']=page.evaluate('window.receipt.disposed');page.close();rows.append(r)
   receipt.update(status='PASS',browserVersion=browser.version)
  finally:browser.close();browser=None
finally:
 server.shutdown();server.server_close();thread.join(timeout=2)
 receipt.update(views=rows,pageErrors=errors,failedRequests=failures,serverClosed=not thread.is_alive(),browserClosed=browser is None,elapsedSeconds=round(time.monotonic()-start,3));(HERE/'receipts/comparison-browser.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
