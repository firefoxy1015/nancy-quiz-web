// Home: the front page as a sticker board (2026-11-23), the same skin as Drug Drill and Play & learn (.ddx, scoped .ddx.hm).
// About one phone screen: one "continue" button, three quick-practice tiles, the lessons, and the three exams with one number
// each. Every card is tapped as a whole; there are no separate "Enter" buttons. Stickers: img/home/<id>.webp (drawn by
// D:\Claude\drug-trainer\design\home_stickers.py), plus a few borrowed from drugs/img and img/play.
// The AET class is deliberately NOT on this page, nor anywhere else on the site: direct link plus the class password only. S.last, written by
// app.js route(), is the last place worth returning to; AET routes are never recorded.
import { S, esc } from './app.js?v=93';

export const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
export const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M9 5l7 7-7 7"/></svg>';
// names: in both-mode the Chinese sits under the English; short mono lines join with a dot
export const two = (en, zh) => S.lang === 'zh' ? zh : S.lang === 'both' ? `${en}<span class="zh">${zh}</span>` : en;
export const one = (en, zh) => S.lang === 'zh' ? zh : S.lang === 'both' ? `${en} · ${zh}` : en;
export const mini = (en, zh) => S.lang === 'en' ? en : zh;   // the small line under a name: one language only, the cells are narrow
export const stk = (src, r = 0) => `<img class="stk" src="${src}" alt="" draggable="false" style="--r:${r}deg" onerror="this.style.visibility='hidden'">`;
export const meter = pct => `<span class="meter"><i style="width:${Math.max(pct ? 4 : 0, Math.round(pct))}%"></i></span>`;

