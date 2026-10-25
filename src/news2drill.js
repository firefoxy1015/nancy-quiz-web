// NEWS2 trainer: scoring practice on the published NEWS2 chart (the one BCEHS A02 uses).
// Row drill = one value at a time; patient drill = a full set of vitals, every row, then the response level.
// Values are drawn band by band, and often right on a border number, because borders are where scores go wrong.
// Progress (streaks, misses per row) stays on this device through the store the caller passes in.
import { t, esc } from './app.js?v=45';

const INF = Infinity;
// bands: [low, high, points]; gen: the range to draw from when a band is open-ended
const ROWS = {
  rr:   { en: 'Resp. rate', zh: '呼吸频率', unit: '/min', step: 1, gen: [5, 38],
          bands: [[-INF, 8, 3], [9, 11, 1], [12, 20, 0], [21, 24, 2], [25, INF, 3]] },
  sp1:  { en: 'SpO₂ (Scale 1)', zh: '血氧（Scale 1）', unit: '%', step: 1, gen: [82, 100],
          bands: [[-INF, 91, 3], [92, 93, 2], [94, 95, 1], [96, 100, 0]] },
  sbp:  { en: 'Systolic BP', zh: '收缩压', unit: 'mmHg', step: 1, gen: [68, 245], zeroGen: [111, 175],
          bands: [[-INF, 90, 3], [91, 100, 2], [101, 110, 1], [111, 219, 0], [220, INF, 3]] },
  hr:   { en: 'Pulse', zh: '心率', unit: '/min', step: 1, gen: [32, 165],
          bands: [[-INF, 40, 3], [41, 50, 1], [51, 90, 0], [91, 110, 1], [111, 130, 2], [131, INF, 3]] },
  temp: { en: 'Temperature', zh: '体温', unit: '°C', step: 0.1, gen: [33.5, 40.8],
          bands: [[-INF, 35.0, 3], [35.1, 36.0, 1], [36.1, 38.0, 0], [38.1, 39.0, 1], [39.1, INF, 2]] },
};
// Scale 2 (diagnosed COPD): 88–92 = 0; at 93 or more it scores only while on oxygen
const SP2 = [[-INF, 83, 3], [84, 85, 2], [86, 87, 1], [88, 92, 0], [93, 94, 1], [95, 96, 2], [97, 100, 3]];
const sp2Points = (v, o2) => v >= 93 && !o2 ? 0 : SP2.find(b => v >= b[0] && v <= b[1])[2];
const ACVPU = [['A', 'Alert', '清醒'], ['C', 'New confusion', '新发意识混乱'], ['V', 'Responds to voice', '对声音有反应'], ['P', 'Responds to pain', '对疼痛有反应'], ['U', 'Unresponsive', '无反应']];
const O2 = [['2 L/min nasal cannula', '鼻导管 2 L/min'], ['4 L/min nasal cannula', '鼻导管 4 L/min'], ['6 L/min simple mask', '普通面罩 6 L/min'], ['15 L/min non-rebreather', '非重复呼吸面罩 15 L/min']];

const rnd = n => Math.floor(Math.random() * n);
const pick = xs => xs[rnd(xs.length)];
const fmt = (v, step) => step < 1 ? v.toFixed(1) : String(v);
const bandLabel = (b, step) => b[0] === -INF ? `≤ ${fmt(b[1], step)}` : b[1] === INF ? `≥ ${fmt(b[0], step)}` : `${fmt(b[0], step)}–${fmt(b[1], step)}`;
const pointsOf = (row, v) => ROWS[row].bands.find(b => v >= b[0] - 1e-9 && v <= b[1] + 1e-9)[2];

// a value from one band: 45% exactly on a border number, otherwise anywhere inside
function drawFrom(lo, hi, step, gen) {
  lo = lo === -INF ? gen[0] : lo; hi = hi === INF ? gen[1] : hi;
  const n = Math.round((hi - lo) / step);
  const k = Math.random() < 0.45 ? (Math.random() < 0.5 ? 0 : n) : rnd(n + 1);
  return Math.round((lo + k * step) / step) * step;
}
function drawRow(row, zeroBias) {
  const R = ROWS[row], zi = R.bands.findIndex(b => b[2] === 0);
  const bi = Math.random() < zeroBias ? zi : rnd(R.bands.length);
  const b = R.bands[bi];
  if (bi === zi && R.zeroGen && Math.random() < 0.6) return drawFrom(...R.zeroGen, R.step, R.gen);
  return drawFrom(b[0], b[1], R.step, R.gen);
}
function drawSp2(o2) {
  const b = pick(o2 ? SP2 : SP2.slice(0, 4).concat([[93, 100, 0]]));
  return drawFrom(b[0], b[1], 1, [78, 100]);
}

