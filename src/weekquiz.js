// Detailed weekend quiz (#/aet/class?quiz=N): 50+ original questions per weekend, grouped by topic.
// Three kinds: one answer ("one"), every right answer ("multi"), a number she types ("num").
// One question at a time; the explanation and its source show after each answer; wrong ones come back until clear.
// Content lives in the encrypted weekend part (aet-class/classroom/quiz/wNN.json -> build_vault.py).
// Where the exam (EMALB) and BCEHS differ the exam is the answer and the explanation names the difference.
import { t, esc } from './app.js?v=72';
import { isRight } from './numlab.js?v=72';

const rnd = n => Math.floor(Math.random() * n);
const shuffle = xs => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const both = () => t('a', 'b') === 'a b';
const L2 = (en, zh) => both() && zh ? `<span>${esc(en)}</span><span class="nl-zh">${esc(zh)}</span>` : esc(t(en, zh || en));
const fmtN = v => Number.isInteger(v) ? v.toLocaleString('en-US') : String(v);
const pad = wk => String(wk).padStart(2, '0');

export const quizKey = wk => 'quiz:w' + pad(wk);
// how many questions she has right at the moment (latest answer), for the weekend card
export function quizScore(store, wk) { const a = store.get(quizKey(wk), {}).ans || {}; return Object.values(a).filter(x => x && x.ok).length; }