// Places the "continue" button may return to: [hash test, English, Chinese]. Anything not listed (AET above all) is not recorded.
export const PLACES = [
  [/^#\/study\/classroom/, 'Spoken lessons', '语音课'],
  [/^#\/study\/chapters/, 'Textbook review', '教材精读'],
  [/^#\/study\/(?!guidelines)[a-z]/, 'Guidelines', '考纲'],   // the guidelines menu itself is not a place to come back to
  [/^#\/practice/, 'Practice questions', '刷题'],
  [/^#\/wrong/, 'Wrong-answer book', '错题本'],
  [/^#\/scenario/, 'Scenarios', '出车场景'],
  [/^#\/examiner/, 'AI examiner', '考官机器人'],
  [/^#\/juris/, 'Jurisprudence', '法规考'],
  [/^#\/play\/[a-z]/, 'Play & learn', '边学边玩'],
];
export const placeOf = hash => PLACES.find(p => p[0].test(hash)) || null;

function resume(tr) {
  const wm = S.writtenMock;
  if (wm && wm.track === tr && wm.ids && wm.ids.length) {
    const a = Object.keys(wm.answers || {}).length;
    return { href: '#/mock', en: 'Finish your mock exam', zh: '把模考做完', subEn: `${a} of ${wm.ids.length} answered`, subZh: `已答 ${a} / ${wm.ids.length} 题` };
  }
  const run = S.scenarioRun;
  if (run && run.id && !run.finished) return { href: '#/scenario/' + encodeURIComponent(run.id), en: 'Back to your call', zh: '回到那趟车', subEn: 'Scenario in progress', subZh: '场景还没跑完' };
  const last = S.last, pl = last && last.track === tr && last.h ? placeOf(last.h) : null;
  if (pl) {
    const ch = /chapters\?ch=\D*(\d+)/.exec(last.h);
    return { href: last.h, en: 'Continue', zh: '继续', subEn: pl[1] + (ch ? ` · chapter ${+ch[1]}` : ''), subZh: pl[2] + (ch ? ` · 第 ${+ch[1]} 章` : '') };
  }
  return null;
}
export const classDone = () => { // spoken lessons finished on this device (classroom.js keeps 'pcpclass:<lesson>:done')
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^pcpclass:.+:done$/.test(k) && localStorage.getItem(k) === 'true') n++; } } catch { /* storage blocked */ }
  return n;
};
const best = list => (list.length ? Math.max(...list.map(x => +x || 0)) + '%' : '—');

function pickTrack(el) {
  const pics = list => `<span class="phub-pics">${list.map((src, i) => `<img src="${src}" alt="" style="--r:${(i - 1) * 9}deg">`).join('')}</span>`;
  el.innerHTML = `<div class="ddx hm phub lang-${S.lang}"><main>
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">BC Medic Prep${S.lang === 'en' ? '' : ' · BC 省急救员考证'}</p>
      <h1 class="h1">${two('<span class="ph">Which licence </span><span class="ph">are you <em>going for</em>?</span>', '<span class="ph">你要考</span><span class="ph"><em>哪一个</em>执照？</span>')}</h1>
    </div></header>
    <div class="phub-tiles hm-pick">
      <button class="phub-tile" data-pick-track="emr">${pics(['./img/play/emr-written/oxygen.webp', './img/play/emr-written/aed.webp', './drugs/img/oral-glucose.webp'])}
        <b>EMR</b><small>Emergency Medical Responder${S.lang === 'en' ? '' : '<span class="zh">急救反应员</span>'}</small><span class="phub-n">${one('EMALB written · jurisprudence · practical', 'EMALB 笔试 · 法规 · 实操')}</span></button>
      <button class="phub-tile" data-pick-track="pcp">${pics(['./drugs/img/d10w.webp', './img/home/practical.webp', './drugs/img/nitroglycerin.webp'])}
        <b>PCP</b><small>Primary Care Paramedic${S.lang === 'en' ? '' : '<span class="zh">初级急救员</span>'}</small><span class="phub-n">${one('COPR written · jurisprudence · practical', 'COPR 笔试 · 法规 · 实操')}</span></button>
    </div>
    <p class="foot">${one('Switch any time with EMR / PCP at the top.', '随时可以用页面顶部的 EMR / PCP 切换。')}<br><a href="#/guide">${one('How to use this site', '怎么用这个网站')}</a></p>
  </main></div>`;
}

export async function renderHome(el) {
  if (!S.track) return pickTrack(el);
  const tr = S.track, isPcp = tr === 'pcp', r = resume(tr);
  const go = r || (isPcp
    ? { href: '#/practice', en: 'Start with a few questions', zh: '先做几道题', subEn: 'Instant answers, every option explained', subZh: '做完马上看解析' }
    : { href: '#/play/emr-written', en: 'Start with a sticker round', zh: '先玩一轮贴纸卡', subEn: 'About 3 minutes', subZh: '大约 3 分钟' });
  const head = r ? two('<span class="ph">Pick up where </span><span class="ph">you <em>left off</em>.</span>', '<span class="ph">接着<em>上次</em>的来。</span>') : two('<span class="ph">Three exams. </span><span class="ph">Start <em>here</em>.</span>', '<span class="ph">三关考试，</span><span class="ph">从<em>这里</em>开始。</span>');

  const tile = (href, pic, r0, en, zh, subEn, subZh) => `<a class="hm-tile" href="${href}">${stk(pic, r0)}<b>${two(en, zh)}</b><small>${mini(subEn, subZh)}</small></a>`;
  const quiz = tile('#/practice', './img/home/quiz.webp', -5, 'Questions', '刷题', 'instant answers', '即时解析');
  const drugs = tile('./drugs/', './drugs/img/nitroglycerin.webp', 4, 'Drug Drill', '药箱', '3 minutes', '三分钟一轮');
  const scene = tile('#/scenarios', './img/home/scene.webp', 6, 'A call', '出一趟车', 'run a scenario', '跑一个场景');
  const play = tile('#/play', './img/play/emr-written/aed.webp', -4, 'Play & learn', '边学边玩', 'sticker cards', '贴纸卡');

  const chRead = Object.keys(S.chaptersRead || {}).length, cls = isPcp ? classDone() : 0;
  const row = (href, pic, en, zh, sub, pct, id = '') => `<a class="hm-row" href="${href}">${stk(pic)}<span><b>${two(en, zh)}</b><small${id ? ` id="${id}"` : ''}>${sub}</small>${pct == null ? '' : meter(pct)}</span><span class="chev">${CHEV}</span></a>`;
  const rows = (isPcp ? row('#/study/classroom', './img/home/class.webp', 'Spoken lessons', '语音课', cls ? mini(`${cls} done`, `已听 ${cls} 课`) : mini('a teacher talks you through it', '老师一课一课讲'), cls ? 0 : null, 'hmCls') : '')
    + row('#/study/chapters', './img/home/book.webp', 'Textbook review', '教材精读', mini(`${chRead} / 54 chapters`, `${chRead} / 54 章`), chRead / 54 * 100)
    + row('#/study/guidelines', './img/home/guide.webp', 'Guidelines', '考纲', mini('assessment · protocols · drugs', '评估 · 协议 · 药物'), null);

  const mocks = S.mockHistory.filter(m => m.track === tr).map(m => m.pct), jur = (S.jurisHistory || []).map(j => j.pct), runs = (S.scenarioHistory || []).map(s => s.score);
  const exam = (href, pic, n, en, zh, subEn, subZh) => `<a class="hm-exam" href="${href}">${stk(pic)}<span class="n${n === '—' ? ' none' : ''}">${n}</span><b>${two(en, zh)}</b><small>${mini(subEn, subZh)}</small></a>`;

  el.innerHTML = `<div class="ddx hm lang-${S.lang}"><main>
    <header class="hm-hero"><div class="hm-head">
      <p class="kick">${tr.toUpperCase()} · BC Medic Prep</p>
      <h1 class="h1">${head}</h1>
    </div><div class="hm-cta">
      <a class="go" href="${esc(go.href)}"><span>${two(go.en, go.zh)}<small>${one(go.subEn, go.subZh)}</small></span><span class="arrow">${ARROW}</span></a>
    </div></header>

    <div class="hm-cols">
      <section><p class="kick sec">${one('Quick practice', '练一下')}</p>
        <div class="hm-tiles">${isPcp ? quiz + drugs + scene : play + drugs + quiz}</div></section>
      <section><p class="kick sec">${one('Learn', '上课')}</p>
        <div class="hm-rows">${rows}</div></section>
    </div>

    <p class="kick sec">${one('The three exams · full mocks', '考试三关 · 全真模考')}</p>
    <div class="hm-exams">
      ${exam('#/mock', './img/home/written.webp', best(mocks), 'Written', '笔试', isPcp ? 'COPR · 200 Q' : 'EMALB · 200 Q', isPcp ? 'COPR · 200 题' : 'EMALB · 200 题')}
      ${exam('#/juris', './img/home/juris.webp', best(jur), 'Jurisprudence', '法规', '25 Q · pass 80%', '25 题 · 80% 过')}
      ${exam('#/practical', './img/home/practical.webp', best(runs), 'Practical', '实操', '2 calls · pass 70%', '2 场 · 70% 过')}
    </div>

    <p class="foot"><a href="#/guide">${one('How to use', '使用指南')}</a> · <a href="#/info">${one('Exam logistics & fees', '考务与费用')}</a> · <a href="#/backup">${one('Back up progress', '备份进度')}</a></p>
  </main></div>`;

  if (isPcp) { // lesson total arrives after first paint; the row is already usable without it
    fetch('./data/classroom/index.json', { cache: 'no-cache' }).then(x => (x.ok ? x.json() : null)).then(d => {
      const all = d ? d.units.flatMap(u => u.lessons).filter(l => l.ready).length : 0, s = el.querySelector('#hmCls');
      if (!all || !s) return;
      s.textContent = mini(`${cls} / ${all} lessons`, `${cls} / ${all} 课`);
      const m = s.parentNode.querySelector('.meter i'); if (m) m.style.width = Math.max(cls ? 4 : 0, Math.round(cls / all * 100)) + '%';
      else s.insertAdjacentHTML('afterend', meter(cls / all * 100));
    }).catch(() => { /* offline: the count of finished lessons stays */ });
  }
}
