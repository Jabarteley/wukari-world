// usage: node ev.ts <port> '<js expression>' | shot <file> | view W H SCALE | goto URL
import { Browser } from '/Users/anthonyakpan/Documents/Allworld-notes/work/x1-adcap/scripts/journeys/cdp.ts';
const [port, cmd, a, b2, c] = process.argv.slice(2);
const b = await Browser.attach(Number(port), { kill() {} } as any, '/nonexistent');
await b.setViewport({ width: 540, height: 960, scale: 2, mobile: false });
try {
  if (cmd === 'shot') await b.screenshot(a!);
  else if (cmd === 'view') await b.setViewport({ width: +a!, height: +b2!, scale: +c!, mobile: true });
  else if (cmd === 'goto') await b.goto(a!);
  else if (cmd === 'click') await b.click(a!, b2);
  else console.log(JSON.stringify(await b.eval(cmd!), null, 1));
} catch (e) { console.log('ERR', String(e).slice(0, 600)); }
b.ws.close(); process.exit(0);
