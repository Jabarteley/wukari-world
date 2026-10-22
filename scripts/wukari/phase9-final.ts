/** Local Chromium/CDP acceptance. Own profile/process only; no game accounts or DB. */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, sep, basename } from 'node:path';
import assert from 'node:assert/strict';
import { buildingCollision, canStand, type Study } from '../../src/wukari/play/model.ts';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const output = resolve('docs/wukari/evidence');
mkdirSync(output, { recursive: true });
const profile = mkdtempSync(resolve('.cache/wukari/phase9-browser-'));
const chrome = process.env.CHROME ?? `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`;
const child = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...(process.env.WUKARI_SOFTWARE ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket: WebSocket | undefined;
let sequence = 0, session: string | undefined;
const pending = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}>();
const errors: unknown[] = [], network: string[] = [], checks: Record<string, unknown> = {};
async function poll<T>(fn: () => T | Promise<T>, accept: (value: T) => boolean, label: string, maxMs = 45000): Promise<T> {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
        const value = await fn();
        if (accept(value))
            return value;
        await delay(100);
    }
    throw new Error(`Timed out: ${label}`);
}
function call(method: string, params: Record<string, unknown> = {}, sid = session): Promise<any> {
    const id = ++sequence;
    return new Promise((resolveReply, reject) => { const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 45000); pending.set(id, { resolve: resolveReply, reject, timer }); socket!.send(JSON.stringify({ id, method, params, ...(sid ? { sessionId: sid } : {}) })); });
}
async function evaluate(expression: string) { const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails)
    throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
