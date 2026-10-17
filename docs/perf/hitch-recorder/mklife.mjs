import { randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:5191';
const res = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ name: 'Kunle' + Math.floor(Math.random() * 900), onboarding: true }) });
const sid = res.headers.get('set-cookie').match(/sid=([^;]+)/)[1];
let srvOff = null; const act = async (type, payload) => { if (srvOff === null) { const l = await (await fetch(base + '/api/life?city=lagos', { headers: { Cookie: 'sid=' + sid } })).json(); srvOff = (l.serverTime ?? Date.now()) - Date.now(); } return (await fetch(base + '/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: 'sid=' + sid }, body: JSON.stringify({ actionId: (Date.now() + srvOff) + ':' + randomUUID(), cityId: 'lagos', type, payload }) })).json(); };
await fetch(base + '/api/life?city=lagos', { headers: { Cookie: 'sid=' + sid } });
for (const [t, p] of [['onboarding.look', { look: { body: 'man', hair: 'low-cut', outfit: 'casual', fabric: 'plain', skin: 'skin-4', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy' } }], ['onboarding.traits', { traits: ['musical', 'tech-bro-or-sis'] }], ['onboarding.dream', { dream: 'yaba-unicorn' }], ['onboarding.lottery', {}], ['onboarding.home', { lga: 'lagos-island', stay: true }]]) await act(t, p);
console.log(sid);
