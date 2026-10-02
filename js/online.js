'use strict';
// Online leaderboard (Netlify Function netlify/functions/scores.mjs, Netlify Blobs) + arcade initials entry + board screen.
// The game also runs from file://, so it always talks to the production site unless it is served by Netlify itself;
// ?api=<url> overrides the endpoint (local test: netlify dev -> ?api=http://localhost:8899/api/scores).
const Online = {
  PROD: 'https://veexing-force.netlify.app/api/scores',
  board: null, status: 'idle', error: '', myRank: null, myEntry: null,
  url() {
    const q = new URLSearchParams(location.search).get('api'); if (q) return q;
    return /netlify\.app$/.test(location.hostname) ? '/api/scores' : this.PROD;
  },
  async load() {
    this.status = 'loading'; this.error = '';
    try {
      const r = await fetch(this.url(), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status);
      this.board = (await r.json()).scores || []; this.status = 'ok';
    } catch (e) { this.status = 'error'; this.error = 'CLASSEMENT INDISPONIBLE (HORS LIGNE ?)'; }
  },
  async submit(entry) {
    this.status = 'sending'; this.error = ''; this.myRank = null; this.myEntry = entry;
    try {
      const r = await fetch(this.url(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) throw new Error('TROP RAPIDE : REESSAIE DANS QUELQUES SECONDES');
      if (!r.ok) throw new Error('SCORE REFUSE (' + (d.error || r.status) + ')');
      this.board = d.scores || []; this.myRank = d.rank; this.status = 'ok';
    } catch (e) { this.status = 'error'; this.error = /^[A-Z ]/.test(e.message) && e.message.length > 12 ? e.message : 'ENVOI IMPOSSIBLE (HORS LIGNE ?)'; await this.load().catch(() => {}); }
  }
};

// ---------- initials entry (after a game over or the victory) ----------
const ENTRY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function canRank() { return G.score > 0 && !G.cheated; }
// after: 'gameover' | 'title' - where we go once the board has been seen
function startEntry(after) {
  let last = 'AAA'; try { last = (localStorage.getItem('veexInitials') || 'AAA').toUpperCase(); } catch (e) { /* ignore */ }
  G.entry = { after, slot: 0, chars: last.split('').map(ch => Math.max(0, ENTRY_CHARS.indexOf(ch))), t: 0 };
  G.state = 'entry'; G.menuT = 0; Input.clear();
}
function entryName() { return G.entry.chars.map(i => ENTRY_CHARS[i]).join(''); }
function submitEntry() {
  const name = entryName(); try { localStorage.setItem('veexInitials', name); } catch (e) { /* ignore */ }
  Online.submit({ name, score: G.score, level: G.level + 1, hero: G.hero, cleared: G.entry.after === 'title' });
  G.state = 'board'; G.menuT = 0; G.boardAfter = G.entry.after; Snd.sfx.select(); Input.clear();
}
function entryKey(e) {   // keyboard: type the letters directly
  const en = G.entry; if (!en) return;
  if (e.key === 'Backspace') { en.slot = Math.max(0, en.slot - 1); e.preventDefault(); return; }
  if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
    en.chars[en.slot] = ENTRY_CHARS.indexOf(e.key.toUpperCase()); if (en.slot < 2) en.slot++; Snd.sfx.ui(); e.preventDefault();
    for (const a of ACTIONS) Input.edge[a] = false;   // a typed letter (Z, D, S...) must not also move the cursor / change the letter
  }
}
function stepEntry() {
  const en = G.entry, n = ENTRY_CHARS.length, tap = Input.padTap || {};
  if (Input.eat('up')) { en.chars[en.slot] = (en.chars[en.slot] + n - 1) % n; Snd.sfx.ui(); }
  if (Input.eat('down')) { en.chars[en.slot] = (en.chars[en.slot] + 1) % n; Snd.sfx.ui(); }
  if (Input.eat('left')) en.slot = Math.max(0, en.slot - 1);
  if (Input.eat('right')) en.slot = Math.min(2, en.slot + 1);
  if (tap.b1) { G.state = en.after === 'title' ? 'title' : 'gameover'; G.menuT = 41; Input.clear(); return; }   // B: skip
  if (G.menuT > 20 && (Input.eat('confirm') || tap.b9)) { if (en.slot < 2 && !tap.b9) { en.slot++; Snd.sfx.ui(); } else submitEntry(); }
}
function stepBoard() {
  if (G.menuT > 30 && (Input.eat('confirm') || Input.eat('pause'))) {
    Snd.sfx.ui(); Input.clear();
    if (G.boardAfter === 'title') { G.state = 'title'; Snd.stopMusic(); } else { G.state = 'gameover'; G.menuT = 41; }
  }
}

