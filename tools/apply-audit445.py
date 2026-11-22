#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Apply the 2026-11-22 audit of the four never-audited PCP parts (445 questions).

Reads tools/audit445/output-<part>.json (written by the auditors, see BRIEF.md):
  verdicts: [{id, verdict: keep|fix|delete, sourceRef?, why?, reason?}]  -- one per question, in order
  fixed:    [full question objects for every 'fix']

For each part: deleted questions go to tools/audit445/removed-<part>.json (with the reason),
fixed ones replace the original, kept ones get verified: true and the checked sourceRef.
Every surviving question must pass the schema contract below before anything is written.

Then two cross-checks the auditors could not do (each saw only its own part):
  * near-duplicates against the whole PCP bank (all parts),
  * answer-length giveaways that survived.

Usage: python tools/apply-audit445.py [--dry-run]
"""
import argparse
import difflib
import io
import json
import os
import re
import sys
from collections import Counter

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'tools', 'audit445')
PARTS_DIR = os.path.join(ROOT, 'data', 'written', 'parts')
PARTS = ['pcp-resp-cardiac', 'pcp-trauma-medical', 'pcp-assessment-populations', 'pcp-professional']

VALID_COG = {'knowledge', 'application', 'critical'}
VALID_POP = {'neonatal', 'pediatric', 'adult', 'geriatric', 'unclassified'}
VALID_DIFF = {'foundation', 'intermediate', 'advanced'}
VALID_AREA = set('ABCDEFGH')
REQ = ['id', 'licence', 'cpcfArea', 'cognitive', 'population', 'topic', 'difficulty', 'questionEn', 'questionZh',
       'options', 'answer', 'explanationEn', 'explanationZh', 'sourceRef']
CJK = re.compile(r'[一-鿿]')
# a sourceRef is comma/semicolon-separated pieces: "BC Guidelines p.49", "p.52", "p.14-15", "Nancy Ch 45", "Ch 20", "CPCF E2", "B3.1"
REF_BIT = re.compile(r'^(BC Guidelines p\.\d+(?:[-–]\d+)?|p\.\d+(?:[-–]\d+)?|Nancy Ch \d+(?:[-–/]\d+)?|Ch \d+(?:[-–/]\d+)?|CPCF [A-H]\d(?:\.\d+)*|[A-H]\d(?:\.\d+)*)$')
REF_LEAD = re.compile(r'^(BC Guidelines|Nancy Ch|CPCF)')


def check(q, orig):
    errs = []
    for k in REQ:
        if q.get(k) in (None, ''):
            errs.append('missing ' + k)
    if orig and (q.get('id') != orig['id'] or q.get('licence') != orig['licence']):
        errs.append('id/licence changed')
    if q.get('cpcfArea') not in VALID_AREA: errs.append('cpcfArea')
    if q.get('cognitive') not in VALID_COG: errs.append('cognitive')
    if q.get('population') not in VALID_POP: errs.append('population')
    if q.get('difficulty') not in VALID_DIFF: errs.append('difficulty')
    opts = q.get('options') or []
    if [o.get('key') for o in opts] != ['A', 'B', 'C', 'D']: errs.append('option keys')
    for o in opts:
        if not o.get('en') or not o.get('zh'): errs.append('option text ' + str(o.get('key')))
    if q.get('answer') not in ('A', 'B', 'C', 'D'): errs.append('answer')
    for k in ('questionZh', 'explanationZh'):
        if q.get(k) and not CJK.search(q[k]): errs.append(k + ' has no Chinese')
    if q.get('sourceRef'):
        bits = [b.strip() for b in re.split(r'[;,]', q['sourceRef']) if b.strip()]
        if not bits or not REF_BIT.match(bits[0]) or not REF_LEAD.match(bits[0]) or any(not REF_BIT.match(b) for b in bits):
            errs.append('sourceRef format: ' + q['sourceRef'])
    return errs


def norm(s):
    return re.sub(r'[^a-z0-9 ]', ' ', s.lower())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    totals = Counter()
    reasons = Counter()
    new_parts = {}
    bad = []
    for part in PARTS:
        src = json.load(open(os.path.join(PARTS_DIR, part + '.json'), encoding='utf-8'))
        out_path = os.path.join(AUD, 'output-' + part + '.json')
        if not os.path.exists(out_path):
            print(f'!! {part}: no output yet'); bad.append(part); continue
        out = json.load(open(out_path, encoding='utf-8'))
        verdicts = {v['id']: v for v in out.get('verdicts', [])}
        fixed = {q['id']: q for q in out.get('fixed', [])}
        ids = [q['id'] for q in src['questions']]
        missing = [i for i in ids if i not in verdicts]
        extra = [i for i in verdicts if i not in ids]
        if missing or extra:
            print(f'!! {part}: verdicts missing {missing[:8]}… extra {extra[:8]}'); bad.append(part); continue
        kept, removed = [], []
        for q in src['questions']:
            v = verdicts[q['id']]
            kind = v.get('verdict')
            totals[kind] += 1
            if kind == 'delete':
                removed.append({'reason': v.get('reason', ''), 'question': q})
                reasons[re.sub(r'[:：].*', '', v.get('reason', '?')).strip()[:24]] += 1
                continue
            if kind == 'fix':
                nq = fixed.get(q['id'])
                if not nq:
                    bad.append(f"{q['id']}: fix without fixed object"); continue
                nq = dict(nq)
            elif kind == 'keep':
                nq = dict(q)
                for k in ('sourceRef', 'competency', 'cpcfArea', 'population', 'cognitive', 'difficulty'):
                    if v.get(k): nq[k] = v[k]   # auditors may correct labels on a keep
            else:
                bad.append(f"{q['id']}: verdict {kind!r}"); continue
            nq['verified'] = True
            nq.pop('_part', None)
            errs = check(nq, q)
            if errs:
                bad.append(f"{q['id']} ({kind}): " + '; '.join(errs))
            kept.append(nq)
        new_parts[part] = (src, kept, removed)
        print(f'{part}: {len(src["questions"])} → keep {sum(1 for q in src["questions"] if verdicts[q["id"]]["verdict"] == "keep")}, '
              f'fix {len(fixed)}, delete {len(removed)} → {len(kept)} left')

    print('\nTOTAL', dict(totals), '\ndelete reasons', reasons.most_common())
    if bad:
        print('\n!! PROBLEMS (nothing written):'); [print('  ', b) for b in bad]
        return 1

    # cross-checks against the whole PCP-visible bank
    idx = json.load(open(os.path.join(ROOT, 'data', 'written', 'index.json'), encoding='utf-8'))
    others = []
    for p in idx['parts']:
        name = p[:-5]
        if name in new_parts: continue
        d = json.load(open(os.path.join(PARTS_DIR, p), encoding='utf-8'))
        others += [(name, q) for q in (d['questions'] if isinstance(d, dict) else d) if q.get('licence') in ('pcp', 'both')]
    survivors = [(p, q) for p, (_, kept, _) in new_parts.items() for q in kept]
    pool = others + survivors
    print('\nnear-duplicates (stem similarity ≥ 0.72):')
    nd, seen = 0, set()
    toks = {q['id']: set(norm(q['questionEn']).split()) for _, q in pool}
    for p1, q1 in survivors:
        s1, t1 = norm(q1['questionEn']), toks[q1['id']]
        for p2, q2 in pool:
            pair = tuple(sorted((q1['id'], q2['id'])))
            if q2['id'] == q1['id'] or pair in seen: continue
            t2 = toks[q2['id']]
            if not t1 or len(t1 & t2) / len(t1 | t2) < 0.45: continue   # cheap prefilter before difflib
            seen.add(pair)
            r = difflib.SequenceMatcher(None, s1, norm(q2['questionEn'])).ratio()
            if r >= 0.72:
                nd += 1
                print(f"  {r:.2f} {q1['id']} ~ {q2['id']} ({p2}): {q1['questionEn'][:90]}")
    print('  none' if not nd else f'  {nd} pair(s)')
    print('\nanswer-length giveaways left (correct option ≥1.45× the longest distractor):')
    lg = 0
    for p, q in survivors:
        L = {o['key']: len(o['en']) for o in q['options']}
        right = L[q['answer']]; rest = max(v for k, v in L.items() if k != q['answer'])
        if right >= 1.45 * rest and right - rest > 25:
            lg += 1; print(f"  {q['id']}: {right} vs {rest}")
    print('  none' if not lg else f'  {lg}')
    pos = Counter(q['answer'] for _, q in survivors)
    print('\nanswer position spread:', dict(sorted(pos.items())))

    if a.dry_run:
        print('\n(dry run: nothing written)'); return 0
    for part, (src, kept, removed) in new_parts.items():
        src['questions'] = kept
        src['meta']['count'] = len(kept)
        src['meta']['audited'] = True
        src['meta']['auditNote'] = ('Audited question by question 2026-11-22 against the BC Provincial Examination Guidelines (June 2026), '
                                    'BC drug monographs and the Nancy Caroline text; failures removed (tools/audit445/removed-' + part + '.json).')
        json.dump(src, open(os.path.join(PARTS_DIR, part + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        json.dump({'part': part, 'removed': removed}, open(os.path.join(AUD, 'removed-' + part + '.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
    print('\nwritten.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
