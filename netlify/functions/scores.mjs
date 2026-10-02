// VEEXING FORCE online leaderboard (Netlify Function + Netlify Blobs).
//   GET  /api/scores          -> { scores: [{ name, score, level, hero, cleared, date }] }  (top 20, best first)
//   POST /api/scores  { name, score, level, hero, cleared }  -> { rank, scores }
// The game also runs from file:// (local double-click), so the API answers any origin (CORS *).
// Arcade trust model: light validation + one submission per player every 15 s; it is a fun board, not an anti-cheat system.
import { getStore } from '@netlify/blobs';

const KEEP = 100, SHOW = 20, MAX_SCORE = 5_000_000, COOLDOWN_MS = 15_000;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function hashIp(ip) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('veex:' + ip));
  return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const store = getStore('leaderboard');
  const board = (await store.get('arcade', { type: 'json' })) || [];

  if (req.method === 'GET') return json({ scores: board.slice(0, SHOW) });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'json' }, 400); }
  const name = String(b.name || '').toUpperCase(), score = Number(b.score), level = Number(b.level);
  const hero = b.hero === 'roxy' ? 'roxy' : 'veex', cleared = !!b.cleared;
  if (!/^[A-Z0-9]{3}$/.test(name)) return json({ error: 'name' }, 400);
  if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE) return json({ error: 'score' }, 400);
  if (!Number.isInteger(level) || level < 1 || level > 4) return json({ error: 'level' }, 400);

  const who = await hashIp(context.ip || req.headers.get('x-nf-client-connection-ip') || 'unknown');
  const last = await store.get('rl/' + who, { type: 'json' });
  if (last && Date.now() - last.t < COOLDOWN_MS) return json({ error: 'slow down' }, 429);
  await store.setJSON('rl/' + who, { t: Date.now() });

  const entry = { name, score, level, hero, cleared, date: new Date().toISOString().slice(0, 10) };
  board.push(entry);
  board.sort((a, c) => c.score - a.score);
  const rank = board.indexOf(entry) + 1;
  await store.setJSON('arcade', board.slice(0, KEEP));
  return json({ rank: rank <= KEEP ? rank : null, scores: board.slice(0, SHOW) });
};

export const config = { path: '/api/scores' };