// ---------- drawing (screen resolution overlay) ----------
function drawEntry(c) {
  const en = G.entry; en.t++;
  c.fillStyle = 'rgba(5,1,15,.8)'; c.fillRect(0, 0, W, H);
  drawText(c, 'NOUVEAU SCORE !', W / 2, 92, { size: 28, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 5 });
  drawText(c, String(G.score).padStart(8, '0'), W / 2, 122, { size: 18, color: '#ffe44d', outline: OUT, align: 'center', italic: true });
  drawText(c, 'ENTRE TES INITIALES', W / 2, 150, { size: 11, color: '#27f0ff', outline: OUT, align: 'center' });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 50 + i * 50, on = i === en.slot;
    c.fillStyle = on ? 'rgba(255,47,208,.25)' : 'rgba(20,8,50,.9)'; c.fillRect(x - 18, 162, 36, 46);
    c.strokeStyle = on ? '#ff2fd0' : '#8b5cff'; c.lineWidth = on ? 2 : 1; c.strokeRect(x - 18, 162, 36, 46);
    drawText(c, ENTRY_CHARS[en.chars[i]], x, 199, { size: 30, color: on && en.t % 30 < 18 ? '#ffe44d' : '#fff', outline: OUT, align: 'center' });
    if (on) { drawText(c, '^', x, 160, { size: 10, color: '#ffe44d', outline: OUT, align: 'center' }); drawText(c, 'v', x, 222, { size: 10, color: '#ffe44d', outline: OUT, align: 'center' }); }
  }
  drawText(c, K('TAPE TES LETTRES   -   ENTREE : VALIDER   -   ECHAP : PASSER', 'HAUT/BAS : LETTRE   A : SUIVANT   START : VALIDER   B : PASSER'), W / 2, 252, { size: 9, color: '#27f0ff', outline: OUT, align: 'center' });
}
function drawBoardPanel(c, title) {
  c.fillStyle = 'rgba(5,1,15,.82)'; c.fillRect(0, 0, W, H);
  drawText(c, title || 'CLASSEMENT MONDIAL', W / 2, 38, { size: 22, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 4 });
  const x0 = W / 2 - 170, y0 = 58;
  c.fillStyle = 'rgba(16,6,40,.92)'; c.fillRect(x0, y0, 340, 250); c.strokeStyle = '#8b5cff'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y0 + 0.5, 339, 249);
  const head = { size: 9, color: '#8b5cff', outline: OUT };
  drawText(c, 'RANG', x0 + 12, y0 + 16, head); drawText(c, 'NOM', x0 + 62, y0 + 16, head); drawText(c, 'SCORE', x0 + 190, y0 + 16, Object.assign({ align: 'right' }, head));
  drawText(c, 'STAGE', x0 + 222, y0 + 16, head); drawText(c, 'HEROS', x0 + 280, y0 + 16, head);
  const B = Online.board;
  if (!B) drawText(c, Online.status === 'error' ? Online.error : 'CHARGEMENT...', W / 2, y0 + 120, { size: 11, color: Online.status === 'error' ? '#ff2a4d' : '#fff', outline: OUT, align: 'center' });
  else if (!B.length) drawText(c, 'PERSONNE ENCORE. A TOI DE JOUER !', W / 2, y0 + 120, { size: 11, color: '#fff', outline: OUT, align: 'center' });
  else B.slice(0, 10).forEach((s, i) => {
    const y = y0 + 38 + i * 20, me = Online.myRank === i + 1;
    if (me) { c.fillStyle = 'rgba(255,47,208,.28)'; c.fillRect(x0 + 4, y - 13, 332, 18); }
    const col = i === 0 ? '#ffe44d' : i < 3 ? '#27f0ff' : '#fff', o = { size: 11, color: me ? '#ff9af0' : col, outline: OUT };
    drawText(c, (i + 1) + '.', x0 + 14, y, o); drawText(c, s.name, x0 + 62, y, o);
    drawText(c, String(s.score).padStart(8, '0'), x0 + 190, y, Object.assign({ align: 'right' }, o));
    drawText(c, s.cleared ? 'FIN' : String(s.level), x0 + 232, y, o); drawText(c, s.hero.toUpperCase(), x0 + 280, y, o);
  });
  if (Online.myRank && Online.myRank > 10) drawText(c, 'TON RANG : ' + Online.myRank, W / 2, y0 + 242, { size: 10, color: '#ff9af0', outline: OUT, align: 'center' });
  if (Online.status === 'sending') drawText(c, 'ENVOI DU SCORE...', W / 2, y0 + 242, { size: 10, color: '#fff', outline: OUT, align: 'center' });
  if (Online.status === 'error' && B) drawText(c, Online.error, W / 2, y0 + 242, { size: 9, color: '#ff2a4d', outline: OUT, align: 'center' });
}
function drawBoard(c) {
  drawBoardPanel(c, G.boardAfter === 'title' ? 'CLASSEMENT MONDIAL' : 'CLASSEMENT MONDIAL');
  if (G.menuT > 30 && G.menuT % 60 < 40) drawText(c, K('ENTREE : CONTINUER', 'A : CONTINUER'), W / 2, H - 22, { size: 12, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true });
}
