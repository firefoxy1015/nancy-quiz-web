# -*- coding: utf-8 -*-
"""Offline: run the synthetic candidate's lines through the engine's own detectors (no model).
Shows which line fires which engine-side event - for debugging keyword / trigger / drug detectors.

Usage: python examiner-server/tools/offline_detect.py md-07 [--track pcp] [--grep hypoglycemia]
"""
import argparse, io, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE)); sys.path.insert(0, HERE)
import engine
from e2e_synthetic import build   # (also sets a utf-8 stdout)

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('--track', default='pcp'); ap.add_argument('--grep', default='')
    a = ap.parse_args()
    sheet = engine.load_sheet(a.sheet)
    script, _ = build(sheet, a.track)
    events = []
    for minute, text in script:
        t = int(minute * 60000)
        new = engine.keyword_events(text, sheet, t, events)
        new += engine.drug_events(text, sheet, a.track, t, events + new)
        new += engine.trigger_events(text, sheet, a.track, t, events + new)
        events += new
        names = [e['name'] + (('/' + ','.join(e['eids'])) if e['eids'] else '') for e in new]
        if not a.grep or a.grep.lower() in (text + ' '.join(names)).lower():
            print(f'[{minute:5.1f}] {text[:150]}\n        -> {names}')