const state = () => evaluate(`(()=>{const p=document.querySelector('.viewport');return p?{...p.dataset,overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText.slice(0,500)}:null})()`);
async function click(text: string) { const point = await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&b.getBoundingClientRect().width);if(!b)throw Error('Missing button '+${JSON.stringify(text)});b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`); await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }); }
async function key(key: string, down: boolean) { await call('Input.dispatchKeyEvent', { type: down ? 'keyDown' : 'keyUp', key, code: key === 'Shift' ? 'ShiftLeft' : `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key === 'Shift' ? 16 : key.toUpperCase().charCodeAt(0), modifiers: key === 'Shift' && down ? 8 : 0 }); }
async function shot(name: string) { const r = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(resolve(output, `phase9-${name}.png`), Buffer.from(r.data, 'base64')); }
try {
    child.on('error', error => errors.push(String(error)));
    const portFile = resolve(profile, 'DevToolsActivePort');
    const debuggerInfo = await poll(() => { try {
        return readFileSync(portFile, 'utf8');
    }
    catch {
        return '';
    } }, value => /^\d+\r?\n/.test(value), 'Chromium debugger ready');
    const [port, path] = debuggerInfo.trim().split(/\r?\n/);
    socket = new WebSocket(`ws://127.0.0.1:${port}${path}`);
    await new Promise<void>((r, j) => { socket!.addEventListener('open', () => r(), { once: true }); socket!.addEventListener('error', () => j(new Error('CDP connect failed')), { once: true }); });
    socket.addEventListener('message', event => { const m = JSON.parse(String(event.data)); if (m.id) {
        const p = pending.get(m.id);
        if (p) {
            clearTimeout(p.timer);
            pending.delete(m.id);
            if (m.error)
                p.reject(new Error(JSON.stringify(m.error)));
            else
                p.resolve(m.result);
        }
    }
    else {
        if (m.method === 'Runtime.exceptionThrown')
            errors.push(m.params.exceptionDetails);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
            errors.push(m.params.args);
        if (m.method === 'Network.requestWillBeSent')
            network.push(m.params.request.url);
        if (m.method === 'Network.loadingFailed')
            errors.push(m.params);
    } });
    const target = await call('Target.createTarget', { url: 'about:blank' }, '');
    session = (await call('Target.attachToTarget', { targetId: target.targetId, flatten: true }, '')).sessionId;
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Network.enable');
    await call('Page.bringToFront');
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: 'http://127.0.0.1:5196/' });
    const gpu = await call('SystemInfo.getInfo', {}, '');
    writeFileSync(resolve(output, 'phase9-gpu.json'), JSON.stringify(gpu.gpu, null, 2));
    const initial = await poll(state, s => s?.study === 'town' && !!s.mode, 'town ready');
    await click('Play');
    await poll(state, s => s?.mode === 'Standing', 'play');
    await delay(8500);
    await shot('final-town');
    const measurements = [];
    for (const quality of ['low', 'balanced', 'high']) {
        await click('Settings');
        await evaluate(`(()=>{const x=document.querySelector('.settings-fields select');x.value='${quality}';x.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await click('Measure performance');
        await key('w', true);
        await delay(6000);
        await key('w', false);
        await key('q', true);
        await delay(1200);
        await key('q', false);
        await key('d', true);
        await delay(3000);
        await key('d', false);
        await key('Shift', true);
        await key('w', true);
        await delay(4000);
        await key('w', false);
        await key('Shift', false);
        const result = await poll(() => evaluate(`(()=>{const x=document.querySelector('.performance-panel pre');return x?JSON.parse(x.textContent):null})()`), v => !!v && v.frames > 0, 'loaded performance');
        assert(result.trafficVehicles > 0 && result.motorcycles > 0 && result.movingVehicles > 0);
        measurements.push(result);
        await shot('final-performance-' + quality);
        await click('Close results');
    }
    writeFileSync(resolve(output, 'phase9-hardware-measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
    await click('Places');
    await poll(() => evaluate(`document.querySelectorAll('.locations-panel article').length`), n => n > 1, 'source places');
    await shot('final-places');
    await evaluate(`(()=>{const a=[...document.querySelectorAll('.locations-panel article')].find(a=>a.textContent.includes('Takum'));a.querySelector('button').click()})()`);
    await delay(400);
    await shot('f242-vicinity');
    assert((await state()).text.includes('Takum'));
    await click('Places');
    await poll(() => evaluate(`document.querySelectorAll('.locations-panel article').length`), n => n > 1, 'FUW source entry');
    await click('Review location');
    await poll(state, s => s.study === 'fuw', 'FUW review');
    await delay(300);
    await shot('final-fuw-review');
    assert((await state()).mode.startsWith('Exploration'));
    assert(await evaluate(`document.querySelector('.view-tools button:last-child').disabled`));
    await click('Wukari town');
    await poll(state, s => s.study === 'town' && !!s.mode, 'town return');
    await click('Play');
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    await delay(300);
    await shot('final-mobile');
    assert(!(await state()).overflow);
    await click('Customize Character');
    await poll(() => evaluate(`document.querySelector('.portrait')?.dataset.ready`), v => v === 'true', 'mobile wardrobe');
    await click('Female');
    await delay(300);
    await shot('final-mobile-editor');
    assert(!(await state()).overflow);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    writeFileSync(resolve(output, 'phase9-final-browser.json'), JSON.stringify({ status: 'passed', measurements, checks: ['source place lookup', 'F242 source view', 'FUW nonspawning', 'loaded traffic', 'mobile layout', 'mobile wardrobe'], errors }, null, 2) + '\n');
    console.log(JSON.stringify({ status: 'passed', measurements: measurements.map(x => ({ quality: x.quality, fps: x.fps, p95: x.p95Ms, vehicles: x.trafficVehicles, moving: x.movingVehicles })), errors: errors.length }));
}
finally {
    try {
        if (socket?.readyState === 1) {
            socket.send(JSON.stringify({ id: ++sequence, method: 'Browser.close' }));
            await delay(300);
        }
    }
    catch { }
    socket?.close();
    if (child.exitCode === null)
        child.kill();
    for (const p of pending.values())
        clearTimeout(p.timer);
}
