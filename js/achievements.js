'use strict';
// Achievements (succes): saved in localStorage, a toast slides in when one unlocks, list screen on the title (S / pad X).
// Disabled for a run started with cheat codes (G.cheated), like the online leaderboard.
const ACH_DEFS = [
  ['first_ko', 'PREMIER SANG', 'Mettre un ennemi K.O.'],
  ['ko_100', 'NETTOYEUR', '100 K.O. au total'],
  ['combo20', 'ENCHAINEUR', 'Combo de 20 coups'],
  ['combo50', 'MACHINE A COMBOS', 'Combo de 50 coups'],
  ['perfect', 'INTOUCHABLE', 'Reussir une esquive parfaite'],
  ['cancel10', 'ANNULATIONS', '10 cancels dans un meme niveau'],
  ['fury', 'FURIE THAI', 'Declencher la Fury'],
  ['bins10', 'EBOUEUR', 'Casser 10 poubelles'],
  ['jet', 'PLOUF', 'Projeter un ennemi avec une bouche d\'incendie'],
  ['steam', 'SAUNA', 'Ebouillanter un ennemi sur une bouche d\'egout'],
  ['electro', 'GAME OVER POUR TOI', 'Faire exploser une borne d\'arcade'],
  ['tilt', 'TILT', 'Renvoyer un ennemi avec un bumper'],
  ['strike', 'BEACH VOLLEY', 'Toucher un ennemi avec le ballon'],
  ['kaboom', 'KABOOM', 'Faire exploser un cabriolet'],
  ['emp', 'COURT-CIRCUIT', 'Detruire un serveur'],
  ['zap', 'ELECTROCUTION', 'Pousser un ennemi sur une plaque electrifiee'],
  ['throw', 'PROJECTION', 'Projeter un ennemi depuis le clinch'],
  ['bowling', 'STRIKE', 'Faucher 2 ennemis avec un ennemi projete'],
  ['stage1', 'NEON DOWNTOWN', 'Finir le niveau 1'],
  ['stage2', 'GALAXY ARCADE', 'Finir le niveau 2'],
  ['stage3', 'SUNSET BOULEVARD', 'Finir le niveau 3'],
  ['stage4', 'CYBER TOWER', 'Finir le niveau 4'],
  ['flawless', 'SANS UNE EGRATIGNURE', 'Finir un niveau sans prendre de degats'],
  ['rank_s', 'STYLE S', 'Obtenir la note S a la fin d\'un niveau'],
  ['roxy', 'LA TORNADE', 'Finir un niveau avec ROXY'],
  ['legend', 'LEGENDE DU QUARTIER', 'Finir le jeu sans perdre une vie'],
];
const Ach = {
  got: {}, count: {}, toasts: [],
  load() {
    try { const d = JSON.parse(localStorage.getItem('veexAch') || '{}'); this.got = d.got || {}; this.count = d.count || {}; } catch (e) { this.got = {}; this.count = {}; }
  },
  save() { try { localStorage.setItem('veexAch', JSON.stringify({ got: this.got, count: this.count })); } catch (e) { /* ignore */ } },
  unlock(id) {
    if (G.cheated || this.got[id]) return;
    const def = ACH_DEFS.find(d => d[0] === id); if (!def) return;
    this.got[id] = new Date().toISOString().slice(0, 10); this.save();
    this.toasts.push({ name: def[1], desc: def[2], t: 0 });
    Snd.sfx.pickup && Snd.sfx.pickup();
  },
  // cumulated counters (kept across runs): unlock `id` once the counter reaches `goal`
  add(counter, goal, id, n = 1) {
    if (G.cheated) return;
    this.count[counter] = (this.count[counter] || 0) + n; this.save();
    if (this.count[counter] >= goal) this.unlock(id);
  },
  total() { return Object.keys(this.got).length; },
  drawToast(c) {
    const a = this.toasts[0]; if (!a) return;
    a.t++; const inT = Math.min(1, a.t / 14), outT = a.t > 190 ? (a.t - 190) / 14 : 0;
    if (outT >= 1) { this.toasts.shift(); return; }
    const y = -40 + (inT - outT) * 76, w = 250, x = (W - w) / 2;
    c.fillStyle = 'rgba(12,4,32,.94)'; c.fillRect(x, y, w, 36); c.strokeStyle = '#ffe44d'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, 34);
    c.fillStyle = '#ffe44d'; for (let i = 0; i < 5; i++) { const a2 = -Math.PI / 2 + i * Math.PI * 2 / 5; c.fillRect(x + 18 + Math.cos(a2) * 6 - 1, y + 18 + Math.sin(a2) * 6 - 1, 3, 3); }
    drawText(c, 'SUCCES DEBLOQUE', x + 34, y + 14, { size: 9, color: '#ffe44d', outline: OUT });
    drawText(c, a.name, x + 34, y + 28, { size: 12, color: '#fff', outline: OUT, italic: true, glow: '#ff2fd0' });
  },
  drawList(c) {
    c.fillStyle = 'rgba(5,1,15,.88)'; c.fillRect(0, 0, W, H);
    drawText(c, 'SUCCES  ' + this.total() + ' / ' + ACH_DEFS.length, W / 2, 30, { size: 20, color: '#fff', outline: '#ff2fd0', align: 'center', italic: true, glow: '#ff2fd0', outlineW: 4 });
    ACH_DEFS.forEach((d, i) => {
      const col = i % 2, row = Math.floor(i / 2), x = 26 + col * 300, y = 52 + row * 23, ok = !!this.got[d[0]];
      c.fillStyle = ok ? 'rgba(255,228,77,.12)' : 'rgba(40,20,80,.5)'; c.fillRect(x, y, 288, 20);
      c.fillStyle = ok ? '#ffe44d' : '#3a2a5a'; c.fillRect(x + 4, y + 5, 10, 10);
      drawText(c, ok ? d[1] : d[1], x + 20, y + 10, { size: 9, color: ok ? '#fff' : '#8a7aaa', outline: OUT });
      drawText(c, d[2], x + 20, y + 18, { size: 7, color: ok ? '#27f0ff' : '#5a4a7a', outline: OUT });
    });
    drawText(c, K('S / ECHAP : RETOUR', 'B / X : RETOUR'), W / 2, H - 8, { size: 9, color: '#27f0ff', outline: OUT, align: 'center' });
  }
};
