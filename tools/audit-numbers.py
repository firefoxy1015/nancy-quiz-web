# -*- coding: utf-8 -*-
"""Trace every number in a chapter back to a source document.

Usage: python tools/audit-numbers.py ch28 [ch35 ...]        (default: all v2)

For each distinctive number appearing in a chapter's English text, checks
whether that number occurs in any of:
  - the chapter's own extracted source sections
  - bc-exam-guidelines.txt
  - grading-criteria.txt
  - drugs.json / protocols.json (site data already validated against source)

A number found in none of those is UNTRACED — either derived (a computed
example, a unit conversion), or invented. The tool cannot tell those apart;
it produces the shortlist a human has to look at.

Trivially common values (0-12, plain 15/20/30/50/100 etc.) are skipped:
they appear everywhere and carry no signal.
"""
import json, io, os, re, sys, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C2 = os.path.join(ROOT, 'data', 'study', 'chapters2')
SRC = r'D:\Claude\bcexam-sources'

# values so common they carry no evidentiary weight
SKIP = {str(n) for n in range(0, 13)} | {
    '15', '20', '24', '25', '30', '40', '45', '50', '60', '70', '75', '80', '90', '100',
    '2026', '2025', '2024', '1000', '500', '200', '300', '400', '250',
}

def numbers(text):
    """Distinctive numeric tokens: decimals, multi-digit, comma-grouped."""
    out = set()
    for m in re.finditer(r'\d[\d,]*\.?\d*', text):
        raw = m.group(0).rstrip('.').replace(',', '')
        if not raw or raw in SKIP:
            continue
        if len(raw) == 1:
            continue
        out.add(raw)
    return out

def en_strings(o, out=None):
    out = [] if out is None else out
    if isinstance(o, dict):
        for k, v in o.items():
            if isinstance(v, str) and (k.endswith('En') or k in ('en', 'qEn', 'aEn', 'itemEn', 'value', 'bookEn', 'bcEn', 'topicEn')):
                out.append(v)
            else:
                en_strings(v, out)
    elif isinstance(o, list):
        for x in o:
            en_strings(x, out)
    return out

def haystack_for(cid):
    parts = []
    d = os.path.join(SRC, 'nancy-chapters', cid)
    for f in glob.glob(os.path.join(d, '*.txt')):
        parts.append(io.open(f, encoding='utf-8', errors='replace').read())
    for f in ('bc-exam-guidelines.txt', 'grading-criteria.txt'):
        p = os.path.join(SRC, f)
        if os.path.exists(p):
            parts.append(io.open(p, encoding='utf-8', errors='replace').read())
    for f in ('drugs.json', 'protocols.json', 'treatments.json'):
        p = os.path.join(ROOT, 'data', 'study', f)
        if os.path.exists(p):
            parts.append(io.open(p, encoding='utf-8').read())
    h = '\n'.join(parts)
    # PDF extraction splits phrases and numbers across lines, so a literal
    # search misses values that are genuinely present ("27.5 million" wrapping
    # mid-phrase). Collapse whitespace, and keep a separator-stripped copy so
    # "1,500" also matches "1500" and "1 500".
    flat = re.sub(r'\s+', ' ', h)
    return flat, flat.replace(',', '').replace(' ', '')

idx = json.load(io.open(os.path.join(C2, 'index.json'), encoding='utf-8'))
targets = sys.argv[1:] or [c['id'] for c in idx['chapters'] if c['status'] == 'v2']

grand_total = grand_untraced = 0
report = []
for cid in targets:
    fp = os.path.join(C2, cid + '.json')
    if not os.path.exists(fp):
        continue
    ch = json.load(io.open(fp, encoding='utf-8'))
    hay, hay_nc = haystack_for(cid)
    nums = set()
    for s in en_strings(ch):
        nums |= numbers(s)
    untraced = sorted(n for n in nums if n not in hay and n not in hay_nc)
    grand_total += len(nums)
    grand_untraced += len(untraced)
    pct = 100 * (len(nums) - len(untraced)) / max(1, len(nums))
    flag = '' if not untraced else ('  <-- REVIEW' if len(untraced) > 3 else '')
    print(f'{cid:6s} {ch.get("titleEn","")[:34]:36s} {len(nums):4d} numbers  {pct:5.1f}% traced'
          f'  {len(untraced):3d} untraced{flag}')
    if untraced:
        report.append((cid, untraced))

print(f'\nTOTAL: {grand_total} distinct numbers, {grand_untraced} untraced '
      f'({100*(grand_total-grand_untraced)/max(1,grand_total):.1f}% traced)')
if report:
    print('\nUNTRACED VALUES (check each: derived example, unit conversion, or fabricated?)')
    for cid, u in report:
        print(f'  {cid}: {", ".join(u[:24])}')
