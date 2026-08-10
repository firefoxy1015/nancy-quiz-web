# -*- coding: utf-8 -*-
"""Five-gate acceptance check for chapters2 files.

Usage: python tools/verify-chapters2.py [ch21 ch17 ...]   (default: all present)

Gates:
  1. schema + bilingual completeness + size floors by examWeight
  2. plagiarism: no 30-word window shared with the source chapter text
  3. rare-CJK scan (chars appearing <=2 times across the file, for eyeballing)
  4. template detection (title-stuffing rate, distinctness after title strip)
  5. numeric inventory (all numbers with context, for spot-checking vs the book)
Exit code 1 on any hard failure (gates 1-2); gates 3-5 print for human review.
"""
import json, io, os, re, sys, glob
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r'D:\Claude\bcexam-sources\nancy-chapters'
C2 = os.path.join(ROOT, 'data', 'study', 'chapters2')

def norm(s):
    return re.sub(r'[^a-z0-9 ]', ' ', s.lower())

def words(s):
    return norm(s).split()

def all_en(c):
    out = []
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, str) and (k.endswith('En') or k in ('en', 'qEn', 'aEn', 'itemEn', 'bookEn', 'bcEn', 'topicEn')):
                    out.append(v)
                else:
                    walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(c)
    return out

def all_zh(c):
    out = []
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, str) and (k.endswith('Zh') or k == 'zh'):
                    out.append(v)
                else:
                    walk(v)
        elif isinstance(o, list):
            for x in o: walk(x)
    walk(c)
    return out

targets = sys.argv[1:] or sorted(
    os.path.basename(f)[:-5] for f in glob.glob(os.path.join(C2, 'ch*.json')))
idx = json.load(io.open(os.path.join(C2, 'index.json'), encoding='utf-8'))
byId = {c['id']: c for c in idx['chapters']}
FLOORS = {3: (60, 8), 2: (40, 6), 1: (30, 4)}  # (min points, min hardNumbers)
hard_fail = False

for cid in targets:
    fp = os.path.join(C2, cid + '.json')
    if not os.path.exists(fp):
        print(f'{cid}: FILE MISSING'); hard_fail = True; continue
    c = json.load(io.open(fp, encoding='utf-8'))
    meta = byId[cid]
    print(f'\n{"="*72}\n{cid}  {c.get("titleEn","?")}  (weight {meta["examWeight"]})')
    errs = []

    # gate 1: schema
    for f in ('titleEn', 'titleZh', 'whyEn', 'whyZh', 'sections', 'hardNumbers',
              'confusions', 'selfCheck', 'sourcePages'):
        if not c.get(f): errs.append('missing ' + f)
    pts = [p for s in c.get('sections', []) for p in s.get('points', [])]
    minP, minH = FLOORS[meta['examWeight']]
    if len(pts) < minP: errs.append(f'points {len(pts)} < floor {minP}')
    if len(c.get('hardNumbers', [])) < minH:
        errs.append(f'hardNumbers {len(c.get("hardNumbers",[]))} < floor {minH}')
    for i, p in enumerate(pts):
        if not p.get('en') or not p.get('zh'): errs.append(f'point {i} not bilingual'); break
    for s in c.get('sections', []):
        if not s.get('titleZh'): errs.append('section missing titleZh'); break
    nEn, nZh = len(all_en(c)), len(all_zh(c))
    print(f'  points={len(pts)} hardNumbers={len(c.get("hardNumbers",[]))} '
          f'sections={len(c.get("sections",[]))} atScene={len(c.get("atScene",[]))} '
          f'confusions={len(c.get("confusions",[]))} selfCheck={len(c.get("selfCheck",[]))} '
          f'bcAlerts={len(c.get("bcAlerts",[]))} | EN {nEn} / ZH {nZh} strings')

    # gate 2: 30-word plagiarism windows vs source chapter
    srcdir = os.path.join(SRC, cid)
    src = ' '.join(io.open(f, encoding='utf-8').read()
                   for f in glob.glob(os.path.join(srcdir, '*.txt')))
    sw = words(src)
    grams = set(tuple(sw[i:i + 30]) for i in range(0, max(0, len(sw) - 30)))
    hits = 0
    for t in all_en(c):
        tw = words(t)
        for i in range(0, max(0, len(tw) - 30)):
            if tuple(tw[i:i + 30]) in grams:
                hits += 1
                print('  PLAGIARISM 30w:', ' '.join(tw[i:i + 12]) + ' ...')
                break
    if hits: errs.append(f'{hits} strings share a 30-word window with the book')

    # gate 4: template detection
    title = c.get('titleEn', '')
    stuffed = sum(1 for t in all_en(c) if title and title in t and len(title) > 12)
    stripped = [t.replace(title, '#') for t in all_en(c)]
    distinct = len(set(stripped)) / max(1, len(stripped))
    print(f'  title-stuffing {stuffed}/{len(all_en(c))} · distinctness {distinct:.0%}'
          + ('  <-- TEMPLATE SMELL' if stuffed > len(all_en(c)) * 0.15 or distinct < 0.9 else ''))
    if stuffed > len(all_en(c)) * 0.3: errs.append('template stuffing over 30%')

    # gate 3: rare CJK
    zh = ' '.join(all_zh(c))
    cc = Counter(ch for ch in zh if '一' <= ch <= '鿿')
    rare = ''.join(sorted(ch for ch, n in cc.items() if n <= 2))
    print(f'  CJK {sum(cc.values())} chars, rare(<=2): {len(rare)}')
    if rare: print('   ', rare)

    # gate 5: numeric inventory (top 20 for spot check)
    nums = []
    for t in all_en(c):
        for m in re.finditer(r'\d+(?:\.\d+)?(?:\s*(?:%|mmol|mg|mcg|g|mL|L|kg|bpm|mm Hg|min|seconds?|hours?|J|weeks?|days?|years?))?', t):
            ctx = t[max(0, m.start() - 42):m.end() + 30].replace('\n', ' ')
            nums.append(ctx)
    print(f'  numeric mentions: {len(nums)} (spot-check sample below)')
    for x in nums[:8]: print('    …' + x + '…')

    if errs:
        hard_fail = True
        print('  ERRORS:', '; '.join(errs))
    else:
        print('  GATES 1-2 PASS')

sys.exit(1 if hard_fail else 0)
