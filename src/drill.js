// Play & learn (边学边玩): a weekend's sticker drill inside the AET class — the Drug Drill app (drugs/app.js, approved
// mock drug-trainer/design/mock.html) ported into the course. One real-object sticker per screen on dot-grid paper; the BC
// ambulance Battenburg check only on progress and the streak; English first with a 中文 chip that reveals the Chinese.
// Content: aet-class/classroom/drill/wNN.json (aet-class/BRIEF-drill.md), shipped encrypted in the weekend's vault part as
// "drill" by tools/build_vault.py (without ev / kp / obj). Item kinds: do (a two-way call), pick, tf, chips, order.
// Scheduling is per card, not per question: a card comes back after IV days and each visit asks 3–4 of its items, the ones
// missed last time first. A new card is taught in three short screens, then asked straight away. A round is 10 questions;
// missed items are asked again at the end of the round. Progress: store key 'drill:wNN'.
// Also the EMR Play & learn decks (src/play.js): opts.key / opts.kick / opts.tag. A deck with mode "sims" plays each card as one
// whole call in order: a dispatch screen, every step once (no retries), deductions "w" from 100 ("fail" = automatic fail),
// 70 passes; the card's learn screens become the debrief.
// One-day pace (the AET class, opts.key not set): a weekend is learned in one sitting, so nothing waits for tomorrow. A card is
// taught, asked straight away, asked again in a later round, and counts as mastered once b >= 2 (two clean visits); a card
// with misses drops back and returns next round. The EMR decks keep the day-based IV schedule.
// Styles: styles.css, everything under .ddx (light and dark follow the site's theme). Fonts load on first use.
// Sound (sfx): a chime when right (climbing with the combo), a soft buzz when wrong, a lower one for an automatic fail, a jingle
// at the end of a round and a fanfare when today is done; the speaker button mutes it on this device.
import { S, esc } from './app.js?v=90';

const IV = [0, 1, 3, 7, 14, 30], ROUND = 10;
const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Instrument+Serif:ital@1&family=Noto+Sans+SC:wght@400;500;700&display=swap';
export function loadFonts() {
  if (document.getElementById('ddx-fonts')) return;
  for (const [href, cors] of [['https://fonts.googleapis.com', 0], ['https://fonts.gstatic.com', 1]]) {
    const p = document.createElement('link'); p.rel = 'preconnect'; p.href = href; if (cors) p.crossOrigin = ''; document.head.appendChild(p);
  }
  const l = document.createElement('link'); l.id = 'ddx-fonts'; l.rel = 'stylesheet'; l.href = FONTS; document.head.appendChild(l);
}
const I = {
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21.1l1.5-7L2 9.3l7-.8z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  snd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
};

/* ---------------- sound: right, wrong, round done, today done. Synthesized with Web Audio (no files to load); the speaker
   button in the top bar turns it off on this device ('ddx:sound' = '0'). Every sound starts from a tap, so phones allow it. */
const SND = 'ddx:sound';
let actx = null;
const soundOn = () => { try { return localStorage.getItem(SND) !== '0'; } catch { return true; } };
function note(a, f, at, dur, { type = 'sine', vol = 0.16, glide = 0, lp = 0, bell = 0 } = {}) {
  const t = a.currentTime + at, g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let out = g;
  if (lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; g.connect(fl); out = fl; }
  out.connect(a.destination);
  for (const [fr, k] of [[f, 1]].concat(bell ? [[f * 2, bell]] : [])) {   // bell: a soft octave partial for a chime
    const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(fr, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(fr * glide, t + dur);
    if (k === 1) o.connect(g); else { const gk = a.createGain(); gk.gain.value = k; o.connect(gk); gk.connect(g); }
    o.start(t); o.stop(t + dur + 0.02);
  }
}
function sfx(kind, combo = 0) {
  if (!soundOn()) return;
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const a = actx || (actx = new A());
    if (a.state === 'suspended') a.resume().catch(() => {});
    const up = 2 ** (Math.min(Math.max(combo - 1, 0), 7) / 12);   // a combo climbs a semitone per answer, up to a fifth
    switch (kind) {
      case 'ok': note(a, 784 * up, 0, 0.16, { bell: 0.25 }); note(a, 1175 * up, 0.075, 0.32, { bell: 0.25 }); break;
      case 'no': note(a, 247, 0, 0.16, { type: 'square', vol: 0.07, lp: 800, glide: 0.94 }); note(a, 185, 0.14, 0.3, { type: 'square', vol: 0.07, lp: 700, glide: 0.92 }); break;
      case 'fail': [294, 247, 196].forEach((f, i) => note(a, f, i * 0.2, i === 2 ? 0.65 : 0.22, { type: 'square', vol: 0.07, lp: 700, glide: i === 2 ? 0.9 : 0.97 })); break;
      case 'round': [523, 659, 784].forEach((f, i) => note(a, f, i * 0.09, 0.22, { bell: 0.2 })); note(a, 1047, 0.27, 0.55, { bell: 0.3 }); break;
      case 'today':
        [523, 659, 784, 1047].forEach((f, i) => note(a, f, i * 0.1, 0.26, { type: 'triangle', vol: 0.12, bell: 0.2 }));
        [1047, 1319, 1568].forEach(f => note(a, f, 0.44, 1.2, { type: 'triangle', vol: 0.08, bell: 0.15 }));
        [2093, 2637, 3136, 2637, 3520].forEach((f, i) => note(a, f, 0.56 + i * 0.07, 0.28, { vol: 0.035 }));
        break;
    }
  } catch { /* no audio on this device */ }
}
const MISSING = new Set();   // sticker URLs that failed: drawn as the shelf-initial disc from then on, never a broken image
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return (Math.abs(h) % 11) - 5; };
const hashStr = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/* ---------------- language: the site's choice (en · zh · both); in en, 中文 reveals the Chinese ---------------- */
const lang = () => (S.lang === 'zh' || S.lang === 'both' ? S.lang : 'en');
const T = o => { // bilingual object -> html
  if (o == null) return '';
  if (typeof o === 'string') return esc(o);
  const en = o.en == null ? '' : o.en, zh = o.zh == null ? '' : o.zh;
  if (lang() === 'zh') return esc(zh || en);
  return esc(en) + (zh ? `<span class="zh">${esc(zh)}</span>` : '');
};
const inl = (en, zh) => esc(lang() === 'en' ? en : lang() === 'zh' ? zh : en + ' ' + zh);
const nm = o => (o == null ? '' : typeof o === 'string' ? o : lang() === 'zh' ? (o.zh || o.en || '') : (o.en || ''));   // a name in a tag: one language
const up = o => (o == null ? '' : typeof o === 'string' ? o : { en: String(o.en || '').toUpperCase(), zh: o.zh });