// the colour strip for a row with the right band outlined
function strip(bands, step, hit) {
  const col = ['b-green', 'b-amber', 'b-orange', 'b-red'];
  return `<div class="v-scale">${bands.map((b, k) => `<div class="${col[b[2]]}${k === hit ? ' n2-hit' : ''}">${bandLabel(b, step)}<br>${b[2]}</div>`).join('')}</div>`;
}
function stripFor(item) {
  if (item.row === 'acvpu') return `<div class="v-scale">${ACVPU.map(a => `<div class="${a[0] === 'A' ? 'b-green' : 'b-red'}${a[0] === item.v ? ' n2-hit' : ''}">${a[0]}<br>${a[0] === 'A' ? 0 : 3}</div>`).join('')}</div>`;
  if (item.row === 'o2') return `<div class="v-scale"><div class="b-green${item.v ? '' : ' n2-hit'}">${t('Air', '空气')}<br>0</div><div class="b-orange${item.v ? ' n2-hit' : ''}">${t('Oxygen', '吸氧')}<br>2</div></div>`;
  if (item.row === 'sp2') {
    const bands = item.o2 ? SP2 : SP2.slice(0, 4).concat([[93, INF, 0]]);
    return strip(bands, 1, bands.findIndex(b => item.v >= b[0] && item.v <= b[1]));
  }
  const R = ROWS[item.row];
  return strip(R.bands, R.step, R.bands.findIndex(b => item.v >= b[0] - 1e-9 && item.v <= b[1] + 1e-9));
}
const HOOK = {
  rr: ['Slow: 1 then 3 · fast: 2 then 3', '慢：1 再 3 · 快：2 再 3'],
  sp1: ['96 is the line; every 2% below adds a point', '96 是线，每低 2% 加 1 分'],
  sp2: ['Scale 2: 88–92 = 0; at 93+ it scores only on oxygen', 'Scale 2：88–92 为 0；93 以上只有吸氧时才计分'],
  o2: ['Any oxygen = 2', '只要吸氧就 2 分'],
  sbp: ['111 is the line; every 10 below adds a point; ≥ 220 = 3', '111 是线，往下每 10 加 1 分；≥220 为 3'],
  hr: ['Fast steps at 91, 111, 131 · slow: 41–50 = 1, ≤ 40 = 3', '快：91、111、131 各升一级 · 慢：41–50 一分，≤40 三分'],
  acvpu: ['Anything but Alert = 3', '只要不是 Alert 就 3 分'],
  temp: ['Fever stops at 2 · cold reaches 3 at 35.0', '发烧最高 2 分 · ≤35.0 为 3 分'],
};

// one row of a patient (or a row drill item): {row, v, o2?, label, value text, points}
function item(row, v, o2) {
  if (row === 'acvpu') { const a = ACVPU.find(x => x[0] === v); return { row, v, label: t('Consciousness', '意识'), text: t(a[1], a[2]), pts: v === 'A' ? 0 : 3 }; }
  if (row === 'o2') return { row, v, label: t('Air or oxygen', '空气或吸氧'), text: v ? t(v[0], v[1]) : t('Room air', '室内空气'), pts: v ? 2 : 0 };
  if (row === 'sp2') return { row, v, o2, label: t('SpO₂ (Scale 2, COPD)', '血氧（Scale 2，COPD）'), text: `${v}%${o2 ? t(' on oxygen', '（吸氧）') : t(' on air', '（空气）')}`, pts: sp2Points(v, o2) };
  const R = ROWS[row];
  return { row, v, label: t(R.en, R.zh), text: `${fmt(v, R.step)} ${R.unit}`, pts: pointsOf(row, v) };
}
function patient() {
  const copd = Math.random() < 0.2, o2 = Math.random() < (copd ? 0.6 : 0.35) ? pick(O2.slice(0, copd ? 2 : 4)) : null;
  const r = Math.random(), acvpu = r < 0.72 ? 'A' : r < 0.84 ? 'C' : r < 0.92 ? 'V' : r < 0.97 ? 'P' : 'U';
  const age = copd ? 55 + rnd(35) : 18 + rnd(75);
  return {
    copd, age,
    rows: [item('rr', drawRow('rr', 0.45)), copd ? item('sp2', drawSp2(!!o2), !!o2) : item('sp1', drawRow('sp1', 0.5)), item('o2', o2),
      item('sbp', drawRow('sbp', 0.5)), item('hr', drawRow('hr', 0.45)), item('acvpu', acvpu), item('temp', drawRow('temp', 0.5))],
  };
}
const LEVELS = [['low', 'Low (0–4)', '低危（0–4）', 'routine monitoring', '常规监测'],
  ['medium', 'Medium (5–6, or any single 3)', '中危（5–6，或单项 3 分）', 'urgent response', '紧急响应'],
  ['high', 'High (7+)', '高危（≥7）', 'emergency response', '急救响应']];
