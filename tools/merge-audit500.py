#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Merge the audited external CPCF-500 batches into one bank part.

Reads tools/audit500/output-*.json (each: {meta, verdicts, questions}) and writes
data/written/parts/cpcf500-audited.json plus an audit trail of what was dropped.

Enforces the project's schema contract before anything reaches the app, and
cross-batch dedupes: the five auditors could only see their own 100 questions,
so a concept cloned across batch boundaries survives their review.

Usage: python tools/merge-audit500.py [--dry-run]
"""
import json
import os
import re
import sys
import io
import argparse
from collections import Counter, defaultdict

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD = os.path.join(ROOT, 'tools', 'audit500')

VALID_COG = {'knowledge', 'application', 'critical'}
VALID_POP = {'neonatal', 'pediatric', 'adult', 'geriatric', 'unclassified'}
VALID_DIFF = {'foundation', 'intermediate', 'advanced'}
VALID_AREA = set('ABCDEFGH')

# Manual trims decided on review of the merged set. The five auditors each saw
# only their own 100 questions, so concept clusters that formed across batch
# boundaries survived — and one pair taught contradictory actions.
MANUAL_DROP = {
    'c500-107': 'MCI triage: same concept as c500-392 (apneic/unresponsive → Immediate), kept once',
    'c500-133': 'MCI triage: same concept as c500-392, kept once',
    'c500-267': 'scene safety: strong chemical odour answered "don PPE and approach", while '
                'c500-183 answers "keep distance, request HazMat" for the same cue — kept the '
                'unambiguous one rather than teaching two responses to one clue',
    'c500-313': 'scene safety: third "hazard → retreat and request specialists" variant, redundant '
                'with c500-231',
    'c500-232': 'fatigue: giveaway — the three distractors (patient age, equipment complexity, backup '
                'availability) are not about the medic\'s own fitness at all',
    'c500-444': 'fatigue: near-identical to c500-334 (same stem shape, same caffeine and '
                'request-transfer distractors), kept the application-level one',
}

ap = argparse.ArgumentParser()
ap.add_argument('--dry-run', action='store_true')
args = ap.parse_args()

kept, verdicts, problems, manual_dropped = [], [], [], []
seen_ids = set()
for i in range(1, 6):
    p = os.path.join(AUD, f'output-{i}.json')
    if not os.path.exists(p):
        print(f'  batch {i}: MISSING (not finished yet)')
        continue
    d = json.load(io.open(p, encoding='utf-8'))
    vs = d.get('verdicts', [])
    qs = d.get('questions', [])
    verdicts.extend(vs)
    nkeep = sum(1 for v in vs if v.get('verdict') == 'keep')
    if nkeep != len(qs):
        problems.append(f'batch {i}: {nkeep} keep verdicts but {len(qs)} questions supplied')
    for q in qs:
        qid = q.get('id')
        if qid in seen_ids:
            problems.append(f'duplicate question id {qid}')
            continue
        seen_ids.add(qid)
        if qid in MANUAL_DROP:
            manual_dropped.append(qid)
            continue
        # schema contract
        if q.get('cognitive') not in VALID_COG: problems.append(f'{qid}: cognitive {q.get("cognitive")!r}')
        if q.get('population') not in VALID_POP: problems.append(f'{qid}: population {q.get("population")!r}')
        if q.get('difficulty') not in VALID_DIFF: problems.append(f'{qid}: difficulty {q.get("difficulty")!r}')
        if q.get('cpcfArea') not in VALID_AREA: problems.append(f'{qid}: cpcfArea {q.get("cpcfArea")!r}')
        opts = q.get('options', [])
        if sorted(o.get('key') for o in opts) != ['A', 'B', 'C', 'D']:
            problems.append(f'{qid}: option keys')
        for o in opts:
            if not o.get('en') or not o.get('zh'): problems.append(f'{qid}: option {o.get("key")} not bilingual')
        if q.get('answer') not in [o.get('key') for o in opts]: problems.append(f'{qid}: answer not among options')
        for f in ('questionEn', 'questionZh', 'explanationEn', 'explanationZh', 'sourceRef'):
            if not q.get(f): problems.append(f'{qid}: missing {f}')
        # no invented page numbers
        sr = q.get('sourceRef', '')
        m = re.match(r'BC Guidelines p\.(\d+)', sr)
        if m and not (1 <= int(m.group(1)) <= 94):
            problems.append(f'{qid}: sourceRef page {m.group(1)} out of range')
        elif not m and not sr.startswith('CPCF'):
            problems.append(f'{qid}: sourceRef format {sr!r}')
        kept.append(q)


# cross-batch dedupe: auditors only saw their own 100, so clones can slip through
def sig(q):
    s = re.sub(r'[^a-z ]', ' ', q['questionEn'].lower())
    return (q.get('topic'), ' '.join(sorted(set(w for w in s.split() if len(w) > 4))[:12]))
groups = defaultdict(list)
for q in kept:
    groups[sig(q)].append(q)
cross_dups = []
final = []
for g in groups.values():
    final.append(g[0])
    for extra in g[1:]:
        cross_dups.append(extra['id'])

print(f'\nbatches merged     : {sum(1 for i in range(1,6) if os.path.exists(os.path.join(AUD, f"output-{i}.json")))}/5')
print(f'verdicts total     : {len(verdicts)}  (keep {sum(1 for v in verdicts if v.get("verdict")=="keep")}, '
      f'delete {sum(1 for v in verdicts if v.get("verdict")=="delete")})')
print(f'questions supplied : {len(kept)}')
print(f'manual trims       : {len(manual_dropped)} {manual_dropped}')
print(f'cross-batch dupes  : {len(cross_dups)} dropped {cross_dups[:12]}')
print(f'FINAL              : {len(final)}')
if final:
    print('\n  cpcfArea  :', dict(sorted(Counter(q["cpcfArea"] for q in final).items())))
    print('  cognitive :', dict(Counter(q["cognitive"] for q in final)))
    print('  population:', dict(Counter(q["population"] for q in final)))
    print('  answers   :', dict(sorted(Counter(q["answer"] for q in final).items())))
    srcs = Counter('BC page' if q['sourceRef'].startswith('BC') else 'CPCF' for q in final)
    print('  sourceRef :', dict(srcs))

if problems:
    print(f'\n  {len(problems)} SCHEMA PROBLEM(S) — not writing:')
    for p in problems[:20]: print('    ✗', p)
    sys.exit(1)

if args.dry_run:
    print('\n(dry run — nothing written)')
    sys.exit(0)

out = os.path.join(ROOT, 'data', 'written', 'parts', 'cpcf500-audited.json')
json.dump({'meta': {'part': 'cpcf500-audited', 'count': len(final), 'licence': 'pcp',
                    'source': 'External CPCF-500 bank, audited question by question against the BC '
                              'Provincial Examination Guidelines; survivors translated, given '
                              'bilingual rationales and source pages, and cross-batch deduped.',
                    'audited': True},
           'questions': final},
          io.open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump({'verdicts': verdicts, 'crossBatchDuplicatesDropped': cross_dups,
           'manualTrims': {k: MANUAL_DROP[k] for k in manual_dropped}},
          io.open(os.path.join(AUD, 'verdicts-merged.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print(f'\nwrote {os.path.relpath(out, ROOT)}  ({len(final)} questions)')
