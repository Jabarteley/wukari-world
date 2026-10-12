import { Browser } from '/Users/anthonyakpan/Documents/Allworld-notes/work/x1-adcap/scripts/journeys/cdp.ts';
import { playNow } from '/Users/anthonyakpan/Documents/Allworld-notes/work/x1-adcap/scripts/journeys/kit.ts';
const b = await Browser.attach(4632, { kill() {} } as any, '/nonexistent');
await b.setViewport({ width: 540, height: 960, scale: 2, mobile: true });
await playNow(b, 'http://127.0.0.1:4631', process.argv[2] || 'Tola');
console.log('ok');
b.ws.close(); process.exit(0);
