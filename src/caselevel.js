// Case levels (出车关卡): one patient, one decision at a time. Built after the student said the course did not stick:
// she has to produce every answer herself (choose, select-all, put in order, type the number), a wrong answer shows what
// happens to the patient, and the teacher's one-line "why" is read aloud. Nothing is explained before she has acted.
// A level is a list of steps: scene | header | choose | multi | order | type | end. Scored steps remember whether the first
// try was right; the misses go to case:misses and come back as a warm-up at the start of the next run of that level.
// Narration clips are named <level.clip><key> (e.g. w03-lab-chestpain-asa) and reach the page through io.audio.
import { t, esc, bi } from './app.js?v=74';
import { make12, stripSVG, LAYOUT } from './ecgstrip.js?v=74';

const SCORED = new Set(['choose', 'multi', 'order', 'type']);
const rnd = n => Math.floor(Math.random() * n);
const shuffle = xs => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const tt = o => o == null ? '' : typeof o === 'string' ? esc(o) : t(esc(o.en), esc(o.zh));   // short label, one line
const bb = o => o == null ? '' : bi(o.en, o.zh);                                               // prose, two lines in both mode
const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, '').replace(/[,，]/g, '').replace(/(mg|ml|mmhg|min|mins|minutes|分钟|毫克|剂|次|%|次数)$/, '');
const matches = (q, v) => {
  if (q.accept && q.accept.some(a => new RegExp(a, 'i').test(String(v).trim()))) return true;
  const n = norm(v), num = parseFloat(n);
  if (typeof q.answer === 'number' && !isNaN(num)) return Math.abs(num - q.answer) <= (q.tol || 0);
  return n === norm(q.answer);
};
const tiles12 = (e, mk) => `<div class="ecg-l12">${LAYOUT.flat().map(L => { const ld = e.leads.find(x => x.id === L), st = e.pat.st[L] || 0, cls = mk && st >= 1 ? 'up' : mk && st <= -0.8 ? 'down' : '';
  return `<div class="tile ${cls}">${stripSVG(ld, { pxPerMm: 2.6, heightMm: 36, baseMm: 20, label: L, fit: true, overlays: mk && st ? [{ type: 'baseline' }, { type: 'j', n: 9 }] : [] })}${mk && st ? `<span class="st">${st > 0 ? '↑' : '↓'} ${Math.abs(st).toFixed(1)} mm</span>` : ''}</div>`; }).join('')}</div>`;
const VITALS = [['BP', 'BP'], ['HR', 'HR'], ['SpO2', 'SpO₂'], ['RR', 'RR'], ['Pain', 'Pain'], ['BGL', 'BGL'], ['Temp', 'Temp']];

