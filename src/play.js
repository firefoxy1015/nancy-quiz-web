// EMR Play & learn (边学边玩): the EMR written bank and the practical sims as sticker drills, the Drug Drill style she
// picked (drill.js). Content source D:\Claude\emr-play (BRIEF.md, cards/*.json, tools/play_check.py) is built into
// data/play/<deck>.json without the evidence quotes; stickers img/play/<deck>/<card id>.webp; progress localStorage
// 'play:<deck>' (in #/backup). #/play is the EMR Play & learn hub (shareable short address: bcmedicprep.com/emr/ ->
// emr/index.html sets the EMR track for first-time visitors and opens #/play); #/play/emr-written and #/play/emr-sims are
// the decks. Linked from the EMR home dashboard and the EMR written / practical hubs. No track needed.
import { t, esc, loadJSON } from './app.js?v=85';

export const PLAY_DECKS = {
  'emr-written': { kick: { en: 'EMR written', zh: 'EMR 笔试' }, back: '#/play', backEn: 'EMR Play & learn', backZh: 'EMR 边学边玩',
    en: 'Written questions', zh: '笔试题', subEn: 'Sticker cards: three short screens, then quick calls, true-or-false, tap-all and put-in-order. About 3 minutes a round.', subZh: '贴纸卡：先 3 屏短讲，再出车判断、对错、多选、排顺序。一轮约 3 分钟。', unit: ['cards learned', '张卡已学'] },
  'emr-sims': { kick: { en: 'EMR practical', zh: 'EMR 实操' }, back: '#/play', backEn: 'EMR Play & learn', backZh: 'EMR 边学边玩',
    en: 'Practical sims', zh: '实操 sims', subEn: 'Run a whole station: dispatch, then every decision in order. Graded like the real exam, 70% passes.', subZh: '跑完整一站：先听调度，再按顺序做每个决定。按真考评分，70% 及格。', unit: ['calls run', '单已跑'] },
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('play:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('play:' + k, JSON.stringify(v)); } catch { /* storage full or blocked: progress lives for this visit only */ } },
};

async function renderPlayHub(el) {
  import('./drill.js?v=85').then(m => m.loadFonts());   // the hub uses the drill's type
  const ids = Object.keys(PLAY_DECKS), decks = await Promise.all(ids.map(id => loadJSON(`./data/play/${id}.json`)));
  const tile = (id, D) => {
    const k = PLAY_DECKS[id], cards = (D && D.cards) || [], st = store.get(id, null) || {}, seen = cards.filter(c => (st.seen || {})[c.id]).length;
    const pics = cards.filter(c => !Array.isArray(D.stk) || D.stk.includes(c.id)).slice(0, 3);
    return `<a class="phub-tile" href="#/play/${id}"><span class="phub-pics">${pics.map((c, i) => `<img src="./img/play/${id}/${encodeURIComponent(c.id)}.webp" alt="" style="--r:${(i - 1) * 9}deg">`).join('')}</span>
      <b>${t(k.en, k.zh)}</b><small>${t(k.subEn, k.subZh)}</small><span class="phub-n">${seen} / ${cards.length} ${t(k.unit[0], k.unit[1])}</span></a>`;
  };
  el.innerHTML = `<div class="ddx phub"><main class="home">
    <p class="kick">EMR · ${t('Play & learn', '边学边玩')}</p>
    <h1 class="h1">${t('Learn the EMR exam by <em>playing</em>.', '<em>边玩</em>边备考 EMR。')}</h1>
    <p class="phub-lede">${t('Written questions and practical sims for the BC EMR licensing exam. Answers follow the EMALB exam guidelines and grading criteria, and every answer names its source. Progress stays on this device.',
      'BC 省 EMR 执照考试的笔试题和实操 sims。答案以 EMALB 考纲和评分标准为准，每题都注明出处。进度只存在这台设备上。')}</p>
    <div class="phub-tiles">${ids.map((id, i) => tile(id, decks[i])).join('')}</div>
    <p class="foot">${t('More topics and calls are on the way. The full question bank, mock exams and scenarios are on the main site:', '更多主题和场景陆续加。完整题库、模考和场景在主站：')} <a href="#/">${t('BC Medic Prep home', 'BC Medic Prep 首页')}</a> · <a href="./drugs/">${t('Drug Drill', '药箱')}</a></p>
  </main></div>`;
}

export async function renderPlay(el, arg) {
  if (!arg) return renderPlayHub(el);
  const deck = PLAY_DECKS[arg];
  if (!deck) { location.hash = '#/play'; return; }
  const D = await loadJSON(`./data/play/${arg}.json`);
  if (!D) { el.innerHTML = `<div class="card"><p class="muted">${t('Could not load this deck. Check the connection and try again.', '加载失败，请检查网络后重试。')}</p></div>`; return; }
  el.innerHTML = `<a class="back-link" href="${deck.back}">← ${t(deck.backEn, deck.backZh)}</a><div id="playHost"></div>`;
  const { drillLab } = await import('./drill.js?v=85');
  drillLab(el.querySelector('#playHost'), store, D, { key: arg, kick: deck.kick, tag: 'EMR', img: id => `./img/play/${arg}/${encodeURIComponent(id)}.webp` });
}
