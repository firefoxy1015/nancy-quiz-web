# -*- coding: utf-8 -*-
"""Generate a sheet skeleton from a practice scenario.

Usage: python examiner-server/tools/build_skeleton.py md-02 [tr-01 ...]
Writes examiner-server/sheets/<id>.skeleton.json — everything that can be copied
mechanically from data/practical/*.json (expected items with weights, vitals,
dispatch, phase examiner scripts) plus empty slots for the author to fill.
"""
import io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRACT = os.path.join(ROOT, 'data', 'practical')
OUT = os.path.join(ROOT, 'examiner-server', 'sheets')


def load_all():
    idx = json.load(io.open(os.path.join(PRACT, 'index.json'), encoding='utf-8'))
    out = []
    for f in idx['files']:
        d = json.load(io.open(os.path.join(PRACT, f), encoding='utf-8'))
        for s in d['scenarios']:
            s['_file'] = f
            out.append(s)
    return out


def parse_vitals(v):
    """Split the free-text vitals of the scenario into the structured shape."""
    def num(s):
        import re
        m = re.search(r'\d+', s or '')
        return int(m.group(0)) if m else None
    gcs = v.get('gcs') or ''
    import re
    comp = re.search(r'E(\d)\s*V(\d)\s*M(\d)', gcs)
    pulse_txt = v.get('pulse') or ''
    resp_txt = v.get('resp') or ''
    return {
        'set': v.get('set'),
        'unlock': {'always': True} if v.get('set') == 1 else {'anyOf': [{'elapsedMs': 600000}]},
        'unlockNoteEn': v.get('timeHint'),
        'gcs': {'total': num(gcs), 'e': int(comp.group(1)) if comp else None,
                'v': int(comp.group(2)) if comp else None, 'm': int(comp.group(3)) if comp else None},
        'bp': v.get('bp'),
        'pulse': {'rate': num(pulse_txt), 'rhythm': 'regular' if 'regular' in pulse_txt else '',
                  'strength': 'weak' if 'weak' in pulse_txt else ('strong' if 'strong' in pulse_txt else 'normal'),
                  'rawEn': pulse_txt},
        'resp': {'rate': num(resp_txt), 'depth': '', 'character': '', 'rawEn': resp_txt},
        'skin': v.get('skin'), 'pupils': v.get('pupils'), 'spo2': v.get('spo2'),
        'bgl': v.get('bgl'), 'temp': v.get('temp'),
    }


def skeleton(s):
    expected = []
    for p in s['phases']:
        for e in p.get('expected', []):
            lic = 'pcp' if p['id'] == 'fe' else 'both'
            txt = e['actionEn']
            if txt.startswith('PCP') or txt.startswith('PCP:'):
                lic = 'pcp'
            expected.append({'itemId': e.get('rubricRef'), 'phase': p['id'], 'weight': e['weight'],
                             'licence': lic, 'actionEn': txt, 'triggers': []})
    sheet = {
        'id': s['id'], 'titleEn': s['titleEn'], 'type': s['type'], 'priority': s['priority'],
        'sourceScenario': f"data/practical/{s['_file']}#{s['id']}",
        'patient': {'name': '', 'age': None, 'sex': '', 'affectEn': '', 'speechEn': ''},
        'scene': {'settingEn': '', 'hazardsEn': [], 'bystanders': [], 'partnerEn': 'one partner at your licence level; acts only on your delegation', 'equipmentEn': []},
        'dispatchEn': s['dispatchEn'],
        'dispatchUpdateEn': next((p.get('infoEn') for p in s['phases'] if p['id'] == 'dispatch'), None),
        'arrivalEn': '', 'firstLookEn': '',
        'primary': {'locEn': '', 'airwayEn': '', 'breathingEn': '', 'circulationEn': '', 'rbsEn': '', 'skinEn': ''},
        'history': {'ccEn': '', 'opqrst': {k + 'En': '' for k in 'opqrst'}, 'painScoreEn': '',
                    'sample': {k + 'En': '' for k in 'sample'},
                    'fe': {k + 'En': '' for k in ('general', 'cns', 'respiratory', 'cardiovascular', 'giGu', 'integumentary', 'musculoskeletal', 'endocrine', 'eent')}},
        'findings': {k + 'En': '' for k in ('headNeck', 'chestLungs', 'abdomen', 'back', 'lowerExtremities', 'upperExtremities')},
        'vitalsSets': [parse_vitals(v) for v in s.get('vitalsSets', [])],
        'stateChanges': [],
        'expected': expected,
        'specialEvents': [],
        'drugs': [],
        'majorMoves': [],
        'protocolRules': [],
        'painManagement': {'applies': False},
        'notificationFacts': {'ageSex': '', 'cc': '', 'moi': None, 'hxcc': '', 'vitals': '', 'treatments': '', 'findings': ''},
        'handoffFacts': {'ageSex': '', 'cc': '', 'moi': None, 'hxcc': '', 'initialVitals': '', 'finalVitals': '', 'pmhx': '', 'meds': '', 'allergies': '', 'treatments': '', 'findings': ''},
        'pcrFacts': dict(s.get('pcrKeyPoints') or {}),
        'examinerPrompts': {'locNotDepictedEn': None, 'breathingNotDepictedEn': None, 'missedInjuryEn': None},
        'trackNotes': {'emrEn': s.get('emrVariantEn', ''), 'pcpEn': s.get('pcpVariantEn', '')},
        '_phaseScripts': {p['id']: p.get('infoEn') for p in s['phases']},   # author reference; deleted by verifier
        '_handoffModelEn': s.get('handoffModelEn'),
        '_criticalPitfallsEn': s.get('criticalPitfallsEn'),
        'sourcePages': '',
    }
    return sheet


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    allsc = {s['id']: s for s in load_all()}
    for sid in sys.argv[1:]:
        sk = skeleton(allsc[sid])
        fp = os.path.join(OUT, sid + '.skeleton.json')
        io.open(fp, 'w', encoding='utf-8').write(json.dumps(sk, ensure_ascii=False, indent=1))
        print('wrote', fp, '| expected items:', len(sk['expected']), '| vitals sets:', len(sk['vitalsSets']))
