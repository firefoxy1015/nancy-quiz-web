# -*- coding: utf-8 -*-
"""Synthetic perfect candidate: build a run from a sheet's own expected actions and
drive it through the live API. A competent candidate is what every sheet must reward,
so this is the acceptance gate for new sheets: a protocol rule that fires here, or an
action the model cannot map, is a sheet bug (or a prompt bug).

Usage: python examiner-server/tools/e2e_synthetic.py md-02 tr-01 ... [--track pcp|emr|both] [--base URL]
Pass: score >= 80 and no auto-fail. Spends real model calls (~20 per sheet per track).
"""
import argparse, io, json, os, sys, time, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHASES = ['dispatch', 'scene', 'primary', 'transport', 'history', 'vitals', 'interventions', 'fe', 'exam', 'ongoing']
CHUNK = 4


def post(base, path, body):
    req = urllib.request.Request(base + path, data=json.dumps(body).encode(),
                                 headers={'content-type': 'application/json', 'X-Device': 'e2e-synthetic'}, method='POST')
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def flat(v):
    if v is None:
        return ''
    if isinstance(v, (list, tuple)):
        return '; '.join(flat(x) for x in v if x)
    if isinstance(v, dict):
        return '; '.join(f'{k}: {flat(x)}' for k, x in v.items() if x)
    return str(v)


def build(sheet, track):
    """Return (script [(minute, text)], pcr dict)."""
    exp = [e for e in sheet['expected'] if e.get('licence', 'both') in ('both', track)]
    by_phase = {p: [] for p in PHASES}
    for e in exp:
        if e['itemId'] in ('notification', 'hand-off-report', 'documentation'):
            continue
        by_phase.setdefault(e['phase'], []).append(e['actionEn'].replace('PCP: ', '').replace('PCP:', ''))
    script, t = [], 0.3

    def say(text, step=0.6):
        nonlocal t
        script.append((round(t, 2), text))
        t += step

    for ph in PHASES:
        acts = by_phase.get(ph) or []
        if ph == 'interventions':
            for i in range(0, len(acts), CHUNK):
                say('. '.join(acts[i:i + CHUNK]) + '.')
            # packaging, with a reassessment after every major move
            for m in sheet.get('majorMoves', []):
                say(f"Major move now: {m.replace('-', ' ')}. Reassessing airway, breathing, circulation and all interventions after the move.", 0.7)
            say('Repeat vital signs: blood pressure by auscultation, pulse rate strength and rhythm, respirations rate depth and character, SpO2.')
            continue
        for i in range(0, len(acts), CHUNK):
            say('. '.join(acts[i:i + CHUNK]) + '.')
    nf = sheet.get('notificationFacts') or {}
    say('Radio to the receiving hospital: ' + '. '.join(flat(v) for v in nf.values() if v) + '.')
    say('Repeat vital signs en route: blood pressure, pulse rate strength and rhythm, respirations rate depth and character, SpO2. Reassessing airway, breathing, circulation and all interventions.', 3.0)
    hf = sheet.get('handoffFacts') or {}
    say('Hand-off report to the receiving team: ' + '. '.join(flat(v) for v in hf.values() if v) + '.')
    pf = sheet.get('pcrFacts') or {}
    pcr = {k: flat(pf.get(k)) for k in ('cc', 'hxcc', 'pmhx', 'meds', 'allergies', 'vitals', 'treatments', 'findings')}
    pcr['narrative'] = flat(pf.get('narrative') or pf.get('times') or '')
    return script, pcr


def run(base, sid, track, verbose):
    sheet = json.load(io.open(os.path.join(ROOT, 'sheets', sid + '.json'), encoding='utf-8'))
    script, pcr = build(sheet, track)
    post(base, '/api/examiner/start', {'scenarioId': sid, 'track': track})
    log, events, fired = [{'t': 0, 'role': 'examiner', 'text': 'You may begin.'}], [], []
    t0 = time.time()
    for minute, text in script:
        tms = int(minute * 60000)
        r = post(base, '/api/examiner/turn', {'scenarioId': sid, 'track': track, 'elapsedMs': tms, 'text': text, 'log': log, 'events': events, 'fired': fired})
        log.append({'t': tms, 'role': 'candidate', 'text': text})
        for s in r['say']:
            log.append({'t': tms, 'role': s['role'], 'text': s['text']})
        for l in r['engineLines']:
            log.append({'t': tms, 'role': 'examiner', 'text': l})
        events += r['events']; fired = r['fired']
        if verbose:
            print(f'  [{minute:5.1f}] {text[:110]}\n          -> {[e["name"] for e in r["events"]]}')
    fin = post(base, '/api/examiner/finish', {'scenarioId': sid, 'track': track, 'endMs': int(script[-1][0] * 60000) + 60000,
                                              'log': log, 'events': events, 'pcr': pcr})
    f = fin['form']
    ok = (not f['autofail']) and f['score'] >= 80
    print(f"\n{sid} [{track}] {'PASS' if ok else 'FAIL'} score {f['score']}{' AUTO-FAIL' if f['autofail'] else ''} "
          f"| {len(script)} turns {time.time()-t0:.0f}s {len(events)} events")
    for row in f['rows']:
        print(f"   -{row['weight']:3d} {row['itemId']:24s} {row['errorEn'][:62]} | {str(row['evidence'].get('quote',''))[:70]} [{row['source']}]")
    return ok


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('sheets', nargs='+')
    ap.add_argument('--track', default='pcp', choices=['pcp', 'emr', 'both'])
    ap.add_argument('--base', default='http://127.0.0.1:8787')
    ap.add_argument('-v', action='store_true')
    a = ap.parse_args()
    tracks = ['pcp', 'emr'] if a.track == 'both' else [a.track]
    results = [run(a.base, sid, tr, a.v) for sid in a.sheets for tr in tracks]
    print(f"\nSYNTHETIC {sum(results)}/{len(results)} PASS")
    sys.exit(0 if all(results) else 1)
