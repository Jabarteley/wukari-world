import http from 'node:http';
import { readFileSync } from 'node:fs';

const target = { hostname: '127.0.0.1', port: 5351 };
const origin = 'http://127.0.0.1:5353';
const upstreamOrigin = 'http://127.0.0.1:5351';
const observer = readFileSync(new URL('./phase1-mode-timing-observer.js', import.meta.url), 'utf8');
const sockets = new Set();
function headersOf(request) {
  return {
    ...request.headers,
    host: '127.0.0.1:5351',
    'accept-encoding': 'identity',
    ...(request.headers.origin === origin ? { origin: upstreamOrigin } : {}),
    ...(request.headers.referer?.startsWith(origin + '/') ? { referer: upstreamOrigin + request.headers.referer.slice(origin.length) } : {}),
  };
}
const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/__story-qa-timing.js') {
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    response.end(observer); return;
  }
  const upstream = http.request({ ...target, method: request.method, path: request.url, headers: headersOf(request) }, incoming => {
    const isHtml = request.method === 'GET' && incoming.statusCode === 200 && String(incoming.headers['content-type']).includes('text/html');
    if (!isHtml) { response.writeHead(incoming.statusCode ?? 502, incoming.headers); incoming.pipe(response); return; }
    const chunks = [];
    incoming.on('data', chunk => chunks.push(chunk));
    incoming.on('end', () => {
      const html = Buffer.concat(chunks).toString('utf8');
      if (!html.includes('</body>') || incoming.headers['content-encoding']) { response.writeHead(502); response.end('Measurement HTML unavailable'); return; }
      const body = Buffer.from(html.replace('</body>', '<script src="/__story-qa-timing.js"></script></body>'));
      const headers = { ...incoming.headers, 'content-length': body.length, 'cache-control': 'no-store' };
      if (headers['content-security-policy']) headers['content-security-policy'] = headers['content-security-policy'].replaceAll('ws://127.0.0.1:5351', 'ws://127.0.0.1:5353').replaceAll('wss://127.0.0.1:5351', 'wss://127.0.0.1:5353');
      delete headers['transfer-encoding']; delete headers.etag;
      response.writeHead(incoming.statusCode ?? 200, headers); response.end(body);
    });
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Measurement upstream unavailable'); });
  request.pipe(upstream);
});
server.on('upgrade', (request, socket, head) => {
  const upstream = http.request({ ...target, method: request.method, path: request.url, headers: headersOf(request) });
  upstream.on('upgrade', (incoming, peer, peerHead) => {
    sockets.add(peer); peer.on('close', () => sockets.delete(peer));
    const rawHeaders = [];
    for (let index = 0; index < incoming.rawHeaders.length; index += 2) rawHeaders.push(`${incoming.rawHeaders[index]}: ${incoming.rawHeaders[index + 1]}`);
    socket.write(`HTTP/1.1 ${incoming.statusCode} ${incoming.statusMessage}\r\n${rawHeaders.join('\r\n')}\r\n\r\n`);
    if (head.length) peer.write(head);
    if (peerHead.length) socket.write(peerHead);
    peer.on('error', () => socket.destroy()); socket.on('error', () => peer.destroy());
    peer.on('close', () => socket.destroy()); socket.on('close', () => peer.destroy());
    peer.pipe(socket); socket.pipe(peer);
  });
  upstream.on('response', incoming => { socket.end(`HTTP/1.1 ${incoming.statusCode ?? 502} Rejected\r\nConnection: close\r\n\r\n`); incoming.resume(); });
  upstream.on('error', () => socket.destroy());
  upstream.end();
});
server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
server.listen(5353, '127.0.0.1', () => process.stdout.write('Passive mode timing proxy ready on5353; unchanged preview5351 remains upstream.\n'));
function stop() { for (const socket of sockets) socket.destroy(); server.close(() => process.exit(0)); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
