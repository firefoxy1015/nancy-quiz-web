#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Apply audit verdicts (tools/audit/*.json) to the question bank parts:
delete every question whose verdict is 'delete', attach sourcePage where the
auditors supplied one, and stamp survivors verified: true.

Deleted questions are preserved in tools/audit/removed-<part>.json so nothing
is lost irrecoverably.

Usage: python tools/apply-audit.py   (from repo root)
"""
import json
import os
import sys
import io
from collections import Counter

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIT = os.path.join(ROOT, 'tools', 'audit')

verdicts = {}
reasons = Counter()
pages = {}
for f in sorted(os.listdir(AUDIT)):
    if not f.endswith('.json') or f.startswith('removed-'):
        continue
    d = json.load(open(os.path.join(AUDIT, f), encoding='utf-8'))
    for v in d.get('verdicts', []):
        verdicts[v['id']] = v['verdict']
        if v['verdict'] == 'delete':
            reasons[(v.get('reason') or '?')[:40]] += 1
        if v.get('sourcePage'):
            pages[v['id']] = v['sourcePage']
print(f"verdicts loaded: {len(verdicts)} "
      f"(keep {sum(1 for x in verdicts.values() if x == 'keep')}, "
      f"delete {sum(1 for x in verdicts.values() if x == 'delete')})")

for part in ('nancy-foundation.json', 'bc-guidelines-v1.json'):
    path = os.path.join(ROOT, 'data', 'written', 'parts', part)
    d = json.load(open(path, encoding='utf-8'))
    before = len(d['questions'])
    removed = [q for q in d['questions'] if verdicts.get(q['id']) == 'delete']
    kept = [q for q in d['questions'] if verdicts.get(q['id']) != 'delete']
    unaudited = sum(1 for q in kept if q['id'] not in verdicts)
    for q in kept:
        if q['id'] in verdicts:
            q['verified'] = True
        if q['id'] in pages:
            q['sourceRef'] = f"BC Guidelines p.{pages[q['id']]}"
    d['questions'] = kept
    d['meta']['count'] = len(kept)
    d['meta']['audited'] = True
    json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if removed:
        json.dump({'part': part, 'removed': removed},
                  open(os.path.join(AUDIT, 'removed-' + part), 'w', encoding='utf-8'),
                  ensure_ascii=False, indent=1)
    print(f"{part}: {before} -> {len(kept)} (deleted {len(removed)}, unaudited kept {unaudited})")

print('\ntop delete reasons:')
for r, n in reasons.most_common(12):
    print(f'  {n:4d}  {r}')
