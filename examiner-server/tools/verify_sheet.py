# -*- coding: utf-8 -*-
"""Acceptance gates for simulation sheets.

Usage: python examiner-server/tools/verify_sheet.py md-02 [tr-01 ...]
Exit 1 on any hard failure.

Gates:
  1. schema — every required slot filled, English only, no leftover '_' author fields
  2. expected items — every item has >=3 triggers, itemId exists in rubric.json
  3. protocolRules — check names valid; errorEn is a verbatim rubric string for itemId+weight
  4. numbers — every number in the sheet appears in the source scenario or the BC guidelines
  5. consistency — primary-survey pulse/resp agree with vitals set 1; unlock refs point at known events
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHEETS = os.path.join(ROOT, 'examiner-server', 'sheets')
RUBRIC = json.load(io.open(os.path.join(ROOT, 'data', 'practical', 'rubric.json'), encoding='utf-8'))
ITEMS = {it['id']: it for s in RUBRIC['sections'] for it in s['items']}
CHECKS = {'present', 'absent', 'ordered', 'max_count', 'before_each', 'within_after'}
GUIDE = os.path.join(r'D:\Claude\bcexam-sources', 'bc-exam-guidelines.txt')

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def load_scenario(ref):
    path, sid = ref.split('#')
    d = json.load(io.open(os.path.join(ROOT, path), encoding='utf-8'))
    return next(s for s in d['scenarios'] if s['id'] == sid)


def strings(o, out=None):
    out = [] if out is None else out
    if isinstance(o, dict):
        for k, v in o.items():
            strings(v, out)
    elif isinstance(o, list):
        for x in o:
            strings(x, out)
    elif isinstance(o, str):
        out.append(o)
    return out


def numbers(text):
    return {m.group(0).replace(',', '') for m in re.finditer(r'\d[\d,]*\.?\d*', text)}


SKIP_NUMS = {str(n) for n in range(0, 16)} | {'20', '24', '25', '30', '40', '45', '50', '60', '100', '911', '15'}


def verify(sid):
    fp = os.path.join(SHEETS, sid + '.json')
    if not os.path.exists(fp):
        print(f'{sid}: FILE MISSING {fp}'); return False
    sh = json.load(io.open(fp, encoding='utf-8'))
    errs, warns = [], []

    # gate 1: schema
    for k in ('id', 'titleEn', 'type', 'priority', 'sourceScenario', 'patient', 'scene', 'dispatchEn', 'arrivalEn', 'firstLookEn',
              'primary', 'history', 'findings', 'vitalsSets', 'expected', 'drugs', 'majorMoves', 'protocolRules',
              'notificationFacts', 'handoffFacts', 'pcrFacts', 'examinerPrompts', 'sourcePages'):
        if k not in sh or sh[k] in ('', None, [], {}):
            errs.append(f'missing/empty top-level {k}')
    for k in list(sh.keys()):
        if k.startswith('_'):
            errs.append(f'leftover author field {k} (delete it)')
    for sect in ('patient', 'primary', 'findings'):
        for k, v in (sh.get(sect) or {}).items():
            if v in ('', None) and k not in ('bgl', 'temp'):
                errs.append(f'{sect}.{k} empty')
    h = sh.get('history') or {}
    for k in ('ccEn', 'painScoreEn'):
        if not h.get(k): errs.append(f'history.{k} empty')
    for grp in ('opqrst', 'sample', 'fe'):
        for k, v in (h.get(grp) or {}).items():
            if not v: errs.append(f'history.{grp}.{k} empty')
    if not (sh.get('scene') or {}).get('equipmentEn'): errs.append('scene.equipmentEn empty')
    cjk = [s for s in strings(sh) if re.search(r'[\u4e00-\u9fff]', s)]
    if cjk: errs.append(f'{len(cjk)} strings contain Chinese (sheet must be English)')

    # gate 2: expected
    for e in sh.get('expected', []):
        if e.get('itemId') not in ITEMS: errs.append(f'expected item unknown rubric id {e.get("itemId")!r}: {e.get("actionEn","")[:50]}')
        if len(e.get('triggers') or []) < 3: errs.append(f'expected item needs >=3 triggers: {e.get("actionEn","")[:60]}')
        if e.get('weight') not in ITEMS.get(e.get('itemId'), {}).get('weights', [e.get('weight')]):
            warns.append(f'weight {e.get("weight")} not one of rubric weights for {e.get("itemId")}')

    # gate 3: protocolRules
    known_events = set(ITEMS) | {f"drug:{d['key']}" for d in sh.get('drugs', [])} | {f'move:{m}' for m in sh.get('majorMoves', [])} \
        | {se['key'] for se in sh.get('specialEvents', [])} | {f'vitals-set-{i}-complete' for i in range(1, 5)} | {'transport:rtc', 'transport:non-rtc', 'notification', 'handoff'}
    for r in sh.get('protocolRules', []):
        if r.get('check') not in CHECKS: errs.append(f'rule {r.get("id")}: unknown check {r.get("check")}')
        for key in ('event', 'first', 'then', 'requires', 'after'):
            if key in r and r[key] not in known_events: errs.append(f'rule {r.get("id")}: unknown event {r[key]!r} in {key}')
        d = r.get('deduct') or {}
        it = ITEMS.get(d.get('itemId'))
        if not it: errs.append(f'rule {r.get("id")}: deduct.itemId unknown'); continue
        bucket = next((b for b in it['errorsByWeight'] if b['weight'] == d.get('weight')), None)
        if not bucket: errs.append(f'rule {r.get("id")}: weight {d.get("weight")} not valid for {d.get("itemId")} {it["weights"]}'); continue
        if d.get('errorEn') not in bucket['errorsEn']:
            errs.append(f'rule {r.get("id")}: errorEn is not a verbatim rubric string for {d.get("itemId")}@{d.get("weight")}')

    # gate 4: numbers traceable
    sc = load_scenario(sh['sourceScenario'])
    hay = json.dumps(sc, ensure_ascii=False)
    if os.path.exists(GUIDE):
        hay += io.open(GUIDE, encoding='utf-8', errors='replace').read()
    hay = re.sub(r'\s+', ' ', hay)
    hay_nc = hay.replace(',', '').replace(' ', '')
    untraced = set()
    for s in strings(sh):
        for n in numbers(s):
            if n in SKIP_NUMS or len(n) < 2: continue
            if n not in hay and n not in hay_nc: untraced.add(n)
    if untraced: warns.append('untraced numbers (confirm each): ' + ', '.join(sorted(untraced)))

    # gate 5: consistency
    vs = sh.get('vitalsSets') or []
    if vs:
        v1 = vs[0]
        p = sh.get('primary') or {}
        pr = str(v1.get('pulse', {}).get('rate'))
        rr = str(v1.get('resp', {}).get('rate'))
        if pr not in (p.get('circulationEn') or ''): warns.append(f'primary.circulationEn does not mention set-1 pulse rate {pr}')
        if rr not in (p.get('breathingEn') or ''): warns.append(f'primary.breathingEn does not mention set-1 resp rate {rr}')
        for v in vs:
            for need in ('bp', 'pulse', 'resp', 'skin', 'pupils', 'spo2', 'gcs'):
                if v.get(need) in ('', None): errs.append(f'vitals set {v.get("set")}: {need} empty')
            if not v['pulse'].get('rhythm') or not v['pulse'].get('strength'): errs.append(f'vitals set {v.get("set")}: pulse rhythm/strength empty')
            if not v['resp'].get('depth') or not v['resp'].get('character'): errs.append(f'vitals set {v.get("set")}: resp depth/character empty')
            u = v.get('unlock') or {}
            for cond in (u.get('anyOf') or []) + (u.get('allOf') or []) + ([u] if ('afterEvent' in u) else []):
                ev = cond.get('afterEvent')
                if ev and ev not in known_events: errs.append(f'vitals set {v.get("set")}: unlock refers to unknown event {ev!r}')
    for sc_ in sh.get('stateChanges', []):
        for ev in ((sc_.get('when') or {}).get('missingEvent'), (sc_.get('when') or {}).get('afterEvent')):
            if ev and ev not in known_events: errs.append(f'stateChange {sc_.get("id")}: unknown event {ev!r}')

    n_exp = len(sh.get('expected', []))
    print(f'\n{"="*70}\n{sid}  {sh.get("titleEn","?")}\n  expected={n_exp} rules={len(sh.get("protocolRules",[]))} drugs={len(sh.get("drugs",[]))} vitalsSets={len(vs)} stateChanges={len(sh.get("stateChanges",[]))}')
    for w in warns: print('  WARN', w)
    for e in errs: print('  ERR ', e)
    print('  ' + ('PASS' if not errs else f'FAIL ({len(errs)} errors)'))
    return not errs


if __name__ == '__main__':
    ok = all([verify(s) for s in sys.argv[1:]])
    sys.exit(0 if ok else 1)
