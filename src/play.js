// EMR Play & learn (边学边玩): the EMR written bank and the practical sims as sticker drills, the Drug Drill style she
// picked (drill.js). Content source D:\Claude\emr-play (BRIEF.md, cards/*.json, tools/play_check.py) is built into
// data/play/<deck>.json without the evidence quotes; stickers img/play/<deck>/<card id>.webp; progress localStorage
// 'play:<deck>' (in #/backup). #/play/emr-written and #/play/emr-sims; the written and practical hubs link here for EMR.
import { t, loadJSON } from './app.js?v=81';

export const PLAY_DECKS = {
  'emr-written': { kick: { en: 'EMR written', zh: 'EMR 笔试' }, back: '#/written', backEn: 'Written Exam Camp', backZh: '笔试营' },
  'emr-sims': { kick: { en: 'EMR practical', zh: 'EMR 实操' }, back: '#/practical', backEn: 'Practical Exam Camp', backZh: '实操营' },
};
const store = {
  get(k, d) { try { const v = localStorage.getItem('play:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('play:' + k, JSON.stringify(v)); } catch { /* storage full or blocked: progress lives for this visit only */ } },
};

export async function renderPlay(el, arg) {
  const deck = PLAY_DECKS[arg];
  if (!deck) { location.hash = '#/'; return; }
  const D = await loadJSON(`./data/play/${arg}.json`);
  if (!D) { el.innerHTML = `<div class="card"><p class="muted">${t('Could not load this deck. Check the connection and try again.', '加载失败，请检查网络后重试。')}</p></div>`; return; }
  el.innerHTML = `<a class="back-link" href="${deck.back}">← ${t(deck.backEn, deck.backZh)}</a><div id="playHost"></div>`;
  const { drillLab } = await import('./drill.js?v=81');
  drillLab(el.querySelector('#playHost'), store, D, { key: arg, kick: deck.kick, tag: 'EMR', img: id => `./img/play/${arg}/${encodeURIComponent(id)}.webp` });
}
