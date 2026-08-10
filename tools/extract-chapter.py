# -*- coding: utf-8 -*-
"""Slice the Canadian-edition textbook PDF into per-chapter, per-section text files.

Output goes OUTSIDE the repo (bcexam-sources/nancy-chapters/) — raw extracted
text is copyrighted material and must never be committed to the public site.
Each chapter directory gets:
  manifest.json   - title, page range, competency codes, section list
  00-opening.txt  - chapter opening (competency-area block)
  NN-<slug>.txt   - one file per TOC section
"""
import fitz, io, json, os, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

PDF = r"C:\Users\Firefoxy\Downloads\Telegram Desktop\Nancy_Caroline’s_Emergency_Care_in_the_Streets_Canadian_Edition.pdf"
OUT = r"D:\Claude\bcexam-sources\nancy-chapters"

doc = fitz.open(PDF)
toc = doc.get_toc()

chapters = []  # (n, title, start_page) 1-based pages from toc
for lvl, title, pg in toc:
    if lvl == 1 and title.lower().startswith('chapter'):
        m = re.match(r'chapter\s+(\d+)\s+(.*)', title, re.I)
        chapters.append((int(m.group(1)), m.group(2).strip(), pg))
appendix_start = next(pg for lvl, t, pg in toc if lvl == 1 and t == 'Appendices')

def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:48]

def pages_text(a, b):  # 1-based inclusive a, exclusive b
    return '\n'.join(doc[p - 1].get_text() for p in range(a, b))

os.makedirs(OUT, exist_ok=True)
total_sections = 0
for i, (n, title, start) in enumerate(chapters):
    end = chapters[i + 1][2] if i + 1 < len(chapters) else appendix_start
    subs = [(t, p) for lvl, t, p in toc if lvl == 2 and start <= p < end]
    d = os.path.join(OUT, f'ch{n:02d}')
    os.makedirs(d, exist_ok=True)
    # opening block = chapter start up to first section (competency areas live here)
    first_sec = subs[0][1] if subs else end
    opening = pages_text(start, max(first_sec, start + 1))
    io.open(os.path.join(d, '00-opening.txt'), 'w', encoding='utf-8').write(opening)
    codes = sorted(set(re.findall(r'\b\d+\.\d+\.[a-z]\b', opening)))
    areas = sorted(set(re.findall(r'Area \d+: [^\n]+', opening)))
    appendices = sorted(set(re.findall(r'Appendix \d+: [^\n]+', opening)))
    sections = []
    for j, (st, sp) in enumerate(subs):
        sp_end = subs[j + 1][1] if j + 1 < len(subs) else end
        fn = f'{j + 1:02d}-{slug(st)}.txt'
        io.open(os.path.join(d, fn), 'w', encoding='utf-8').write(pages_text(sp, sp_end))
        sections.append({'title': st, 'file': fn, 'pages': f'{sp}-{sp_end - 1}'})
        total_sections += 1
    manifest = {'n': n, 'title': title, 'pages': f'{start}-{end - 1}', 'pageCount': end - start,
                'competencyCodes': codes, 'competencyAreas': areas, 'appendices': appendices,
                'sections': sections}
    io.open(os.path.join(d, 'manifest.json'), 'w', encoding='utf-8').write(
        json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f'ch{n:02d} {title[:44]:46s} {end - start:>4}p  {len(subs):>2} sections  {len(codes):>3} codes')
print(f'\nDone: {len(chapters)} chapters, {total_sections} section files -> {OUT}')
