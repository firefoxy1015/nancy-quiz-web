#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
BC EMR/PCP Exam Prep — content validation.

Checks every data file the app loads: JSON validity, schema contracts the
JS engines depend on, bilingual completeness, blueprint coverage for mock
exam generation, and answer-key balance.

Usage:  python tools/validate.py            (from repo root)
        python tools/validate.py --verbose
"""
import json
import os
import sys
import io
import argparse
from collections import Counter, defaultdict

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors, warnings, notes = [], [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def note(msg):
    notes.append(msg)


def load(rel, required=True):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        (err if required else warn)(f"MISSING FILE: {rel}")
        return None
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        err(f"INVALID JSON: {rel} — {e}")
        return None


def bilingual(obj, en_key, zh_key, ctx):
    """Both language fields present and non-empty."""
    en, zh = obj.get(en_key), obj.get(zh_key)
    if not en:
        err(f"{ctx}: missing/empty {en_key}")
    if not zh:
        err(f"{ctx}: missing/empty {zh_key}")


# ---------------------------------------------------------------- written
VALID_LICENCE = {'emr', 'pcp', 'both'}
VALID_AREA = set('ABCDEFGH')
VALID_COG = {'knowledge', 'application', 'critical', 'unclassified'}
VALID_POP = {'neonatal', 'pediatric', 'adult', 'geriatric', 'unclassified'}
VALID_DIFF = {'foundation', 'intermediate', 'advanced'}


def check_written():
    print('\n' + '=' * 70)
    print('WRITTEN QUESTION BANKS')
    print('=' * 70)
    idx = load('data/written/index.json')
    if not idx:
        return []
    all_q, seen_ids = [], set()
    for part_file in idx['parts']:
        rel = 'data/written/parts/' + part_file
        data = load(rel, required=False)
        if not data:
            continue
        qs = data.get('questions', [])
        declared = data.get('meta', {}).get('count')
        if declared is not None and declared != len(qs):
            warn(f"{part_file}: meta.count={declared} but {len(qs)} questions present")
        bad = 0
        for q in qs:
            qid = q.get('id', '?')
            ctx = f"{part_file}:{qid}"
            if qid in seen_ids:
                err(f"{ctx}: duplicate question id")
                bad += 1
            seen_ids.add(qid)
            if q.get('licence') not in VALID_LICENCE:
                err(f"{ctx}: bad licence {q.get('licence')!r}")
                bad += 1
            if q.get('cpcfArea') not in VALID_AREA:
                warn(f"{ctx}: bad cpcfArea {q.get('cpcfArea')!r}")
            if q.get('cognitive') not in VALID_COG:
                warn(f"{ctx}: bad cognitive {q.get('cognitive')!r}")
            if q.get('population') not in VALID_POP:
                warn(f"{ctx}: bad population {q.get('population')!r}")
            if q.get('difficulty') not in VALID_DIFF:
                warn(f"{ctx}: bad difficulty {q.get('difficulty')!r}")
            bilingual(q, 'questionEn', 'questionZh', ctx)
            opts = q.get('options', [])
            if len(opts) != 4:
                err(f"{ctx}: {len(opts)} options (need 4)")
                bad += 1
            keys = [o.get('key') for o in opts]
            if sorted(k for k in keys if k) != ['A', 'B', 'C', 'D']:
                err(f"{ctx}: option keys {keys} (need A-D)")
                bad += 1
            for o in opts:
                if not o.get('en'):
                    err(f"{ctx}: option {o.get('key')} missing en")
                if not o.get('zh'):
                    err(f"{ctx}: option {o.get('key')} missing zh")
            if q.get('answer') not in keys:
                err(f"{ctx}: answer {q.get('answer')!r} not among options")
                bad += 1
            if not q.get('explanationEn') or not q.get('explanationZh'):
                warn(f"{ctx}: incomplete bilingual explanation")
            # duplicate option text = broken question
            texts = [str(o.get('en', '')).strip().lower() for o in opts]
            if len(set(texts)) != len(texts):
                err(f"{ctx}: duplicate option text")
                bad += 1
        ans = Counter(q.get('answer') for q in qs)
        skew = ''
        if qs:
            top = ans.most_common(1)[0]
            pct = top[1] / len(qs) * 100
            if pct > 40:
                skew = f"  ⚠ answer skew: {top[0]}={pct:.0f}%"
                warn(f"{part_file}: answer key skewed — {top[0]} is {pct:.0f}% of answers")
        status = 'OK' if bad == 0 else f'{bad} errors'
        print(f"  {part_file:38s} {len(qs):4d} q  [{status}]{skew}")
        all_q.extend(qs)
    print(f"\n  TOTAL POOL: {len(all_q)} questions")
    return all_q


def check_blueprint(all_q):
    print('\n' + '=' * 70)
    print('BLUEPRINT COVERAGE (mock exam generation capacity)')
    print('=' * 70)
    bp = load('data/meta/cpcf-blueprint.json')
    if not bp:
        return
    # PCP: engine samples A8 B10 C10 D6 E10 F10 G6 H120 = 180
    targets = {'A': 8, 'B': 10, 'C': 10, 'D': 6, 'E': 10, 'F': 10, 'G': 6, 'H': 120}
    for track in ('pcp', 'emr'):
        pool = [q for q in all_q if q.get('licence') in (track, 'both')]
        print(f"\n  {track.upper()} pool: {len(pool)} questions")
        if track == 'pcp':
            by_area = Counter(q.get('cpcfArea') for q in pool)
            worst = None
            for area, need in targets.items():
                have = by_area.get(area, 0)
                sets = have // need if need else 0
                flag = '✓' if have >= need else '✗ SHORT'
                if worst is None or sets < worst[1]:
                    worst = (area, sets)
                print(f"    Area {area}: have {have:4d} / need {need:3d} per mock  "
                      f"→ {sets} non-repeating set(s)  {flag}")
                if have < need:
                    err(f"PCP blueprint: Area {area} has {have} questions, "
                        f"needs {need} for one full mock")
            note(f"PCP can generate {worst[1]} fully non-repeating blueprint mock(s) "
                 f"(limited by Area {worst[0]})")
        else:
            need = 200
            sets = len(pool) // need
            print(f"    EMR mock needs {need} q/exam → {sets} non-repeating set(s)")
            if len(pool) < need:
                err(f"EMR: only {len(pool)} questions, needs {need} for one full mock")
        # distribution vs blueprint intent — classified questions only
        # (migrated legacy content was never assessed against the blueprint)
        classified = [q for q in pool if q.get('cognitive') != 'unclassified']
        skipped = len(pool) - len(classified)
        cog = Counter(q.get('cognitive') for q in classified)
        pop = Counter(q.get('population') for q in classified)
        tot = len(classified) or 1
        suffix = f"  (of {len(classified)} classified; {skipped} legacy excluded)" if skipped else ''
        print(f"    cognitive: " + ', '.join(
            f"{k}={cog.get(k,0)*100//tot}%" for k in ('knowledge', 'application', 'critical')) + suffix)
        print(f"    population: " + ', '.join(
            f"{k}={pop.get(k,0)*100//tot}%" for k in ('adult', 'geriatric', 'pediatric', 'neonatal')))
        want_ger = 35 if track == 'pcp' else 25
        got_ger = pop.get('geriatric', 0) * 100 // tot
        if got_ger < want_ger - 12:
            warn(f"{track.upper()}: geriatric questions {got_ger}% vs blueprint target ~{want_ger}%")


# -------------------------------------------------------------- practical
PHASE_ORDER = ['dispatch', 'scene', 'primary', 'transport', 'history',
               'vitals', 'fe', 'exam', 'interventions', 'ongoing', 'handoff']


def check_scenarios():
    print('\n' + '=' * 70)
    print('PRACTICAL SCENARIOS')
    print('=' * 70)
    data = load('data/practical/scenarios.json', required=False)
    if not data:
        print('  (not yet generated)')
        return
    scs = data.get('scenarios', [])
    types = Counter(s.get('type') for s in scs)
    prio = Counter(s.get('priority') for s in scs)
    for s in scs:
        sid = s.get('id', '?')
        ctx = f"scenario {sid}"
        if s.get('type') not in ('medical', 'trauma'):
            err(f"{ctx}: bad type {s.get('type')!r}")
        if s.get('priority') not in ('rtc', 'non-rtc'):
            err(f"{ctx}: bad priority {s.get('priority')!r}")
        bilingual(s, 'titleEn', 'titleZh', ctx)
        bilingual(s, 'dispatchEn', 'dispatchZh', ctx)
        bilingual(s, 'handoffModelEn', 'handoffModelZh', ctx)
        phases = s.get('phases', [])
        ids = [p.get('id') for p in phases]
        missing = [p for p in PHASE_ORDER if p not in ids]
        if missing:
            err(f"{ctx}: missing phases {missing}")
        extra = [p for p in ids if p not in PHASE_ORDER]
        if extra:
            warn(f"{ctx}: unknown phases {extra}")
        if ids != [p for p in PHASE_ORDER if p in ids]:
            warn(f"{ctx}: phases out of canonical order")
        for p in phases:
            pctx = f"{ctx}/{p.get('id')}"
            for ex in p.get('expected', []):
                if not ex.get('actionEn') or not ex.get('actionZh'):
                    err(f"{pctx}: expected action missing bilingual text")
                w = ex.get('weight')
                if not isinstance(w, (int, float)) or w <= 0:
                    err(f"{pctx}: bad weight {w!r}")
        # history phase must cover the six official items
        hist = next((p for p in phases if p.get('id') == 'history'), None)
        if hist:
            blob = ' '.join(str(e.get('actionEn', '')).lower() for e in hist.get('expected', []))
            for kw, label in [('chief', 'chief complaint'), ('histor', 'Hx of C/C'),
                              ('medic', 'medications'), ('allerg', 'allergies'),
                              ('oral intake', 'last oral intake')]:
                if kw not in blob:
                    warn(f"{ctx}/history: no expected action mentions {label}")
        vs = s.get('vitalsSets', [])
        if len(vs) < 2:
            warn(f"{ctx}: only {len(vs)} vitals set(s) — ongoing phase needs a second")
        if not s.get('pcrKeyPoints'):
            warn(f"{ctx}: no pcrKeyPoints for PCR practice")
    print(f"  {len(scs)} scenarios — {dict(types)} · {dict(prio)}")
    if types.get('medical', 0) < 8 or types.get('trauma', 0) < 8:
        note(f"target is 8 medical + 8 trauma; have {types.get('medical',0)} + {types.get('trauma',0)}")


def check_rubric_links():
    print('\n' + '=' * 70)
    print('RUBRIC / STUDY CROSS-REFERENCES')
    print('=' * 70)
    rub = load('data/practical/rubric.json')
    drugs = load('data/study/drugs.json')
    prot = load('data/study/protocols.json')
    if rub:
        n_items = sum(len(s.get('items', [])) for s in rub.get('sections', []))
        print(f"  rubric: {len(rub.get('sections', []))} sections, {n_items} items, "
              f"{len(rub.get('autoFails', []))} auto-fails")
        if not rub.get('autoFails'):
            err('rubric.json: autoFails list empty (auto-fail flashcards need it)')
        if not rub.get('timingRules'):
            err('rubric.json: timingRules missing (scenario timers reference it)')
    if drugs and prot:
        dids = {d['id'] for d in drugs['drugs']}
        refs = set()
        for p in prot['protocols']:
            refs.update(p.get('drugs', []))
        dangling = sorted(refs - dids)
        if dangling:
            err(f"protocols.json: drug ids not in drugs.json → {dangling}")
        else:
            print(f"  protocol→drug links: all {len(refs)} refs resolve ✓")
        print(f"  drugs: {len(dids)} monographs · protocols: {len(prot['protocols'])}")
    # scenario rubricRef sanity
    scs = load('data/practical/scenarios.json', required=False)
    if scs and rub:
        item_ids = {it['id'] for s in rub.get('sections', []) for it in s.get('items', [])}
        used = set()
        for s in scs.get('scenarios', []):
            for p in s.get('phases', []):
                for ex in p.get('expected', []):
                    if ex.get('rubricRef'):
                        used.add(ex['rubricRef'])
        unknown = sorted(used - item_ids)
        if unknown:
            warn(f"scenarios reference rubric items not in rubric.json: {unknown[:10]}")
        else:
            print(f"  scenario→rubric links: all {len(used)} refs resolve ✓")


def check_other():
    print('\n' + '=' * 70)
    print('STUDY & JURISPRUDENCE')
    print('=' * 70)
    for rel, key, label in [
        ('data/study/treatments.json', 'treatments', 'treatments'),
        ('data/study/assessment-model.json', 'phases', 'assessment phases'),
        ('data/study/reference.json', 'abbreviations', 'abbreviations'),
        ('data/jurisprudence/notes.json', 'sections', 'juris note sections'),
    ]:
        d = load(rel)
        if d:
            print(f"  {label}: {len(d.get(key, []))}")
    jb = load('data/jurisprudence/bank.json')
    if jb:
        qs = jb['questions']
        ans = Counter(q.get('answer') for q in qs)
        topics = Counter(q.get('topic') for q in qs)
        print(f"  jurisprudence questions: {len(qs)}  answers={dict(sorted(ans.items()))}")
        print(f"    topics: {dict(topics)}")
        if len(qs) < 25:
            err(f"jurisprudence bank has {len(qs)} questions, mock exam needs 25")
        for q in qs:
            if not q.get('sourceRef'):
                warn(f"juris {q.get('id')}: no sourceRef (every question must cite legislation)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--verbose', '-v', action='store_true')
    args = ap.parse_args()

    all_q = check_written()
    check_blueprint(all_q)
    check_scenarios()
    check_rubric_links()
    check_other()

    print('\n' + '=' * 70)
    print('SUMMARY')
    print('=' * 70)
    for n in notes:
        print(f"  · {n}")
    limit = None if args.verbose else 15
    if warnings:
        print(f"\n  {len(warnings)} WARNING(S)" + ('' if args.verbose else ' (showing first 15, -v for all)'))
        for w in warnings[:limit]:
            print(f"    ⚠ {w}")
    if errors:
        print(f"\n  {len(errors)} ERROR(S)" + ('' if args.verbose else ' (showing first 15, -v for all)'))
        for e in errors[:limit]:
            print(f"    ✗ {e}")
        print('\n  RESULT: FAIL\n')
        return 1
    print('\n  RESULT: PASS (no blocking errors)\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
