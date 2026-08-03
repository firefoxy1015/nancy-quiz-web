#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Regenerate data/written/parts/nancy-foundation.json from the v1 chapter bank.

Another session keeps authoring chapter questions in the old v1 format
(v1/data/question-bank.json, sometimes a root-level question-bank.json).
The v2 app never reads those files — run this after they change so the new
questions actually reach the practice/mock engines.

- Maps chapters to CPCF areas by title keywords
- Tags cognitive/population as 'unclassified' (never assessed vs blueprint)
- Shuffles option positions with a fixed seed so answer keys stay balanced
- Preserves stable ids (nancy-<v1 id>) so the wrong-answer book survives

Usage: python tools/sync-v1-bank.py   (from repo root)
"""
import json
import os
import random
import re
import sys
import io
from collections import Counter

if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# newest of the two possible v1 bank locations wins
candidates = [os.path.join(ROOT, 'question-bank.json'),
              os.path.join(ROOT, 'v1', 'data', 'question-bank.json'),
              os.path.join(ROOT, 'v1', 'question-bank.json')]
sources = [(p, os.path.getmtime(p)) for p in candidates if os.path.exists(p)]
if not sources:
    print('no v1 bank found'); sys.exit(1)
src = max(sources, key=lambda x: x[1])[0]
print('source:', os.path.relpath(src, ROOT))

nb = json.load(open(src, encoding='utf-8'))
chap_titles = {c['id']: c.get('titleEn', '') for c in nb.get('chapters', [])}


def area_for(title):
    t = title.lower()
    if any(k in t for k in ['ems systems', 'roles', 'medical and legal', 'ethical']):
        return 'A'
    if any(k in t for k in ['communication', 'documentation', 'records']):
        return 'B'
    if 'well-being' in t:
        return 'E'
    if 'illness and injury prevention' in t:
        return 'F'
    if any(k in t for k in ['ambulance operations', 'incident', 'rescue', 'hazardous', 'terrorism', 'crime scene']):
        return 'G'
    return 'H'


def topic_for(title):
    t = re.sub(r'^[\s\d—-]+', '', title.lower().replace('chapter', ''))
    return re.sub(r'[^a-z0-9]+', '-', t)[:40].strip('-') or 'general'


random.seed(20260725)
out = []
for q in nb.get('questions', []):
    title = chap_titles.get(q.get('chapterId'), '')
    opts = [dict(o) for o in q.get('options', [])]
    answer = q.get('answer')
    # shuffle option contents across keys, tracking where the right one lands
    correct = next((o for o in opts if o.get('key') == answer), None)
    if correct and len(opts) >= 2:
        c_en, c_zh = str(correct.get('en', '')), str(correct.get('zh', ''))
        contents = [(str(o.get('en', '')), str(o.get('zh', ''))) for o in opts]
        random.shuffle(contents)
        for o, (en, zh) in zip(opts, contents):
            o['en'], o['zh'] = en, zh
        answer = next(o['key'] for o in opts if o['en'] == c_en and o['zh'] == c_zh)
    out.append({
        'id': 'nancy-' + str(q.get('id')), 'source': 'nancy', 'licence': 'both',
        'cpcfArea': area_for(title), 'cognitive': 'unclassified', 'population': 'unclassified',
        'topic': topic_for(title), 'chapter': title, 'difficulty': 'foundation',
        'questionEn': q.get('questionEn', ''), 'questionZh': q.get('questionZh', ''),
        'options': opts, 'answer': answer,
        'explanationEn': q.get('explanationEn', ''), 'explanationZh': q.get('explanationZh', ''),
        'sourceRef': 'Nancy Caroline (textbook foundation)', 'verified': False,
    })

dst = os.path.join(ROOT, 'data', 'written', 'parts', 'nancy-foundation.json')
json.dump({'meta': {'part': 'nancy-foundation', 'count': len(out),
                    'note': 'Regenerated from the v1 chapter bank by tools/sync-v1-bank.py. '
                            'cognitive/population unclassified: migrated content was never assessed '
                            'against the CPCF blueprint, so it is excluded from blueprint stats.'},
           'questions': out},
          open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('wrote', len(out), 'questions ->', os.path.relpath(dst, ROOT))
print('areas:', dict(sorted(Counter(x['cpcfArea'] for x in out).items())))
print('answers:', dict(sorted(Counter(x['answer'] for x in out).items())))
