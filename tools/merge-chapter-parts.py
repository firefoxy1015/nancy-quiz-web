# -*- coding: utf-8 -*-
"""Assemble chNN-partK.json files into a complete chNN.json.

Usage: python tools/merge-chapter-parts.py ch13
Reads index.json for chapter metadata and the source manifest for
competency codes and page range. Chapter-level whyEn/whyZh and the final
selfCheck pick are left as "TODO" markers for the coordinator to fill —
this script assembles and de-duplicates, it does not author.
"""
import json, io, os, re, sys, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C2 = os.path.join(ROOT, 'data', 'study', 'chapters2')
SRC = r'D:\Claude\bcexam-sources\nancy-chapters'

cid = sys.argv[1]
parts = []
for f in sorted(glob.glob(os.path.join(C2, cid + '-part*.json'))):
    parts.append(json.load(io.open(f, encoding='utf-8')))
parts.sort(key=lambda p: p.get('part', 0))
assert parts, 'no part files'
print(f'{cid}: merging {len(parts)} parts')

idx = json.load(io.open(os.path.join(C2, 'index.json'), encoding='utf-8'))
meta = next(c for c in idx['chapters'] if c['id'] == cid)
mf = json.load(io.open(os.path.join(SRC, cid, 'manifest.json'), encoding='utf-8'))

def cat(key):
    out = []
    for p in parts: out += p.get(key, [])
    return out

# de-dup bcAlerts by fuzzy topic key; keep the longest (most detailed) entry
def dedupe_alerts(alerts):
    seen = {}
    for a in alerts:
        k = re.sub(r'[^a-z]', '', (a.get('topicEn') or '').lower())[:24]
        cur = seen.get(k)
        if not cur or len(json.dumps(a)) > len(json.dumps(cur)):
            if cur: print(f'  bcAlert de-dup: "{a.get("topicEn","")[:40]}" (kept richer of 2)')
            seen[k] = a
    return list(seen.values())

out = {
    'id': meta['id'], 'n': meta['n'], 'titleEn': meta['titleEn'], 'titleZh': meta['titleZh'],
    'group': meta['group'], 'examWeight': meta['examWeight'],
    'whyEn': 'TODO-COORDINATOR', 'whyZh': 'TODO-COORDINATOR',
    'competencies': {'areas': mf.get('competencyAreas', []), 'codes': mf.get('competencyCodes', [])},
    'sections': cat('sections'),
    'hardNumbers': cat('hardNumbers'),
    'atScene': cat('atScene'),
    'confusions': cat('confusions'),
    'mnemonics': cat('mnemonics'),
    'selfCheck': [],  # coordinator picks ~5 from candidates below
    'selfCheckCandidates': cat('selfCheckCandidates'),
    'bcAlerts': dedupe_alerts(cat('bcAlerts')),
    'sourcePages': mf['pages'],
}
pts = sum(len(s.get('points', [])) for s in out['sections'])
print(f"  sections={len(out['sections'])} points={pts} hardNumbers={len(out['hardNumbers'])} "
      f"bcAlerts={len(out['bcAlerts'])} selfCheckCandidates={len(out['selfCheckCandidates'])}")
io.open(os.path.join(C2, cid + '.json'), 'w', encoding='utf-8').write(
    json.dumps(out, ensure_ascii=False, indent=1))
print(f'  wrote {cid}.json (whyEn/whyZh + selfCheck pick still TODO)')
