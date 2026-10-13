"""Bounded local-only browser proof. Caller acquires heavy/server/browser slots."""
import functools,json,threading,time,hashlib
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def translate_path(self,path):
  p=Path(super().translate_path(path)).resolve()
  return str(p if p==HERE or HERE in p.parents else HERE/'not-found')
start=time.monotonic();errors=[];failed=[];requests=[];r={'status':'FAILED'};browser=None
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(HERE)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],timeout=20000)
  try:
   page=browser.new_page(viewport={'width':1050,'height':744},device_scale_factor=1)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
   page.on('requestfailed',lambda req:failed.append({'url':req.url,'error':req.failure}))
   page.on('response',lambda res:requests.append({'name':res.url.split('/')[-1],'status':res.status}) if res.url.endswith('.glb') else None)
   origin=f'http://127.0.0.1:{server.server_address[1]}/'
   page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) else route.abort())
   page.goto(origin+'proof.html',wait_until='networkidle',timeout=20000)
   page.wait_for_function('window.receipt?.ready || window.proofError',timeout=15000)
   assert not page.evaluate('window.proofError'),page.evaluate('window.proofError')
   assert not errors and not failed,(errors,failed)
   assert requests==[{'name':'everyday-01-on-form.glb','status':200}],requests
   r=page.evaluate('window.receipt');r.update(status='PASS',browserVersion=browser.version)
   image=HERE/'artifacts/raw-gltfloader-proof.jpg';page.screenshot(path=str(image),type='jpeg',quality=90,full_page=True,timeout=8000)
   r['screenshot']={'path':str(image.relative_to(HERE)),'bytes':image.stat().st_size,'sha256':hashlib.sha256(image.read_bytes()).hexdigest()}
   page.evaluate('window.cleanup()');r['disposed']=page.evaluate('window.receipt.disposed')
  finally:browser.close();browser=None
finally:
 server.shutdown();server.server_close();thread.join(timeout=2)
 r.update(pageErrors=errors,failedRequests=failed,glbResponses=requests,serverClosed=not thread.is_alive(),browserClosed=browser is None,elapsedSeconds=round(time.monotonic()-start,3))
 (HERE/'receipts/browser-proof.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