export function weekQuiz(host, store, QZ, wk) {
  const K = quizKey(wk);
  const st = Object.assign({ ans: {}, cur: null, runs: 0, best: null }, store.get(K, {}));
  const save = () => store.set(K, st);
  const SECS = QZ.sections, ALL = SECS.flatMap(s => s.qs.map(q => ({ ...q, sec: s })));
  const byId = Object.fromEntries(ALL.map(q => [q.id, q]));
  Object.keys(st.ans).forEach(id => { if (!byId[id]) delete st.ans[id]; });           // a question that was rewritten or removed
  if (st.cur && !st.cur.list.every(id => byId[id])) st.cur = null;
  const okN = qs => qs.filter(q => (st.ans[q.id] || {}).ok).length;
  const wrongs = () => ALL.filter(q => st.ans[q.id] && !st.ans[q.id].ok);
  const answerText = q => q.t === 'num' ? `${q.show || (q.lo != null ? `${fmtN(q.lo)}–${fmtN(q.hi)}` : fmtN(q.answer))} ${t(q.unit || '', q.unitZh || q.unit || '')}`.trim()
    : [].concat(q.a).map(i => t(q.o[i], (q.oZh || q.o)[i])).join(' · ');
  const top = () => window.scrollTo({ top: 0, behavior: 'instant' });

  function home() {
    const done = ALL.filter(q => st.ans[q.id]).length, ok = okN(ALL), w = wrongs().length;
    host.innerHTML = `<div class="nl-card wq-home">
      <p class="wq-lead">${L2(`${ALL.length} questions in ${SECS.length} topics. One at a time, with the reason and the source after each answer. Your place is saved; stop whenever you like.`,
        `${ALL.length} 题，分 ${SECS.length} 个主题。一次一题，答完马上给理由和出处。进度会存下来，随时可以停。`)}</p>
      <div class="wq-stats"><div><b>${done}</b><span>${t('answered', '已答')}</span></div><div><b>${ok}</b><span>${t('right now', '目前答对')}</span></div><div><b>${w}</b><span>${t('to redo', '待重做')}</span></div><div><b>${st.best ? Math.round(100 * st.best.ok / st.best.total) + '%' : '–'}</b><span>${t('best full run', '整套最好成绩')}</span></div></div>
      <div class="btn-row wq-go">
        ${st.cur ? `<button class="btn" type="button" id="wqCont">${t('Continue', '接着做')} · ${st.cur.i + 1} / ${st.cur.list.length}</button>` : ''}
        <button class="btn${st.cur ? ' ghost' : ''}" type="button" id="wqAll">${t(done ? 'Start the whole quiz again' : 'Start the whole quiz', done ? '整套重新做' : '开始做整套')} · ${ALL.length}</button>
        ${w ? `<button class="btn ghost" type="button" id="wqWrong">${t('Only the ones I got wrong', '只做我错的')} · ${w}</button>` : ''}
      </div>
      <div class="wq-h">${t('Or one topic at a time', '或者一个主题一个主题做')}</div>
      <div class="wq-secs">${SECS.map((s, i) => { const n = s.qs.length, k = okN(s.qs), d = s.qs.filter(q => st.ans[q.id]).length;
        return `<button type="button" class="wq-sec${k === n ? ' full' : ''}" data-sec="${i}"><span class="n">${i + 1}</span><span class="nm">${L2(s.en, s.zh)}</span><span class="sc">${d ? `${k} / ${n}` : `${n} ${t('Q', '题')}`}</span></button>`; }).join('')}</div>
      <p class="hint" style="margin-top:14px"><a href="#/aet/class">← ${t('Back to the weekend', '回到周末课表')}</a></p></div>`;
    const go = (list, mode) => { st.cur = { list: list.map(q => q.id), i: 0, mode, got: {} }; save(); run(); top(); };
    host.querySelector('#wqAll').onclick = () => go(ALL, 'all');
    const c = host.querySelector('#wqCont'); if (c) c.onclick = () => { run(); top(); };
    const wr = host.querySelector('#wqWrong'); if (wr) wr.onclick = () => go(wrongs(), 'wrong');
    host.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => go(SECS[+b.dataset.sec].qs.map(q => byId[q.id]), 'sec'));
  }

  function run() {
    const C = st.cur; if (!C) return home();
    if (C.i >= C.list.length) return end();
    const q = byId[C.list[C.i]], n = C.list.length;
    const order = q.t === 'num' ? [] : shuffle(q.o.map((_, i) => i));
    host.innerHTML = `<div class="case-top"><div class="case-bar"><i style="width:${Math.round(100 * C.i / n)}%"></i></div><span class="case-n">${C.i + 1} / ${n}</span><button class="case-voice" type="button" id="wqQuit" title="${t('Stop here; your place is saved', '先停在这里，进度已存')}">✕</button></div>
      <div class="nl-card"><span class="nl-tag">${L2(q.sec.en, q.sec.zh)}</span>
      <div class="case-q">${L2(q.q, q.qZh)}</div>
      ${q.t === 'num' ? `<div class="case-type"><input id="wqIn" autocomplete="off" inputmode="decimal" placeholder="?"><span class="unit">${esc(t(q.unit || '', q.unitZh || q.unit || ''))}</span><button class="btn" type="button" id="wqOk">${t('Check', '检查')}</button></div>`
        : `${q.t === 'multi' ? `<div class="hint wq-pick">${t('More than one is right. Pick every right answer.', '不止一个对。把对的全选上。')}</div>` : ''}
        <div class="eo-grid case-opts wq-opts">${order.map(i => `<button class="eo" type="button" data-i="${i}">${L2(q.o[i], (q.oZh || [])[i])}</button>`).join('')}</div>
        ${q.t === 'multi' ? `<button class="btn" type="button" id="wqOk">${t('Confirm', '确认')}</button>` : ''}`}
      <div id="wqOut"></div></div>`;
    host.querySelector('#wqQuit').onclick = () => { home(); top(); };
    const out = host.querySelector('#wqOut');
    const finish = ok => {
      const prev = st.ans[q.id]; st.ans[q.id] = { ok, n: ((prev && prev.n) || 0) + 1, at: Date.now() }; C.got[q.id] = ok; save();
      out.innerHTML = `<div class="case-res ${ok ? 'ok' : 'bad'}"><b>${ok ? t('Right.', '对。') : t('Not this time.', '这次没对。')}</b>${ok && q.t !== 'num' ? '' : ` ${t('Answer', '答案')}: <b>${esc(answerText(q))}</b>`}
        <div class="nl-why">${L2(q.why, q.whyZh)}</div>${q.src ? `<div class="wq-src">${t('Source', '出处')}: ${esc(q.src)}</div>` : ''}</div>
        <button class="btn case-next" type="button" id="wqNext">${C.i + 1 < n ? t('Next question', '下一题') : t('See the result', '看成绩')} →</button>`;
      const nx = host.querySelector('#wqNext'); nx.onclick = () => { C.i++; save(); run(); top(); };
      nx.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    if (q.t === 'num') {
      const inp = host.querySelector('#wqIn'), okB = host.querySelector('#wqOk');
      const check = () => { if (!inp.value.trim() || inp.disabled) return; inp.disabled = true; okB.disabled = true; finish(isRight(q, inp.value)); };
      okB.onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
      return;
    }
    const btns = [...host.querySelectorAll('.wq-opts .eo')], right = [].concat(q.a);
    const paint = sel => btns.forEach(b => { const i = +b.dataset.i; b.disabled = true; b.classList.remove('sel');
      if (right.includes(i)) b.classList.add('right'); else if (sel.includes(i)) b.classList.add('wrong'); });
    if (q.t === 'multi') {
      btns.forEach(b => b.onclick = () => b.classList.toggle('sel'));
      host.querySelector('#wqOk').onclick = e => { const sel = btns.filter(b => b.classList.contains('sel')).map(b => +b.dataset.i); if (!sel.length) return;
        e.target.remove(); paint(sel); finish(sel.length === right.length && sel.every(i => right.includes(i))); };
    } else btns.forEach(b => b.onclick = () => { const i = +b.dataset.i; paint([i]); finish(right.includes(i)); });
  }

  function end() {
    const C = st.cur, qs = C.list.map(id => byId[id]), ok = qs.filter(q => C.got[q.id]).length, missed = qs.filter(q => !C.got[q.id]);
    st.runs++; if (C.mode === 'all' && (!st.best || ok > st.best.ok)) st.best = { ok, total: qs.length, at: Date.now() };
    st.cur = null; save();
    const secs = SECS.map(s => { const mine = qs.filter(q => q.sec === s); return mine.length ? { s, n: mine.length, k: mine.filter(q => C.got[q.id]).length } : null; }).filter(Boolean);
    host.innerHTML = `<div class="case-end"><div class="sub">${t('Result', '成绩')}</div><div class="big">${ok} / ${qs.length}</div><div class="sub">${Math.round(100 * ok / qs.length)}%</div>
      ${secs.length > 1 ? `<div class="wq-break">${secs.map(x => `<div class="${x.k === x.n ? 'full' : x.k / x.n < 0.6 ? 'low' : ''}"><span>${L2(x.s.en, x.s.zh)}</span><b>${x.k} / ${x.n}</b></div>`).join('')}</div>` : ''}
      ${missed.length ? `<div class="nl-endh">${t('These did not stick yet', '这几题还没记住')}</div><ul class="nl-missed">${missed.map(q => `<li><b>${L2(q.q, q.qZh)}</b><div>${t('Answer', '答案')}: <b>${esc(answerText(q))}</b></div><div class="nl-why">${L2(q.why, q.whyZh)}</div></li>`).join('')}</ul>`
        : `<div class="case-q">${t('Every one right. Nothing to redo.', '全对，没有要重做的。')}</div>`}
      <div class="btn-row">${missed.length ? `<button class="btn" type="button" id="wqRedo">${t(`Redo the ${missed.length} I missed`, `把错的 ${missed.length} 题再做一遍`)}</button>` : ''}
        <button class="btn ghost" type="button" id="wqHome">${t('Quiz home', '回到测验首页')}</button><a class="btn ghost" href="#/aet/class">${t('Back to the weekend', '回到周末课表')}</a></div></div>`;
    const r = host.querySelector('#wqRedo'); if (r) r.onclick = () => { st.cur = { list: shuffle(missed).map(q => q.id), i: 0, mode: 'wrong', got: {} }; save(); run(); top(); };
    host.querySelector('#wqHome').onclick = () => { home(); top(); };
  }
  home();
}
