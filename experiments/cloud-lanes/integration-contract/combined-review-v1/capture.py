"""One loopback server and bounded software browser capture; always shut down."""
from pathlib import Path
import json,threading,http.server,functools,time
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];DOC=ROOT/'docs/agent-plans/cloud-lanes/integration-contract/combined-review-v1'
VENDOR=Path('/workspace/joinallworld-cloud-coordinator/node_modules/three')
class Handler(http.server.SimpleHTTPRequestHandler):
 def translate_path(self,path):
  if path.startswith('/vendor/'):
   p=(VENDOR/path.split('?',1)[0][8:]).resolve();assert p.is_relative_to(VENDOR.resolve());return str(p)
  return super().translate_path(path)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(HERE)));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
errors=[];failures=[];start=time.monotonic()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  try:
   page=browser.new_page(viewport={'width':2050,'height':1450},device_scale_factor=1)
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('requestfailed',lambda r:failures.append(r.url))
   page.goto(f'http://127.0.0.1:{server.server_port}/preview.html',wait_until='networkidle',timeout=30000)
   page.wait_for_function('window.__reviewReady===true',timeout=40000)
   page.screenshot(path=str(DOC/'combined-character-diagnostic.png'),full_page=True)
   receipt=page.evaluate('window.__reviewReceipt');receipt.update({'browserErrors':errors,'failedRequests':failures,'seconds':time.monotonic()-start,'stillFrameCount':12,'videoGenerated':False,'delivery':'one 12-panel screenshot; no generated replacement pixels'})
   (DOC/'browser-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
   print(json.dumps({'views':len(receipt['views']),'renderCalls':sorted({x['renderCalls'] for x in receipt['views']}),'renderedTriangles':sorted({x['renderedTriangles'] for x in receipt['views']}),'errors':errors,'cleanup':receipt['cleanup'],'seconds':receipt['seconds']}))
  finally:browser.close()
finally:server.shutdown();server.server_close();thread.join(timeout=2)
