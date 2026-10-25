// Back up / restore progress. Everything the site remembers lives in this browser's localStorage, so a cleared
// browser or a new phone starts from zero. This writes it all to one JSON file and reads it back.
// Passwords and remembered keys (class portal, class lectures) are left out on purpose: a backup is not a login.
import { t, esc, ico } from './app.js?v=41';

const EXACT = ['bcprep2', 'bcprepPortalQuiz'];          // site state (track, language, wrong answers, mocks, chapters read) · portal quiz progress
const PREFIXES = ['pcpclass:', 'aetclass:'];           // Nancy classroom · AET class (done, tests, flashcard boxes)
const ours = k => EXACT.includes(k) || PREFIXES.some(p => k.startsWith(p));

function collect() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (ours(k)) data[k] = localStorage.getItem(k);
  }
  return data;
}

export async function renderBackup(el) {
  const data = collect(), n = Object.keys(data).length;
  const site = (() => { try { return JSON.parse(data.bcprep2 || '{}'); } catch { return {}; } })();
  const wrong = Object.keys(site.wrong || {}).length, mocks = (site.mocks || []).length, chapters = Object.keys(site.chaptersRead || {}).length;
  el.innerHTML = `
    <a class="back-link" href="#/">← ${t('Home', '首页')}</a>
    <div class="card">
      <h2 style="margin-top:0">${ico('download')} ${t('Back up / restore progress', '备份 / 恢复进度')}</h2>
      <p>${t('Your progress is stored only in this browser. Clearing the browser, or switching phones, starts you from zero. Save a backup file now and then; load it on the other device to carry on.',
             '你的进度只存在这台设备的浏览器里。清了浏览器数据、或者换手机，就会从零开始。隔一阵存一份备份文件；在另一台设备上读进去就能接着学。')}</p>
      <div class="stat-row">
        <div class="stat"><b>${wrong}</b><span>${t('wrong answers', '错题')}</span></div>
        <div class="stat"><b>${mocks}</b><span>${t('mocks', '模考')}</span></div>
        <div class="stat"><b>${chapters}</b><span>${t('chapters read', '已读章节')}</span></div>
        <div class="stat"><b>${n}</b><span>${t('records', '条记录')}</span></div>
      </div>
      <div class="btn-row">
        <button class="btn" id="dl">${t('Save backup file', '保存备份文件')}</button>
        <label class="btn secondary" style="cursor:pointer">${t('Load a backup file', '读入备份文件')}<input type="file" id="up" accept="application/json,.json" style="display:none" /></label>
      </div>
      <p class="tiny" id="msg" style="min-height:1.2em"></p>
      <p class="tiny muted">${t('The file holds your answers, scores and lesson progress — not passwords. Loading a file replaces what this browser has.',
                                '文件里是你的答题、成绩和听课进度，不含密码。读入会覆盖这台设备上现有的进度。')}</p>
    </div>`;
  const msg = el.querySelector('#msg');
  el.querySelector('#dl').onclick = () => {
    const blob = new Blob([JSON.stringify({ app: 'bcprep', v: 1, saved: new Date().toISOString(), data: collect() }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bcprep-progress-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    msg.textContent = t('Saved. Keep the file somewhere you will find it — cloud drive, email to yourself.', '已保存。把文件放在找得到的地方——网盘、发给自己的邮箱都行。');
  };
  el.querySelector('#up').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    let obj;
    try { obj = JSON.parse(await f.text()); } catch { msg.textContent = t('That is not a backup file.', '这不是备份文件。'); return; }
    if (!obj || obj.app !== 'bcprep' || typeof obj.data !== 'object') { msg.textContent = t('That is not a backup file.', '这不是备份文件。'); return; }
    const keys = Object.keys(obj.data).filter(ours);
    if (!keys.length) { msg.textContent = t('The file is empty.', '文件是空的。'); return; }
    if (!confirm(t(`Load ${keys.length} records from ${esc(obj.saved || '').slice(0, 10)} and replace this browser's progress?`,
                   `读入 ${keys.length} 条记录（${esc(obj.saved || '').slice(0, 10)} 保存的），覆盖这台设备上的进度？`))) return;
    for (const k of Object.keys(localStorage)) if (ours(k)) localStorage.removeItem(k);
    for (const k of keys) localStorage.setItem(k, obj.data[k]);
    msg.textContent = t('Loaded. Reloading…', '已读入，正在刷新…');
    setTimeout(() => location.reload(), 600);
  };
}