export function caseLevel(host, store, L, io = {}) {
  const K = 'case:' + L.id;
  const scored = L.steps.filter(s => SCORED.has(s.kind));
  const misses = () => store.get('case:misses', []);
  const setMisses = m => store.set('case:misses', m.slice(-40));
  let st = store.get(K + ':state', null);
  if (!st || st.done || st.idx >= L.steps.length) st = { idx: 0, first: {}, tries: {}, warm: 0 };
  const save = () => store.set(K + ':state', st);
  // warm-up: the steps she missed last time, replayed before the story (only when starting from the top)
  let queue = L.steps;
  const withWarm = keys => [{ kind: 'header', text: { en: 'Before the call: the ones you missed last time.', zh: '出车前：上次没记住的几个，先过一遍。' }, warm: true },
    ...keys.map(k => ({ ...L.steps.find(s => s.key === k), warm: true })), ...L.steps];
  if (st.idx === 0) {            // starting from the top: pick up to four of last time's misses and remember them for a resume
    st.wk = misses().filter(m => m.level === L.id && L.steps.some(s => s.key === m.key)).map(m => m.key).slice(0, 4);
    if (st.wk.length) queue = withWarm(st.wk);
  } else if (st.wk && st.wk.length) queue = withWarm(st.wk);
  /* ---- the teacher's voice: one audio element; the line after each answer plays by itself unless she mutes it ---- */
  const au = new Audio(); let cur = null, voice = store.get('case:voice', true);
  // Phones refuse play() until the page has been tapped (iOS: until this very element has played inside a tap). So:
  // clips are decrypted ahead of time (ready), a tap on the button plays synchronously, the first tap anywhere plays a
  // silent clip to unlock the element, and a refused autoplay turns the button into "tap to hear" instead of failing.
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const ready = new Map(), fetching = new Map(); let pending = null, unlocked = false;
  const getURL = key => { if (ready.has(key)) return Promise.resolve(ready.get(key)); if (!fetching.has(key)) fetching.set(key, io.audio('audio/' + L.clip + key + '.mp3').then(u => { ready.set(key, u); return u; })); return fetching.get(key); };
  const btnOf = key => host.querySelector(`.case-teach .say[data-say="${key}"]`);
  const paintSay = () => host.querySelectorAll('.case-teach .say').forEach(b => { const on = cur && b.dataset.say === cur && !au.paused && au.src !== SILENT; b.classList.toggle('on', !!on); b.textContent = b.classList.contains('need') ? t('▶ Tap to hear', '▶ 点一下听') : on ? '❚❚' : '▶'; });
  const needTap = key => { pending = key; const b = btnOf(key); if (b) b.classList.add('need'); paintSay(); };
  const playNow = key => { au.src = ready.get(key); return au.play().then(() => { unlocked = true; if (pending === key) pending = null; const b = btnOf(key); if (b) b.classList.remove('need'); paintSay(); })
    .catch(e => { if (e && e.name === 'NotAllowedError') needTap(key); else cur = null; paintSay(); }); };
  async function play(key) {
    if (!io.audio) return;
    if (cur === key && pending !== key) { if (au.paused) au.play().catch(() => {}); else au.pause(); paintSay(); return; }
    cur = key; paintSay();
    if (!ready.has(key)) { try { await getURL(key); } catch { if (cur === key) cur = null; const b = btnOf(key); if (b) { b.disabled = true; b.title = t('No recording yet', '还没有录音'); } paintSay(); return; } }
    if (cur !== key) return;                               // she moved on while the clip was decrypting
    await playNow(key);
  }
  const prefetch = q => { if (!io.audio) return; const k = q && (q.say || q.key); if (k && q.teach) getURL(k).catch(() => {}); };
  const stop = () => { au.pause(); cur = null; paintSay(); };
  au.onended = () => { if (au.src === SILENT) return; cur = null; paintSay(); }; au.onpause = au.onplay = paintSay;
  host.addEventListener('pointerdown', e => { if (unlocked || e.target.closest('.case-teach .say')) return;   // first tap anywhere: unlock the element (iOS) with a silent clip
    try { au.src = SILENT; au.play().then(() => { unlocked = true; if (au.src === SILENT) au.pause(); }).catch(() => {}); } catch {} }, true);
  const teach = (q, key = q.key) => q.teach ? `<div class="case-teach"><div class="av">${t('T', '师')}</div><div class="body"><div class="who">${t('Teacher', '老师')}${io.audio && (q.say || key) ? `<button class="say" type="button" data-say="${q.say || key}">▶</button>` : ''}</div>${bb(q.teach)}</div></div>` : '';
  const sayNow = q => { const k = q.say || q.key; if (voice && k && io.audio) play(k); };

  host.innerHTML = `<div class="case-top"><div class="case-bar"><i></i></div><span class="case-n"></span><button class="case-voice${voice ? '' : ' off'}" type="button" title="${t('Teacher voice', '老师声音')}">🔊</button></div><div id="caseBody"></div>`;
  const body = host.querySelector('#caseBody'), bar = host.querySelector('.case-bar i'), num = host.querySelector('.case-n');
  host.querySelector('.case-voice').onclick = e => { voice = !voice; store.set('case:voice', voice); e.target.classList.toggle('off', !voice); if (!voice) stop(); };
  host.addEventListener('click', e => { const s = e.target.closest('.case-teach .say'); if (s) play(s.dataset.say); });

  const head = q => `${q.warm ? `<span class="case-warm">${t('Warm-up: from last time', '回流：上次没记住的')}</span>` : ''}${q.text || q.time || q.vitals ? `<div class="case-scene">${q.time ? `<span class="time">${esc(q.time)}</span>` : ''}${bb(q.text)}${q.vitals ? `<div class="case-vitals">${VITALS.filter(([k]) => q.vitals[k] != null).map(([k, lab]) => `<span>${lab} ${esc(q.vitals[k])}</span>`).join('')}</div>` : ''}</div>` : ''}${q.strip12 ? `<div id="l12">${tiles12(make12(q.strip12.kind, q.strip12.seed || 1), !!q.strip12.marks)}</div>` : ''}`;
  const nextBtn = () => `<button class="btn case-next" type="button" id="next">${t('Continue', '继续')} →</button>`;
  const record = (q, ok) => {            // first-try bookkeeping; warm-up answers only clear the miss list
    if (q.warm) { if (ok && !st.tries['w:' + q.key]) setMisses(misses().filter(m => !(m.level === L.id && m.key === q.key))); st.tries['w:' + q.key] = 1; save(); return; }
    if (!(q.key in st.first)) st.first[q.key] = ok;
    st.tries[q.key] = (st.tries[q.key] || 0) + 1; save();
  };
  function right(q, html) {
    record(q, true);
    const out = body.querySelector('#out'); out.innerHTML = `<div class="case-res ok">${html}</div>${teach(q)}${nextBtn()}`;
    if (q.strip12 && !q.strip12.marks) body.querySelector('#l12').innerHTML = tiles12(make12(q.strip12.kind, q.strip12.seed || 1), true);
    body.querySelector('#next').onclick = advance; sayNow(q);
  }
  function wrong(q, html, extra = '') {
    record(q, false);
    body.querySelector('#out').innerHTML = `<div class="case-res bad">${html}</div>${extra}`;
  }
  function advance() { stop(); st.idx++; save(); draw(); window.scrollTo({ top: 0, behavior: 'instant' }); }

  function draw() {
    const q = queue[st.idx]; prefetch(q); prefetch(queue[st.idx + 1]); if (L.outro && st.idx >= queue.length - 2) getURL('outro').catch(() => {});
    bar.style.width = Math.round(100 * st.idx / queue.length) + '%'; num.textContent = `${Math.min(st.idx + 1, queue.length)} / ${queue.length}`;
    if (!q || q.kind === 'end') return finish();
    let html = head(q);
    if (q.kind === 'scene' || q.kind === 'header') html += (q.teach ? teach(q) : '') + nextBtn();
    else if (q.kind === 'choose') html += `<div class="case-q">${tt(q.q)}</div><div class="eo-grid case-opts">${shuffle(q.opts.map((o, i) => [o, i])).map(([o, i]) => `<button class="eo" type="button" data-i="${i}">${tt(o)}</button>`).join('')}</div><div id="out"></div>`;
    else if (q.kind === 'multi') html += `<div class="case-q">${tt(q.q)}</div><div class="eo-grid case-opts">${shuffle(q.opts.map((o, i) => [o, i])).map(([o, i]) => `<button class="eo" type="button" data-i="${i}">${tt(o)}</button>`).join('')}</div><button class="btn" type="button" id="ok">${t('Confirm', '确认')}</button><div id="out"></div>`;
    else if (q.kind === 'order') html += `<div class="case-q">${tt(q.q)}</div><div class="eo-grid case-opts">${shuffle(q.items.map((o, i) => [o, i])).map(([o, i]) => `<button class="eo" type="button" data-i="${i}">${tt(o)}</button>`).join('')}</div><div id="out"></div>`;
    else if (q.kind === 'type') html += `<div class="case-q">${tt(q.q)}</div><div class="case-type"><input id="ans" autocomplete="off" inputmode="${typeof q.answer === 'number' ? 'decimal' : 'text'}" placeholder="${esc(q.placeholder || '')}">${q.unit ? `<span class="unit">${esc(q.unit)}</span>` : ''}<button class="btn" type="button" id="ok">${t('Check', '确认')}</button></div><div id="out"></div>`;
    body.innerHTML = html;
    if (q.kind === 'scene' || q.kind === 'header') { body.querySelector('#next').onclick = advance; sayNow(q); return; }
    if (q.kind === 'choose') body.querySelectorAll('.eo').forEach(b => b.onclick = () => {
      const o = q.opts[+b.dataset.i];
      if (o.ok) { body.querySelectorAll('.eo').forEach(x => { x.disabled = true; }); b.classList.add('right'); right(q, bb(o.then)); }
      else { b.disabled = true; b.classList.add('wrong'); wrong(q, bb(o.then), `<div class="case-again">${t('Pick again.', '再选一次。')}</div>`); }
    });
    if (q.kind === 'multi') { body.querySelectorAll('.eo').forEach(b => b.onclick = () => b.classList.toggle('sel'));
      body.querySelector('#ok').onclick = () => {
        const sel = [...body.querySelectorAll('.eo.sel')].map(b => +b.dataset.i), okSet = q.opts.map((o, i) => o.ok ? i : -1).filter(i => i >= 0);
        const extra = sel.filter(i => !okSet.includes(i)), missing = okSet.filter(i => !sel.includes(i));
        if (!extra.length && !missing.length) { body.querySelectorAll('.eo').forEach(x => { x.disabled = true; if (x.classList.contains('sel')) x.classList.add('right'); }); body.querySelector('#ok').remove(); right(q, bb(q.then || { en: 'All of them, nothing extra.', zh: '一个不多，一个不少。' })); }
        else { extra.forEach(i => { const b = body.querySelector(`.eo[data-i="${i}"]`); b.classList.remove('sel'); b.classList.add('wrong'); b.disabled = true; });
          wrong(q, `${extra.length ? t(`${extra.length} of your picks ${extra.length > 1 ? 'are' : 'is'} not one of them. `, `有 ${extra.length} 个选错了。`) : ''}${missing.length ? t(`${missing.length} still missing.`, `还漏了 ${missing.length} 个。`) : ''}`, `<div class="case-again">${t('Fix it and confirm again.', '改一下，再确认。')}</div>`); }
      }; }
    if (q.kind === 'order') { const seq = [];
      body.querySelectorAll('.eo').forEach(b => b.onclick = () => {
        seq.push(+b.dataset.i); b.disabled = true; b.insertAdjacentHTML('beforeend', `<span class="num">${seq.length}</span>`);
        if (seq.length < q.items.length) return;
        const k = seq.findIndex((v, j) => v !== q.answer[j]);
        if (k < 0) { body.querySelectorAll('.eo').forEach(x => x.classList.add('right')); right(q, q.answer.map(i => tt(q.items[i])).join(' → ')); return; }
        wrong(q, t(`Step ${k + 1} is in the wrong place.`, `第 ${k + 1} 步放错了。`), `<button class="btn ghost" type="button" id="redo">${t('Start the order again', '重新排')}</button>`);
        body.querySelectorAll('.eo').forEach((x, j) => { if (j >= 0) x.classList.toggle('wrong', seq.indexOf(+x.dataset.i) === k); });
        body.querySelector('#redo').onclick = () => { seq.length = 0; body.querySelectorAll('.eo').forEach(x => { x.disabled = false; x.classList.remove('wrong'); x.querySelector('.num')?.remove(); }); body.querySelector('#out').innerHTML = ''; };
      }); }
    if (q.kind === 'type') { const inp = body.querySelector('#ans'); let n = 0; inp.focus();
      const check = () => { const v = inp.value; if (!v.trim()) return;
        if (matches(q, v)) { inp.disabled = true; body.querySelector('#ok').disabled = true; right(q, `<b>${esc(String(q.show || q.answer))}${q.unit ? ' ' + esc(q.unit) : ''}</b> ✓`); return; }
        n++;
        if (n >= 3) { inp.disabled = true; body.querySelector('#ok').disabled = true; record(q, false); body.querySelector('#out').innerHTML = `<div class="case-res bad">${t('The answer is', '答案是')} <b>${esc(String(q.show || q.answer))}${q.unit ? ' ' + esc(q.unit) : ''}</b>.</div>${teach(q)}${nextBtn()}`; body.querySelector('#next').onclick = advance; sayNow(q); return; }
        wrong(q, n === 1 ? t('Not that. Think again.', '不对，再想想。') : `${t('Still not it.', '还是不对。')} ${q.hint ? tt(q.hint) : ''}`); inp.select();
      };
      body.querySelector('#ok').onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); }; }
  }
  function finish() {
    const ok = scored.filter(s => st.first[s.key]).length, missed = scored.filter(s => st.first[s.key] === false);
    if (!st.done) {
      st.done = true; save();
      const best = store.get(K + ':best', null); if (!best || ok > best.ok) store.set(K + ':best', { ok, total: scored.length, at: Date.now() });
      store.set(K + ':runs', (store.get(K + ':runs', 0) || 0) + 1);
      const m = misses().filter(x => !(x.level === L.id && missed.some(s => s.key === x.key)));
      setMisses([...m, ...missed.map(s => ({ level: L.id, key: s.key, at: Date.now() }))]);
    }
    bar.style.width = '100%'; num.textContent = `${queue.length} / ${queue.length}`;
    body.innerHTML = `<div class="case-end"><div class="sub">${tt(L.endTitle || { en: 'Hand-over done.', zh: '交接完成。' })}</div><div class="big">${ok} / ${scored.length}</div><div class="sub">${t('right on the first try', '第一次就对')}</div>
      ${missed.length ? `<div class="case-q" style="text-align:left">${t('These did not stick yet. They come back at the start of your next run.', '这几个还没记住，下次开头会先考你：')}</div><ul>${missed.map(s => `<li><b>${tt(s.q)}</b>${s.teach ? bb(s.teach) : ''}</li>`).join('')}</ul>` : `<div class="case-q">${t('Every decision right first time. Nothing comes back.', '每个决定第一次就对。没有要回流的。')}</div>`}
      ${L.outro ? teach({ teach: L.outro, say: 'outro', key: 'outro' }) : ''}
      <div class="btn-row"><button class="btn" type="button" id="again">${t('Run the call again', '再跑一次')}</button><a class="btn ghost" href="#/aet/class">${t('Back to the weekend', '回到周末课表')}</a></div></div>`;
    body.querySelector('#again').onclick = () => { stop(); store.set(K + ':state', null); caseLevel(host, store, L, io); window.scrollTo({ top: 0, behavior: 'instant' }); };
    if (L.outro) sayNow({ say: 'outro' });
  }
  draw();
}
