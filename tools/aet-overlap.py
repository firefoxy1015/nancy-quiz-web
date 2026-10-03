# -*- coding: utf-8 -*-
"""Check AET course-sync questions for wording borrowed from the school's own quiz items.

Usage: python tools/aet-overlap.py data/written/parts/aet-b1.json [more.json ...]

The school's items live outside the repo (private study copies). Any English
stem, option or explanation that shares an 8-word window with them is flagged:
the site's AET questions must be original, not paraphrases of AET's quizzes.
Exit code 1 if anything is flagged.
"""
import glob, io, json, os, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
SRC = r'D:\Claude\bcexam-sources\aet-moodle'
N = 8

def words(s):
    return re.sub(r'[^a-z0-9 ]', ' ', s.lower()).split()

school = ' '.join(io.open(f, encoding='utf-8').read()
                  for f in glob.glob(os.path.join(SRC, '4[0-9]-scorm-quiz-*.md')))
sw = words(school)
grams = {tuple(sw[i:i + N]) for i in range(len(sw) - N + 1)}

def length_bias(questions):
    """Share of items whose key is the longest option, and the key/distractor length ratio.
    A test-wise candidate picks the longest, most qualified option; the key must not
    stand out that way."""
    longest, ratios = 0, []
    for q in questions:
        lens = {o['key']: len(o.get('en', '')) for o in q['options']}
        key = q['answer'] if isinstance(q['answer'], str) else q['answer'][0]
        others = [v for k, v in lens.items() if k != key]
        if lens[key] == max(lens.values()):
            longest += 1
        ratios.append(lens[key] / (sum(others) / len(others)))
    n = max(1, len(questions))
    return longest / n, sum(ratios) / n

bad = 0
for path in sys.argv[1:]:
    d = json.load(io.open(path, encoding='utf-8'))
    share, ratio = length_bias(d['questions'])
    flag = share > 0.40 or ratio > 1.35
    print(f'  length bias: key is longest option in {share:.0%} of items, key/distractor length ratio {ratio:.2f}'
          + ('  <-- FAIL (limits: ≤40%, ≤1.35)' if flag else ''))
    bad += flag
    for q in d['questions']:
        texts = [q.get('questionEn', ''), q.get('explanationEn', '')] + [o.get('en', '') for o in q.get('options', [])]
        for t in texts:
            tw = words(t)
            hit = next((tw[i:i + N] for i in range(len(tw) - N + 1) if tuple(tw[i:i + N]) in grams), None)
            if hit:
                bad += 1
                print(f'  OVERLAP {q["id"]}: "{" ".join(hit)}"')
                break
    print(f'{os.path.basename(path)}: {len(d["questions"])} questions checked')
print('RESULT:', 'FAIL' if bad else 'PASS', f'({bad} flagged)')
sys.exit(1 if bad else 0)