export function drillLab(host, store, D, opts = {}) {
  loadFonts();
  const wk = +(D && D.wk) || +opts.wk || 0, KEY = opts.key || 'drill:w' + String(wk).padStart(2, '0'), SIM = !!D && D.mode === 'sims', PASS = 70, ONE = !opts.key && !SIM, GOAL = 2;
  const st = Object.assign({ items: {}, cards: {}, seen: {}, days: {}, streak: { n: 0, last: 0, best: 0 } }, store.get(KEY, null) || {});
  const save = () => store.set(KEY, st);
  const SH = {}, CARD = {};
  (D.shelves || []).forEach((s, i) => { SH[s.id] = Object.assign({}, s, { i }); });
  const cards = (D.cards || []).filter(c => c && c.id && SH[c.shelf]);
  cards.forEach(c => { CARD[c.id] = c; });
  const shelves = (D.shelves || []).filter(s => cards.some(c => c.shelf === s.id));
  const shelfCards = sid => cards.filter(c => c.shelf === sid);
  const shelfName = s => inl(s.en || '', s.zh || s.en || '');

  host.innerHTML = '<div class="ddx"></div>';
  const root = host.firstElementChild;
  const $ = sel => root.querySelector(sel), $$ = sel => root.querySelectorAll(sel);

  /* ---------------- stickers ---------------- */
  // aet-class-data/img/drill/wNN/<card id>.webp; until a sticker exists the card shows its shelf's initial on a round sticker
  const disc = (c, cls, style) => { const s = SH[c.shelf], ch = (nm(s) || '?').trim().charAt(0).toUpperCase();
    return `<span class="stk nostk f${s.i % 7} ${cls}" data-c="${esc(c.id)}" style="--r:${tilt(c.id)}deg;${style}" aria-hidden="true"><b>${esc(ch)}</b></span>`; };
  const stk = (c, cls = '', style = '') => {
    const u = opts.img && (!Array.isArray(D.stk) || D.stk.includes(c.id)) ? opts.img(c.id) : '';
    if (!u || MISSING.has(u)) return disc(c, cls, style);
    return `<img class="stk ${cls}" src="${esc(u)}" alt="" draggable="false" data-c="${esc(c.id)}" style="--r:${tilt(c.id)}deg;${style}">`;
  };
  root.addEventListener('error', e => {
    const im = e.target;
    if (!im || im.tagName !== 'IMG' || !im.dataset.c || !CARD[im.dataset.c]) return;
    MISSING.add(im.getAttribute('src'));
    const cls = [...im.classList].filter(x => x !== 'stk').join(' ');
    im.outerHTML = disc(CARD[im.dataset.c], cls, (im.getAttribute('style') || '').replace(/--r:[^;]*;?/, ''));
  }, true);

  /* ---------------- items and spaced repetition ---------------- */
  const ITEMS = {};
  function itemsOf(c) {
    if (ITEMS[c.id]) return ITEMS[c.id];
    const used = new Set(), out = [];
    (c.items || []).forEach((d, i) => {
      if (!d || !build({ card: c, d })) return;   // a malformed item is skipped, never shown half-built
      let k = c.id + '/' + hashStr(d.kind + JSON.stringify([d.stem, d.ask, d.s]));
      if (used.has(k)) k += '.' + i;
      used.add(k); out.push({ k, card: c, d });
    });
    return (ITEMS[c.id] = out);
  }
  const isCall = it => it.d.kind === 'do' || (it.d.kind === 'pick' && !!it.d.stem);
  const rec = it => st.items[it.k];
  const crec = c => st.cards[c.id];
  const mastery = c => { const r = crec(c); return r ? Math.min(1, r.b / (ONE ? GOAL : 4)) : 0; };   // one-day: mastered = three stars
  const curStreak = () => (st.streak.last >= today() - 1 ? st.streak.n : 0);
  const isDue = c => { const r = crec(c); return !!st.seen[c.id] && (!r || (ONE ? r.b < GOAL : r.due <= today())); };
  const isMastered = c => { const r = crec(c); return !!r && r.b >= GOAL; };
  const minsLeft = () => { const un = cards.filter(c => !st.seen[c.id]).length, du = dueCards(cards).length; return Math.max(1, Math.round(un * 2.2 + du * 0.7)); };
  const dueCards = cs => cs.filter(isDue);
  let R = null;   // the round in progress
  function grade(it, ok) { // one first-try answer
    const r = st.items[it.k] || (st.items[it.k] = { n: 0, w: 0 });
    r.n++; r.last = Date.now(); r.ok = ok; if (!ok) r.w++;
    const t = today(), d = st.days[t] || (st.days[t] = { q: 0, ok: 0 });
    d.q++; if (ok) d.ok++;
    if (d.q >= ROUND && st.streak.last !== t) {
      if (R) R.dayDone = true;   // today's practice is in: the done screen plays the "today" fanfare
      st.streak.n = st.streak.last === t - 1 ? st.streak.n + 1 : 1;
      st.streak.last = t; st.streak.best = Math.max(st.streak.best || 0, st.streak.n);
    }
    for (const k of Object.keys(st.days)) if (+k < t - 90) delete st.days[k];
    const tally = R && R.tally && R.tally[it.card.id];
    if (tally) { tally.done++; if (!ok) tally.wrong++; if (tally.done === tally.n) settle(it.card, tally); }
    save();
  }
  function settle(c, tally) { // every question planned for this card in this round is answered: move it along the schedule
    const r = st.cards[c.id] || (st.cards[c.id] = { b: 0, due: 0, n: 0 }), miss = tally.wrong / tally.n;
    if (SIM && R && R.sim) { const ok = !R.sim.fail && R.sim.score >= PASS; r.b = !ok ? 0 : R.sim.score >= 90 ? Math.min(5, r.b + 1) : Math.max(1, r.b); r.best = Math.max(r.best || 0, R.sim.fail ? 0 : R.sim.score); }
    else if (tally.fresh) r.b = miss > 0.34 ? 0 : 1;
    else if (miss <= (ONE ? 0.34 : 0.1)) r.b = Math.min(5, r.b + 1);   // one-day: at most one miss in a visit still counts
    else if (miss > 0.34) r.b = ONE ? Math.max(0, r.b - 1) : Math.max(1, r.b - 1);
    r.n++; r.due = today() + IV[r.b];
  }
  function pickItems(c, n) { // missed last time first, then never asked, then asked longest ago; always one patient call if the card has one
    const score = it => { const r = rec(it); return !r ? 1 : r.ok === false ? 0 : 2 + (r.last || 0) / 1e13; };
    const its = shuffle(itemsOf(c)).sort((x, y) => score(x) - score(y)), out = its.slice(0, n);
    if (out.length && !out.some(isCall)) { const cs = its.find(isCall); if (cs) out[out.length - 1] = cs; }
    return out;
  }
  function introSet(c, n) { // the first questions right after a card is taught: a call, hands-on, a statement, then the rest
    const its = itemsOf(c), of = f => shuffle(its.filter(f));
    const calls = of(isCall), hands = of(i => i.d.kind === 'chips' || i.d.kind === 'order'), tfs = of(i => i.d.kind === 'tf'), picks = of(i => i.d.kind === 'pick' && !i.d.stem);
    const out = [...new Set([calls[0], hands[0], tfs[0], calls[1], picks[0], tfs[1], hands[1], calls[2], picks[1]].filter(Boolean))].slice(0, n);
    for (const it of shuffle(its)) if (out.length < n && !out.includes(it)) out.push(it);
    return out;
  }

  /* ---------------- question builders ---------------- */
  const has = o => o && (typeof o === 'string' || o.en);
  function build(it) {
    const q = build0(it);
    if (q && it.d.stem && (!q.stem || q.mode === 'tf')) q.stem = it.d.stem;
    return q;
  }
  function build0(it) {
    const d = it.d;
    switch (d.kind) {
      case 'do':
        if (!has(d.stem) || !has(d.yes) || !has(d.no) || typeof d.a !== 'boolean') return null;
        return { ui: 'two', mode: 'do', stem: d.stem, ask: d.ask || { en: 'Your call?', zh: '你怎么做？' }, yes: d.yes, no: d.no, a: d.a, why: d.why, bad: d.bad, src: d.src };
      case 'tf':
        if (!has(d.s) || typeof d.a !== 'boolean') return null;
        return { ui: 'two', mode: 'tf', quote: d.s, ask: { en: 'True or false?', zh: '对还是错？' }, yes: { en: 'True', zh: '对' }, no: { en: 'False', zh: '错' }, a: d.a, why: d.why, src: d.src };
      case 'pick':
        if (!has(d.ask) || !Array.isArray(d.opts) || d.opts.length < 2) return null;
        return { ui: 'opts', stem: d.stem, ask: d.ask, opts: shuffle(d.opts.map((t, i) => ({ t, ok: i === 0 }))), why: d.why, bad: d.bad, src: d.src };
      case 'chips':
        if (!has(d.ask) || !(d.right || []).length || !(d.wrong || []).length) return null;
        return { ui: 'chips', ask: d.ask, chips: shuffle(d.right.map(t => ({ t, ok: true })).concat(d.wrong.map(t => ({ t, ok: false })))), why: d.why, src: d.src };
      case 'order': {
        const n = (d.steps || []).length;
        if (!has(d.ask) || n < 2) return null;
        let perm = shuffle([...Array(n).keys()]);
        for (let tries = 0; tries < 6 && perm.every((v, i) => v === i); tries++) perm = shuffle(perm);   // never hand it over already solved
        return { ui: 'order', ask: d.ask, steps: d.steps, perm, seq: [], why: d.why, src: d.src };
      }
    }
    return null;
  }

  /* ---------------- rounds ---------------- */
  const q1 = it => ({ t: 'q', item: it });
  function buildRound(scope) {
    const pool = scope.card ? [CARD[scope.card]] : scope.shelf ? shelfCards(scope.shelf) : cards, tally = {};
    if (SIM) { // one whole call: the next due, else the next new one, else the weakest
      const sc = c => crec(c) || { b: 0, due: 0 };
      const c = scope.card ? pool[0] : (dueCards(pool).sort((x, y) => sc(x).due - sc(y).due)[0] || pool.find(x => !st.seen[x.id]) || pool.slice().sort((x, y) => sc(x).b - sc(y).b)[0]);
      if (!c) return { steps: [], tally };
      const its = itemsOf(c);
      tally[c.id] = { n: its.length, done: 0, wrong: 0, fresh: !st.seen[c.id] };
      return { steps: [{ t: 'brief', card: c }].concat(its.map(q1)), tally };
    }
    if (scope.card) { // one card, everything about it
      const c = pool[0], fresh = !st.seen[c.id], its = fresh ? introSet(c, 12) : shuffle(itemsOf(c)).slice(0, 12);
      if (fresh || isDue(c)) tally[c.id] = { n: its.length, done: 0, wrong: 0, fresh };
      return { steps: (fresh ? [{ t: 'learn', card: c }] : []).concat(its.map(q1)), tally };
    }
    const sched = c => crec(c) || { b: 0, due: 0 };
    const due = dueCards(pool).sort((x, y) => (sched(x).due - sched(y).due) || (sched(x).b - sched(y).b));
    const unseen = pool.filter(c => !st.seen[c.id]);
    let lead = [], fresh = null, room = ROUND;
    const teach = (c, n) => { const its = introSet(c, n); tally[c.id] = { n: its.length, done: 0, wrong: 0, fresh: true }; room -= its.length; return [{ t: 'learn', card: c }].concat(its.map(q1)); };
    if (unseen.length && (ONE || due.length <= 6)) { fresh = unseen[0]; lead = teach(fresh, due.length ? 5 : 6); } // room for a new card: teach it, then ask straight away
    const review = [];
    for (const c of due) {
      if (room < 2) break;
      const its = pickItems(c, Math.min(room, sched(c).b <= 1 ? 4 : 3));
      review.push(...its.map(q1)); room -= its.length;
      tally[c.id] = { n: its.length, done: 0, wrong: 0 };
    }
    if (due.length <= (ONE ? 2 : 0) && unseen.length > 1 && room >= 4) lead = lead.concat(teach(unseen[1], 4));   // nothing to review yet: a second new card fills the round
    if (room >= 2) { // nothing else is due: extra practice on the weakest cards already learned. It does not move their schedule.
      const rest = shuffle(pool.filter(c => st.seen[c.id] && !tally[c.id])).sort((x, y) => sched(x).b - sched(y).b);
      for (const c of rest) { if (room < 2) break; const its = pickItems(c, Math.min(room, 3)); review.push(...its.map(q1)); room -= its.length; }
    }
    const tail = shuffle(review);
    // two warm-up reviews first, then the new card, then the rest
    return { steps: fresh && tail.length >= 3 ? tail.slice(0, 2).concat(lead, tail.slice(2)) : lead.concat(tail), tally };
  }
  function startRound(scope) {
    const { steps, tally } = buildRound(scope);
    if (!steps.length) { R = null; return goHome(); }
    const cs = [...new Set(steps.map(s => s.card || s.item.card))];
    R = { scope, steps, tally, i: 0, right: 0, first: 0, combo: 0, best: 0, cards: cs, learned: [], sim: SIM ? { score: 100, fail: false, lost: [] } : null,
      allAtStart: cards.every(isMastered), dueAtStart: dueCards(cards).length, dayDone: false };
    render();
  }

  /* ---------------- navigation: home, a shelf, a card, a round. Phone back steps back inside the drill ---------------- */
  const stack = [{ name: 'home' }];
  let view = stack[0], lastScope = { all: true };
  function go(v) { try { history.pushState({ ddx: stack.length }, '', location.href); } catch { /* no history: in-page only */ } stack.push(v); view = v; render(); }
  function back() { if (stack.length > 1) history.back(); else goHome(); }
  function goHome() { view = stack[0]; render(); }
  function onPop() {
    if (!root.isConnected) { window.removeEventListener('popstate', onPop); return; }
    if (stack.length > 1) { stack.pop(); if (view.name === 'play') R = null; view = stack[stack.length - 1]; render(); }
  }
  window.addEventListener('popstate', onPop);
  function toTop() {
    const r = root.getBoundingClientRect();
    if (view.name === 'home') { if (r.top < 0) window.scrollTo(0, 0); return; }
    if (view.name === 'play' || r.top < 0) root.scrollIntoView({ block: 'start' });
  }

  /* ---------------- views ---------------- */
  const zhChip = () => (lang() === 'en' ? `<button class="zhchip" data-act="peek" aria-label="Show Chinese">中文</button>` : '');
  const sndBtn = () => `<button class="snd" data-act="snd" aria-pressed="${soundOn()}" aria-label="${soundOn() ? inl('Sound on. Tap to mute', '声音开着，点一下关掉') : inl('Sound off. Tap to turn on', '声音关着，点一下打开')}">${soundOn() ? I.snd : I.mute}</button>`;
  const stars = m => [0.34, 0.67, 0.95].map(th => `<span class="star ${m >= th ? 'on' : ''}">${I.star}</span>`).join('');
  const meter = pct => `<span class="meter"><i style="width:${Math.max(pct ? 3 : 0, Math.round(pct))}%"></i></span>`;
  const head = title => `<header class="top"><button class="iconbtn" data-act="back" aria-label="${inl('Back', '返回')}">${I.back}</button><div class="top-t">${title}</div>${zhChip()}</header>`;
  const goBtn = (act, label, sub, extra = '') => `<button class="go" data-act="${act}"${extra}><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="arrow">${I.arrow}</span></button>`;
  const label = c => (c.label || []).length ? `<div class="label"><div class="lh"><span>${esc(String(nm(c.title)).toUpperCase())}</span><span>${esc(opts.tag || 'W' + wk)}</span></div>${c.label.map(x => `<div class="ll"><span class="lk">${T(x.k)}</span><span class="lv">${T(up(x.v))}</span></div>`).join('')}</div>` : '';
  const nameBlock = c => `<div class="dname">${esc(nm(c.title))}</div>${lang() !== 'zh' && c.title.zh ? `<div class="dzh">${esc(c.title.zh)}</div>` : ''}`;
  function render() {
    root.className = 'ddx lang-' + lang() + (view.name === 'play' ? ' playing' : '');
    if (view.name === 'play' && R) viewPlay();
    else if (view.name === 'play') viewHome();
    else if (view.name === 'shelf' && SH[view.id]) viewShelf(SH[view.id]);
    else if (view.name === 'card' && CARD[view.id]) viewCard(CARD[view.id]);
    else viewHome();
    toTop();
  }
  function shelfStats(sid) {
    const cs = shelfCards(sid), seen = cs.filter(c => st.seen[c.id]);
    return { n: cs.length, seen: seen.length, due: dueCards(cs).length };
  }

  function viewHome() {
    const st0 = curStreak(), due = dueCards(cards), fresh = cards.find(c => !st.seen[c.id]);
    const pile = due.slice(0, 3);
    if (pile.length < 3 && fresh && !pile.includes(fresh)) pile.push(fresh);
    for (const c of cards) { if (pile.length >= 3) break; if (!pile.includes(c)) pile.push(c); }
    const n = due.length, mast = cards.filter(isMastered).length;
    const title = ONE ? (mast === cards.length ? { en: `All ${cards.length} cards <em>mastered</em>.`, zh: `${cards.length} 张卡<em>全部学会</em>了。` }
        : !Object.keys(st.seen).length ? { en: 'Learn the whole weekend <em>today</em>.', zh: '<em>今天</em>就把这周学完。' }
        : { en: `${mast} of ${cards.length} <em>mastered</em>. Keep going.`, zh: `已掌握 <em>${mast}</em>/${cards.length}，继续。` })
      : SIM ? (n ? { en: `${NUM[n] || n} call${n > 1 ? 's' : ''} to run <em>again</em>.`, zh: `有 <em>${n}</em> 单要再跑一次。` }
        : fresh ? (Object.keys(st.seen).length ? { en: 'A new call is <em>waiting</em>.', zh: '有一单<em>新任务</em>在等你。' } : { en: 'Run the call. <em>Pass</em> the station.', zh: '跑一单，<em>过一站</em>。' })
        : { en: 'Every call run. Keep it <em>sharp</em>.', zh: '都跑过了，<em>保持手感</em>。' })
      : n ? { en: `${NUM[n] || n} card${n > 1 ? 's are' : ' is'} due <em>today</em>.`, zh: `今天有 <em>${n}</em> 张卡要复习。` }
      : fresh ? (Object.keys(st.seen).length ? { en: 'A new card is <em>waiting</em>.', zh: '有一张<em>新卡</em>在等你。' } : { en: 'Learn it by <em>playing</em>.', zh: '<em>边玩</em>边学。' })
        : { en: 'All caught up. Keep it <em>sharp</em>.', zh: '都复习完了，<em>保持手感</em>。' };
    const h1 = lang() === 'zh' ? title.zh : lang() === 'both' ? `${title.en}<span class="zh">${title.zh}</span>` : `${title.en}<span class="zh">${title.zh}</span>`;
    const slots = [
      { s: 'left:0;top:108px', fs: 124, mh: 150, mw: 42, tag: 'left:0;top:244px;max-width:52%', r: -12, tr: -4 },
      { s: 'left:31%;top:26px', fs: 146, mh: 176, mw: 40, tag: 'left:31%;top:182px', r: -4, tr: 3 },
      { s: 'right:0;top:14px', fs: 112, mh: 150, mw: 36, tag: 'right:0;top:136px;max-width:42%', r: 9, tr: 5 },
    ];
    const date = new Date().toLocaleDateString(lang() === 'zh' ? 'zh-CN' : 'en-CA', { weekday: 'long', month: 'short', day: 'numeric' });
    const learned = Object.keys(st.seen).filter(id => CARD[id]).length;
    const topRight = ONE ? `<span class="streak" title="${inl('Mastered', '已掌握')}"><b></b>${mast} / ${cards.length}</span>` : `<span class="streak" title="${inl('Day streak', '连续天数')}"><b></b>${st0} ${inl(st0 === 1 ? 'day' : 'days', '天')}</span>`;
    const topLeft = ONE ? (mast === cards.length ? inl('Done for this weekend', '这周学完了') : inl(`About ${minsLeft()} min left`, `还剩约 ${minsLeft()} 分钟`)) : esc(date);
    root.innerHTML = `<header class="top home-top"><span class="date">${topLeft}</span>${topRight}${sndBtn()}</header>
      <main class="home">
      <p class="kick">${opts.kick ? inl(opts.kick.en, opts.kick.zh) : inl('Weekend', '周末') + ' ' + wk} · ${D.title ? esc(nm(D.title)) : inl('Play & learn', '边学边玩')}</p>
      <h1 class="h1">${h1}</h1>
      <div class="pile">${pile.map((c, i) => { const p = slots[i]; return stk(c, 'pstk', `position:absolute;${p.s};--fs:${p.fs}px;max-height:${p.mh}px;max-width:${p.mw}%;--r:${p.r}deg`)
        + `<span class="tag" style="${p.tag};--r:${p.tr}deg">${esc(nm(c.title))}</span>`; }).join('')}</div>
      ${SIM ? goBtn('start', inl('Take a call', '接一单'), inl('One whole call, about 5 minutes', '完整一单，大约 5 分钟')) : goBtn('start', inl(ONE && Object.keys(st.seen).length ? 'Next round' : 'Start a round', ONE && Object.keys(st.seen).length ? '下一轮' : '开始一轮'), ONE ? inl('10 questions a round, finish every card today', '每轮 10 题，今天学完全部卡') : inl('10 questions, about 3 minutes', '10 题，大约 3 分钟'))}
      <div class="shelves">${shelves.map(s => { const x = shelfStats(s.id); return `<button class="shelf" data-shelf="${esc(s.id)}"><b>${shelfName(s)}</b>${x.due ? `<span class="due">${x.due}</span>` : '<span></span>'}<span class="cnt">${x.seen} / ${x.n}</span>${meter(x.n ? x.seen / x.n * 100 : 0)}</button>`; }).join('')}</div>
      <p class="foot">${T(SIM ? { en: `${learned} of ${cards.length} calls run. Start at 100%, every mistake deducts like the real station, an automatic fail ends it, 70% passes. Answers follow the EMALB exam guidelines and grading criteria; every step names its source.`,
        zh: `已跑 ${learned}/${cards.length} 单。和真考站一样 100% 起步、做错就扣、直接挂科项就挂、70% 及格。答案以 EMALB 考纲和评分标准为准，每一步都注明出处。` } : ONE ? { en: `${learned} of ${cards.length} cards learned, ${mast} mastered. Each card: three short screens, questions straight away, then again a round later; two clean rounds and it is mastered. Misses come back next round, so you can finish it all in one day. Answers follow the EMALB exam guidelines; where EMALB is silent, BCEHS, and every answer names its source.`,
        zh: `已学 ${learned}/${cards.length} 张，已掌握 ${mast} 张。每张卡：先 3 屏短讲，马上考，隔一轮再考；两轮都答对就算掌握。错的下一轮再来，不用等明天，一天就能学完。答案以 EMALB 考纲为准；考纲没写的按 BCEHS，每题都注明出处。` } : { en: `${learned} of ${cards.length} cards learned. Answers follow the EMALB exam guidelines; where EMALB is silent, BCEHS, and every answer names its source. A study aid: on the road the current BCEHS guideline and CliniCall decide.`,
        zh: `已学 ${learned}/${cards.length} 张卡。答案以 EMALB 考纲为准；考纲没写的按 BCEHS，每题都注明出处。这是学习工具，出车以现行 BCEHS 指南和 CliniCall 为准。` })}</p>
      </main>`;
  }

  function viewShelf(s) {
    const cs = shelfCards(s.id), x = shelfStats(s.id);
    root.innerHTML = head(shelfName(s)) + `<main class="deckpage">${s.sub ? `<p class="deck-sub">${T(s.sub)}</p>` : ''}
      ${goBtn('startshelf', SIM ? inl('Take a call from this shelf', '从这一格接一单') : inl('Practice this shelf', '练这一格'), inl(`${x.seen} of ${x.n} learned`, `已学 ${x.seen}/${x.n}`) + (x.due ? ' · ' + inl(`${x.due} due`, `${x.due} 张待复习`) : ''), ` data-shelf="${esc(s.id)}"`)}
      <div class="book">${cs.map(c => { const seen = st.seen[c.id];
        return `<button class="slot ${seen ? '' : 'unseen'}" data-card="${esc(c.id)}"><span class="slot-img">${stk(c, 'sstk')}</span><span class="slot-name">${esc(nm(c.title))}</span><span class="slot-stars">${seen ? (SIM ? simBest(c) : stars(mastery(c))) : `<em>${inl('new', '未学')}</em>`}</span></button>`; }).join('')}</div></main>`;
  }

  const simBest = c => { const r = crec(c); return r && r.n ? `<em class="simbest ${r.best >= PASS ? 'ok' : 'no'}">${inl('best', '最好')} ${r.best}%</em>` : `<em>${inl('not finished', '没跑完')}</em>`; };
  const debrief = c => (c.learn || []).length ? `<p class="debrief-h">${inl('Debrief', '复盘')}</p>` + c.learn.map((l, i) => `<section class="lrn"><span class="ln">${i + 1}</span><div><b>${T(l.big)}</b><p>${T(l.say)}</p></div></section>`).join('') : '';
  function viewSimCard(c) {
    const s = SH[c.shelf], ran = !!(crec(c) && crec(c).n);
    root.innerHTML = head(shelfName(s)) + `<main class="cardpage">
      <div class="cardhero">${stk(c, 'big')}</div>${nameBlock(c)}
      ${c.hook ? `<p class="hook">${T(c.hook)}</p>` : ''}
      ${c.dispatch ? `<div class="bubble"><b class="disp">${inl('Dispatch', '调度')}</b> ${T(c.dispatch)}</div>` : ''}
      ${label(c)}
      ${ran ? debrief(c) : `<p class="muted">${inl('The debrief opens after your first run.', '跑完第一次才看得到复盘。')}</p>`}
      <div class="stick">${goBtn('startcard', ran ? inl('Run it again', '再跑一次') : inl('Run this call', '跑这一单'), '', ` data-card="${esc(c.id)}"`)}</div></main>`;
  }
  function viewCard(c) {
    if (SIM) return viewSimCard(c);
    const s = SH[c.shelf];
    root.innerHTML = head(shelfName(s)) + `<main class="cardpage">
      <div class="cardhero">${stk(c, 'big')}</div>${nameBlock(c)}
      ${c.hook ? `<p class="hook">${T(c.hook)}</p>` : ''}
      ${(c.learn || []).map((l, i) => `<section class="lrn"><span class="ln">${i + 1}</span><div><b>${T(l.big)}</b><p>${T(l.say)}</p></div></section>`).join('')}
      ${label(c)}
      <div class="stick">${goBtn('startcard', inl('Practice this one', '就练这张'), '', ` data-card="${esc(c.id)}"`)}</div></main>`;
  }

  /* ---------------- play ---------------- */
  const segs = () => {
    const n = R.steps.length;
    if (n > 18) return `<div class="segs cont">${meter(R.i / n * 100)}</div>`;
    return `<div class="segs">${R.steps.map((s, i) => `<i class="${i < R.i ? 'on' : i === R.i ? 'now' : ''}"></i>`).join('')}</div>`;
  };
  const playTop = () => `<div class="bar"><button class="x" data-act="quit" aria-label="${inl('Close', '关闭')}">${I.cross}</button>${segs()}<span class="combo">${comboTxt()}</span>${sndBtn()}</div>`;
  const comboTxt = () => R.sim ? `<span class="simscore ${R.sim.fail ? 'no' : ''}">${R.sim.fail ? 'FAIL' : R.sim.score + '%'}</span>` : R.combo >= 2 ? '×' + R.combo : '';
  function viewPlay() {
    root.classList.remove('peek');
    if (R.i >= R.steps.length) return viewDone();
    const step = R.steps[R.i];
    if (step.t === 'learn') return viewLearn(step);
    if (step.t === 'brief') return viewBrief(step);
    const it = step.item, c = it.card, q = step.q || (step.q = build(it));
    if (!q) { R.i++; return viewPlay(); }
    const call = isCall(it);
    let h = playTop() + `<div class="stage">
      <div class="qhd">${call || SIM ? '<i class="dot"></i>' : ''}<span class="qwhat">${SIM ? (it.d.phase ? esc(nm(it.d.phase)) : esc(nm(c.title))) + (it.d.fail ? ` <span class="afl">${inl('auto-fail item', '挂科项')}</span>` : '') : call ? inl('Call', '出车') + ' · ' + shelfName(SH[c.shelf]) : esc(nm(c.title))}</span>${step.retry ? `<span class="again">${inl('again', '再来')}</span>` : ''}<span class="sp"></span>${zhChip()}</div>`;
    if (q.stem) h += `<div class="bubble">${T(q.stem)}</div>`;
    if (q.quote) h += `<div class="quote">${T(q.quote)}</div>`;
    if (q.ui === 'two') {
      h += `<div class="herostk">${stk(c, q.mode === 'tf' ? 'mid' : 'hero')}<span class="stamp" hidden></span></div><div class="ask center">${T(q.ask)}</div>
        <div class="two"><button class="give" data-two="1">${T(q.yes)}</button><button class="hold" data-two="0">${T(q.no)}</button></div>`;
    } else {
      h += `<div class="askrow"><div class="ask">${T(q.ask)}</div>${stk(c, 'mini')}</div>`;
      if (q.ui === 'opts') h += `<div class="opts">${q.opts.map((o, i) => `<button class="opt" data-ans="${i}">${T(o.t)}</button>`).join('')}</div>`;
      if (q.ui === 'chips') h += `<p class="ohint">${inl('Tap every one that applies.', '点出所有符合的。')}</p><div class="chips">${q.chips.map((o, i) => `<button class="chip" data-chip="${i}">${T(o.t)}</button>`).join('')}</div><div id="chk"><button class="nextbtn wide" data-act="check" disabled>${inl('Check', '检查')}</button></div>`;
      if (q.ui === 'order') h += `<p class="ohint">${inl('Tap the steps in order. Tap again to undo.', '按顺序点。再点一次可以撤销。')}</p><div class="ord">${q.perm.map((si, j) => `<button class="ostep" data-ord="${j}"><span class="onum"></span><span class="otx">${T(q.steps[si])}</span></button>`).join('')}</div><div id="chk"><button class="nextbtn wide" data-act="ocheck" disabled>${inl('Check', '检查')}</button></div>`;
    }
    root.innerHTML = h + `<div id="sheet"></div></div>`;
  }
  function answered(ok, detail) {
    const step = R.steps[R.i], it = step.item, q = step.q, c = it.card;
    $('.stage').classList.add('locked');
    let ded = '';
    if (R.sim && !ok) { const w = it.d.fail ? 100 : Math.max(0, +it.d.w || 0); R.sim.score = Math.max(0, R.sim.score - w); if (it.d.fail) R.sim.fail = true; R.sim.lost.push({ it, w, fail: !!it.d.fail });
      ded = `<span class="ded ${it.d.fail ? 'af' : ''}">${it.d.fail ? inl('AUTOMATIC FAIL', '直接挂科') : '−' + w + '%'}</span>`; }
    if (!step.retry) { grade(it, ok); R.first++; if (ok) R.right++; }
    if (ok) { R.combo++; R.best = Math.max(R.best, R.combo); } else { R.combo = 0; if (!step.retry && !R.sim) R.steps.push({ t: 'q', item: it, retry: true }); }
    if (!ok) { try { navigator.vibrate && navigator.vibrate(70); } catch { /* no haptics */ } }
    sfx(ok ? 'ok' : R.sim && it.d.fail ? 'fail' : 'no', R.combo);
    const cb = $('.combo'); if (cb) cb.innerHTML = comboTxt();
    const sg = $('.segs'); if (sg && !sg.classList.contains('cont') && sg.children.length < R.steps.length) sg.insertAdjacentHTML('beforeend', '<i></i>');
    if (q.mode === 'do') { const s = $('.stamp'); if (s) { s.textContent = nm(q.a ? q.yes : q.no).toUpperCase(); s.className = 'stamp ' + (q.a ? 'g' : 'h'); s.hidden = false; } }
    const p = pick([['Right call.', '判断对了。'], ['Exactly.', '没错。'], ['Nailed it.', '漂亮。'], ['Yes.', '对。']]);
    const chk = $('#chk'); if (chk) chk.remove();
    $('#sheet').innerHTML = `<div class="sheet ${ok ? 'ok' : 'no'}"><div class="verdict"><b>${ok ? I.check : I.cross}</b>${ok ? inl(p[0], p[1]) : inl('Not quite.', '不对。')}${ded}</div>
      ${!ok && q.bad ? `<p class="conseq">${T(q.bad)}</p>` : ''}${!ok && detail ? `<div class="ans">${detail}</div>` : ''}
      ${q.why ? `<p class="why">${T(q.why)}</p>` : ''}${!ok ? label(c) : ''}${q.src ? `<p class="src">${esc(q.src)}</p>` : ''}
      <div class="next">${zhChip()}<span class="sp"></span><button class="nextbtn" data-act="next">${inl('Continue', '继续')} ${I.arrow}</button></div></div>`;
    const sh = $('.sheet'); if (sh && sh.scrollIntoView) sh.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
  function learnBody(c, p) { // three short screens; the card page and the questions carry the rest
    const l = (c.learn || [])[p] || {};
    const teach = `<div class="lbig">${T(l.big)}</div><p class="lsay">${T(l.say)}</p>`;
    if (p === 0) return `<div class="cardhero">${stk(c, 'big')}</div>${nameBlock(c)}${c.hook ? `<p class="tagline">${T(c.hook)}</p>` : ''}${teach}`;
    const nm2 = `<div class="learnname">${stk(c, 'mini')}<b>${esc(nm(c.title))}</b></div>`;
    return nm2 + teach + (p === 2 ? label(c) : '');
  }
  function viewLearn(step) {
    const c = step.card, p = step.p || 0;
    root.innerHTML = playTop() + `<div class="stage learn">
      <div class="qhd"><span class="newtag">${inl('New card', '新卡')}</span><span class="qwhat">${shelfName(SH[c.shelf])}</span><span class="sp"></span>${zhChip()}</div>
      ${learnBody(c, p)}
      <div class="dots">${[0, 1, 2].map(i => `<i class="${i === p ? 'on' : ''}"></i>`).join('')}</div>
      <div class="stick">${goBtn('learnnext', p < 2 ? inl('Next', '下一页') : inl('Got it. Quiz me', '记住了，考我'))}</div></div>`;
  }
  function viewBrief(step) {
    const c = step.card;
    root.innerHTML = playTop() + `<div class="stage learn">
      <div class="qhd"><i class="dot"></i><span class="qwhat">${inl('Dispatch', '调度')} · ${shelfName(SH[c.shelf])}</span><span class="sp"></span>${zhChip()}</div>
      <div class="cardhero">${stk(c, 'big')}</div>${nameBlock(c)}
      ${c.dispatch ? `<div class="bubble">${T(c.dispatch)}</div>` : ''}${label(c)}
      <p class="ohint">${inl(`${R.steps.length - 1} decisions. You start at 100%; 70% passes.`, `${R.steps.length - 1} 个决定。100% 起步，70% 及格。`)}</p>
      <div class="stick">${goBtn('respond', inl('Respond', '出发'))}</div></div>`;
  }
  function viewSimDone() {
    const c = R.cards[0], m = R.sim, pass = !m.fail && m.score >= PASS;
    const txt = o => { const x = nm(o.d.ask || o.d.stem || o.d.s || ''); return x.length > 110 ? x.slice(0, 104).replace(/\s+\S*$/, '') + ' …' : x; };
    root.innerHTML = `<main class="done simdone">
      <div class="herostk">${stk(c, 'hero')}<span class="stamp ${pass ? 'g' : 'h'}">${pass ? inl('PASS', '通过') : inl('FAIL', '未过')}</span></div>
      <div class="score">${m.fail ? 0 : m.score}<small>%</small></div>
      <h2 class="h2">${m.fail ? inl('On exam day that is an automatic fail.', '真考时这一下就直接挂了。') : pass ? (m.score >= 90 ? inl('Clean run.', '跑得很干净。') : inl('Passed. Tighten the misses.', '过了，把错的补上。')) : inl('Below 70%. Run it again.', '不到 70%，再跑一次。')}</h2>
      ${m.lost.length ? `<div class="lost">${m.lost.map(x => `<div><span class="lw ${x.fail ? 'af' : ''}">${x.fail ? 'FAIL' : '−' + x.w + '%'}</span><span class="lt">${x.it.d.phase ? `<b>${esc(nm(x.it.d.phase))}</b> · ` : ''}${esc(txt(x.it))}</span></div>`).join('')}</div>` : `<p class="muted">${inl('No deductions.', '没有扣分。')}</p>`}
      ${debrief(c)}
      ${goBtn('again', R.scope.card ? inl('Run it again', '再跑一次') : inl('Next call', '下一单'))}
      <button class="ghostbtn" data-act="back">${inl('Done for now', '先到这儿')}</button></main>`;
    sfx(!pass ? 'fail' : m.score >= 90 ? 'today' : 'round');
    if (pass && m.score >= 90) confetti();
    lastScope = R.scope; R = null;
  }
  function viewDone() {
    if (R.sim) return viewSimDone();
    const acc = R.first ? Math.round(R.right / R.first * 100) : 0, s0 = curStreak();
    const backIn = c => { const r = crec(c); if (!r) return ''; if (ONE) return r.b >= GOAL ? inl('mastered', '已掌握') : inl('next round', '下一轮再练'); const d = r.due - today(); return d <= 0 ? inl('again today', '今天再练') : d === 1 ? inl('back tomorrow', '明天再见') : inl(`back in ${d} days`, `${d} 天后再见`); };
    const fan = R.cards.slice(0, 5);
    const msg = acc >= 90 ? ['Sharp.', '很稳。'] : acc >= 70 ? ['Solid round.', '这轮不错。'] : ['The misses come back first.', '错的下次先考。'];
    // today done: the one-day weekend just got its last card mastered; a day deck reached today's 10 questions or cleared what was due
    const allNow = cards.every(isMastered), cleared = R.dueAtStart > 0 && !dueCards(cards).length;
    const todayDone = ONE ? allNow && !R.allAtStart : R.dayDone || cleared;
    const todayLine = !todayDone ? '' : `<p class="todaydone">${I.check}${ONE ? inl(`Weekend done: all ${cards.length} cards mastered today.`, `这周学完了：${cards.length} 张卡今天全部掌握。`)
      : R.dayDone ? inl(`Today's practice done. ${s0}-day streak.`, `今天的练习完成了，连续 ${s0} 天。`) : inl('Everything due today is done.', '今天要复习的都做完了。')}</p>`;
    root.innerHTML = `<main class="done">
      <div class="fan">${fan.map((c, i) => stk(c, 'fanstk', `--r:${(i - (fan.length - 1) / 2) * 9}deg;z-index:${10 - Math.abs(i - 2)};animation-delay:${i * 0.06}s`)).join('')}</div>
      <div class="score">${acc}<small>%</small></div><h2 class="h2">${inl(msg[0], msg[1])}</h2><p class="muted">${inl('That is how it sticks.', '就是这样记住的。')}</p>${todayLine}
      <div class="stats"><div><b>${R.right}/${R.first}</b><span>${inl('first try', '一次答对')}</span></div><div><b>×${R.best}</b><span>${inl('best combo', '最长连对')}</span></div>${ONE ? `<div><b>${cards.filter(isMastered).length}/${cards.length}</b><span>${inl('mastered', '已掌握')}</span></div>` : `<div><b>${s0}</b><span>${inl('day streak', '天连续')}</span></div>`}</div>
      ${R.cards.length ? `<div class="gain">${R.cards.map(c => `<div>${stk(c, 'thumb')}<span class="gname">${esc(nm(c.title))}${R.learned.includes(c) ? ` <em>${inl('new', '新')}</em>` : ''}</span><span class="gstars">${stars(mastery(c))}</span><span class="gback">${backIn(c)}</span></div>`).join('')}</div>` : ''}
      ${ONE && allNow && !todayDone ? `<p class="muted">${inl('Every card mastered. Extra rounds are pure practice.', '全部卡都掌握了，再练就是巩固。')}</p>` : ''}
      ${goBtn('again', ONE ? inl('Next round', '下一轮') : inl('One more round', '再来一轮'), ONE ? inl(`About ${minsLeft()} min left`, `还剩约 ${minsLeft()} 分钟`) : '')}
      <button class="ghostbtn" data-act="back">${inl('Done for now', '先到这儿')}</button></main>`;
    sfx(todayDone ? 'today' : 'round');
    if (acc >= 80 || todayDone) confetti();
    lastScope = R.scope; R = null;
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'ddx-confetti';
    const cols = ['#DCEB3F', '#0E6A44', '#15181B', '#DCEB3F', '#C8402B'];
    for (let i = 0; i < 36; i++) { const s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = cols[i % 5]; s.style.animationDuration = 1.4 + Math.random() * 1.6 + 's'; s.style.animationDelay = Math.random() * 0.4 + 's'; box.appendChild(s); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
  }

  /* ---------------- events ---------------- */
  function startFrom(scope) { lastScope = scope; if (view.name !== 'play') go({ name: 'play' }); startRound(scope); }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.ans !== undefined) {
      const q = R.steps[R.i].q, i = +b.dataset.ans, ok = q.opts[i].ok;
      $$('.opt').forEach((el, j) => el.classList.add(q.opts[j].ok ? 'right' : j === i ? 'wrong' : 'dim'));
      return answered(ok);
    }
    if (b.dataset.two !== undefined) {
      const q = R.steps[R.i].q, v = b.dataset.two === '1', ok = v === q.a;
      $$('.two button').forEach(el => el.classList.add(el === b ? 'picked' : 'dim'));
      const right = q.mode === 'do' ? inl(`Right call: ${nm(q.a ? q.yes : q.no)}.`, `正确做法：${(q.a ? q.yes : q.no).zh || nm(q.a ? q.yes : q.no)}。`)
        : (q.a ? inl('It is true.', '这句是对的。') : inl('It is false.', '这句是错的。'));
      return answered(ok, right);
    }
    if (b.dataset.chip !== undefined) { b.classList.toggle('sel'); $('#chk button').disabled = !$('.chip.sel'); return; }
    if (b.dataset.ord !== undefined) {
      const q = R.steps[R.i].q, j = +b.dataset.ord, at = q.seq.indexOf(j);
      if (at >= 0) q.seq.splice(at); else q.seq.push(j);
      $$('.ostep').forEach((el, k) => { const pos = q.seq.indexOf(k); el.classList.toggle('sel', pos >= 0); el.querySelector('.onum').textContent = pos >= 0 ? pos + 1 : ''; });
      $('#chk button').disabled = q.seq.length !== q.perm.length; return;
    }
    if (b.dataset.shelf !== undefined && !b.dataset.act) return go({ name: 'shelf', id: b.dataset.shelf });
    if (b.dataset.card !== undefined && !b.dataset.act) return go({ name: 'card', id: b.dataset.card });
    switch (b.dataset.act) {
      case 'peek': root.classList.toggle('peek'); return;
      case 'snd': {
        const on = !soundOn();
        try { localStorage.setItem(SND, on ? '1' : '0'); } catch { /* storage blocked: stays on */ }
        $$('.snd').forEach(el => { el.outerHTML = sndBtn(); });
        if (on) sfx('ok');
        return;
      }
      case 'back': return back();
      case 'start': return startFrom({ all: true });
      case 'startshelf': return startFrom({ shelf: b.dataset.shelf });
      case 'startcard': return startFrom({ card: b.dataset.card });
      case 'again': return startRound(lastScope);
      case 'quit': R = null; return back();
      case 'next': R.i++; render(); return;
      case 'respond': {
        const c = R.steps[R.i].card;
        if (!st.seen[c.id]) { st.seen[c.id] = today(); R.learned.push(c); save(); }
        R.i++; render(); return;
      }
      case 'learnnext': {
        const step = R.steps[R.i];
        if ((step.p || 0) < 2) { step.p = (step.p || 0) + 1; render(); return; }
        if (!st.seen[step.card.id]) { st.seen[step.card.id] = today(); R.learned.push(step.card); save(); }
        R.i++; render(); return;
      }
      case 'check': {
        const q = R.steps[R.i].q; let ok = true;
        $$('.chip').forEach((el, j) => {
          const sel = el.classList.contains('sel'), real = q.chips[j].ok;
          if (sel !== real) ok = false;
          el.classList.remove('sel'); el.classList.add(real ? (sel ? 'right' : 'missed') : (sel ? 'wrong' : 'dim'));
        });
        return answered(ok, inl('The green ones are the right ones.', '绿色的才是对的。'));
      }
      case 'ocheck': {
        const q = R.steps[R.i].q, ok = q.seq.every((j, pos) => q.perm[j] === pos);
        $$('.ostep').forEach((el, k) => { const pos = q.seq.indexOf(k), good = q.perm[k] === pos; el.classList.remove('sel'); el.classList.add(good ? 'right' : 'wrong'); el.querySelector('.onum').textContent = q.perm[k] + 1; });
        return answered(ok, `<span>${inl('The right order:', '正确顺序：')}</span><ol class="ordans">${q.steps.map(s => `<li>${T(s)}</li>`).join('')}</ol>`);
      }
    }
  });

  render();
}