const levelOf = rows => { const tot = rows.reduce((s, x) => s + x.pts, 0); return tot >= 7 ? 'high' : tot >= 5 || rows.some(x => x.pts === 3) ? 'medium' : 'low'; };

export function news2Drill(host, store) {
  const st = store.get('n2', { mode: 'row', row: { n: 0, r: 0, streak: 0 }, pat: { n: 0, r: 0, streak: 0, best: 0 }, miss: {} });
  const saveSt = () => store.set('n2', st);
  host.classList.add('cls-visual', 'n2');

  function shell(inner) {
    host.innerHTML = `<div class="n2-tabs"><button class="btn ghost tiny${st.mode === 'row' ? ' on' : ''}" data-m="row">${t('Row drill', '单项练习')}</button>
      <button class="btn ghost tiny${st.mode === 'pat' ? ' on' : ''}" data-m="pat">${t('Patient drill', '整个病人')}</button>
      <span class="tiny muted n2-score">${st.mode === 'row' ? `${t('streak', '连对')} ${st.row.streak} · ${st.row.r}/${st.row.n}` : `${t('streak', '连对')} ${st.pat.streak} · ${t('best', '最好')} ${st.pat.best} · ${st.pat.r}/${st.pat.n}`}</span></div>${inner}`;
    host.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { st.mode = b.dataset.m; saveSt(); next(); });
  }
  const ptsBtns = (name, pick) => `<div class="n2-pts">${[0, 1, 2, 3].map(p => `<button class="n2-p${pick === p ? ' sel' : ''}" data-r="${name}" data-p="${p}">${p}</button>`).join('')}</div>`;

  /* ---- row drill: rows you miss come back more often ---- */
  function rowItem() {
    const names = ['rr', 'sp1', 'o2', 'sbp', 'hr', 'acvpu', 'temp', 'sp2'];
    const w = names.map(n => (n === 'o2' || n === 'acvpu' ? 0.5 : 1) + Math.min(4, (st.miss[n] || 0)) * 0.75);
    let x = Math.random() * w.reduce((a, b) => a + b, 0), k = 0;
    while ((x -= w[k]) > 0) k++;
    const n = names[k];
    if (n === 'acvpu') return item('acvpu', pick(['A', 'A', 'C', 'V', 'P', 'U']));
    if (n === 'o2') return item('o2', Math.random() < 0.5 ? null : pick(O2));
    if (n === 'sp2') { const o2 = Math.random() < 0.6; return item('sp2', drawSp2(o2), o2); }
    return item(n, drawRow(n, 0.25));
  }
  function drawRowDrill() {
    const it = rowItem();
    shell(`<div class="n2-card"><div class="tiny muted">${esc(it.label)}</div><div class="n2-val">${esc(it.text)}</div>
      <div class="tiny muted">${t('How many points?', '几分？')}</div>${ptsBtns('x', null)}<div class="n2-fb"></div></div>`);
    host.querySelectorAll('.n2-p').forEach(b => b.onclick = () => {
      const p = +b.dataset.p, ok = p === it.pts;
      host.querySelectorAll('.n2-p').forEach(x => { x.disabled = true; if (+x.dataset.p === it.pts) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      st.row.n++; if (ok) { st.row.r++; st.row.streak++; st.miss[it.row] = Math.max(0, (st.miss[it.row] || 0) - 1); } else { st.row.streak = 0; st.miss[it.row] = (st.miss[it.row] || 0) + 1; }
      saveSt();
      const h = HOOK[it.row];
      host.querySelector('.n2-fb').innerHTML = `<p><b>${ok ? t('Right.', '对。') : t('Not quite:', '不对：')}</b> ${esc(it.text)} → <b>${it.pts}</b></p>${stripFor(it)}
        <p class="tiny">${esc(t(h[0], h[1]))}</p><div class="btn-row"><button class="btn" id="n2Next">${t('Next', '下一个')}</button></div>`;
      host.querySelector('#n2Next').onclick = next;
      if (ok) setTimeout(() => { if (host.querySelector('#n2Next')) next(); }, 1100);
    });
  }

  /* ---- patient drill ---- */
  function drawPatDrill() {
    const P = patient(), picks = {}, started = Date.now();
    let level = null;
    const vit = P.rows.map((x, k) => `<div class="n2-row" data-k="${k}"><div><b>${esc(x.label)}</b><br><span>${esc(x.text)}</span></div>${ptsBtns(k, null)}<div class="n2-why"></div></div>`).join('');
    shell(`<div class="n2-card"><div class="n2-pt"><b>${P.age} ${t('y', '岁')}</b>${P.copd ? ` · <span class="v-tag t-bc">${t('diagnosed COPD → Scale 2', '确诊 COPD → Scale 2')}</span>` : ''}</div>
      ${vit}
      <div class="n2-lv"><div class="tiny muted">${t('Response level', '响应级别')}</div>${LEVELS.map(l => `<button class="btn ghost tiny n2-l" data-l="${l[0]}">${t(l[1], l[2])}</button>`).join('')}</div>
      <div class="btn-row"><button class="btn" id="n2Check" disabled>${t('Check', '核对')}</button></div><div class="n2-fb"></div></div>`);
    const ready = () => { host.querySelector('#n2Check').disabled = !(Object.keys(picks).length === P.rows.length && level); };
    host.querySelectorAll('.n2-p').forEach(b => b.onclick = () => {
      picks[b.dataset.r] = +b.dataset.p;
      host.querySelectorAll(`.n2-p[data-r="${b.dataset.r}"]`).forEach(x => x.classList.toggle('sel', x === b));
      ready();
    });
    host.querySelectorAll('.n2-l').forEach(b => b.onclick = () => { level = b.dataset.l; host.querySelectorAll('.n2-l').forEach(x => x.classList.toggle('on', x === b)); ready(); });
    host.querySelector('#n2Check').onclick = () => {
      const secs = Math.round((Date.now() - started) / 1000);
      let wrong = 0;
      P.rows.forEach((x, k) => {
        const row = host.querySelector(`.n2-row[data-k="${k}"]`), ok = picks[k] === x.pts;
        row.querySelectorAll('.n2-p').forEach(b => { b.disabled = true; if (+b.dataset.p === x.pts) b.classList.add('right'); else if (+b.dataset.p === picks[k]) b.classList.add('wrong'); });
        if (!ok) { wrong++; st.miss[x.row] = (st.miss[x.row] || 0) + 1; const h = HOOK[x.row]; row.querySelector('.n2-why').innerHTML = stripFor(x) + `<p class="tiny">${esc(t(h[0], h[1]))}</p>`; }
      });
      const total = P.rows.reduce((s, x) => s + x.pts, 0), lv = levelOf(P.rows), red = P.rows.some(x => x.pts === 3);
      const lvOk = level === lv, allOk = !wrong && lvOk;
      host.querySelectorAll('.n2-l').forEach(b => { b.disabled = true; if (b.dataset.l === lv) b.classList.add('right'); else if (b.dataset.l === level) b.classList.add('wrong'); });
      st.pat.n++; if (allOk) { st.pat.r++; st.pat.streak++; st.pat.best = Math.max(st.pat.best, st.pat.streak); } else st.pat.streak = 0;
      saveSt();
      const L = LEVELS.find(l => l[0] === lv);
      host.querySelector('#n2Check').closest('.btn-row').remove();
      host.querySelector('.n2-fb').innerHTML = `<p><b>${allOk ? t('All right!', '全对！') : wrong ? `${wrong} ${t(wrong > 1 ? 'rows wrong' : 'row wrong', '行打错')}` : t('Rows right, level wrong.', '每行都对，响应级别错了。')}</b>
        ${t('Total', '总分')} <b>${P.rows.map(x => x.pts).join(' + ')} = ${total}</b>${red ? ` · ${t('red score (a single 3)', '有单项 3 分（红色分数）')}` : ''} → <b>${esc(t(L[1], L[2]))}</b>: ${esc(t(L[3], L[4]))}.
        <span class="tiny muted">${secs} s${secs > 60 ? t(' · goal: under a minute', ' · 目标：一分钟内') : ''}</span></p>
        ${st.pat.streak >= 10 ? `<p class="n2-goal">${t('10 in a row: you are ready for the lab.', '连续 10 个全对：可以上实操课了。')}</p>` : ''}
        <div class="btn-row"><button class="btn" id="n2Next">${t('Next patient', '下一个病人')}</button></div>`;
      host.querySelector('#n2Next').onclick = next;
    };
  }
  function next() { st.mode === 'pat' ? drawPatDrill() : drawRowDrill(); }
  next();
}
