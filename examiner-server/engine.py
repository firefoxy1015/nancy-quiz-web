# -*- coding: utf-8 -*-
"""Deterministic exam engine: state derivation, timing rules, and scoring.

The LLM never scores. It only reports *events* (what the candidate did/said,
mapped to rubric items) and speaks the examiner/patient/partner lines. This
module turns the event log into an EMALB-style grading form using the weights
and official error strings in data/practical/rubric.json.

Event record (as stored by the client and sent back on every call):
    {"t": <ms since start>, "name": "<event name>", "eids": ["E07"], "quote": "...", "components": [...]}
Event names:
    rubric item ids ("pulse", "airway", ...), "drug:<key>", "move:<key>",
    "transport:rtc" | "transport:non-rtc", special event keys from the sheet,
    and engine-derived "vitals-set-<n>-complete".
"""
import io, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUBRIC_PATH = os.path.join(ROOT, 'data', 'practical', 'rubric.json')
SHEETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sheets')

EXAM_MS = 40 * 60000
PCR_MS = 5 * 60000
VITALS_SET_MAX_MS = 3 * 60000
VITAL_ITEMS = ('blood-pressure', 'pulse', 'respirations')          # a "set" needs these three
VITAL_ALL = ('gcs', 'blood-pressure', 'pulse', 'respirations', 'skin-vitals', 'pupils', 'pulse-oximetry', 'blood-glucose', 'temperature')
PRESENCE_EXEMPT = ('overall-call-management', 'overall-patient-care',   # judged at the end, never by presence alone
                   'notification', 'hand-off-report', 'documentation',  # judged by the closing review
                   'transport')                                         # judged by the engine: category + packaging time
# items the model may never add a "quality" deduction to: the engine or the closing review owns them
QUALITY_EXCLUDED = {'notification', 'hand-off-report', 'documentation', 'transport', 'ongoing-abc-i'}
CAPS = {'functional-enquiries': 15, 'physical-exam': 15}
# A missed *expected action* is never worth more than this for these items: the
# 100% protocol/skill errors are conditions (wrong dose, no baseline vitals...)
# and are enforced by sheet protocolRules, not by "did not verbalize X".
PRESENCE_CAP = {'protocols': 25, 'skill-airway-mgmt': 25, 'skill-breathing-mgmt': 25, 'skill-cpr-aed': 25, 'skill-spinal-mgmt': 25,
                'skill-fracture-mgmt': 25, 'skill-wound-mgmt': 25, 'skill-drug-admin': 25, 'transport': 25}
PREFERRED_MISS_VERBALIZE = {'protocols': 'Does not rule out all the cautions of a medication'}
PREFERRED_MISS = {   # official string to cite when an expected action was simply not done
    'protocols': 'Fails to administer a medication indicated by the protocol not detrimental to patient care (e.g Entonox for pain)',
    'transport': 'Fails to place the patient in the correct category (Priority or Non-Priority – Medical/Trauma) at the end of the initial assessment and treats as such detrimental to patient care and/or',
}
REASSESS_WINDOW_MS = 3 * 60000

_rubric = None


def rubric():
    global _rubric
    if _rubric is None:
        _rubric = json.load(io.open(RUBRIC_PATH, encoding='utf-8'))
        _rubric['_items'] = {it['id']: dict(it, section=s['id']) for s in _rubric['sections'] for it in s['items']}
    return _rubric


def items():
    return rubric()['_items']


def load_sheet(sid):
    fp = os.path.join(SHEETS_DIR, sid + '.json')
    sh = json.load(io.open(fp, encoding='utf-8'))
    for i, e in enumerate(sh['expected']):
        e['eid'] = 'E%02d' % (i + 1)
    return sh


def list_sheets():
    out = []
    for f in sorted(os.listdir(SHEETS_DIR)):
        if f.endswith('.json') and '.skeleton' not in f:
            sh = json.load(io.open(os.path.join(SHEETS_DIR, f), encoding='utf-8'))
            out.append({'id': sh['id'], 'titleEn': sh['titleEn'], 'type': sh['type'], 'priority': sh['priority']})
    return out


def applicable_expected(sheet, track):
    return [e for e in sheet['expected'] if e.get('licence', 'both') in ('both', track)]


def official_error(item_id, weight, prefer=None):
    """Return (errorEn, errorZh) for an item at a weight; `prefer` picks a specific string."""
    it = items().get(item_id)
    if not it:
        return (prefer or '', '')
    bucket = next((b for b in it['errorsByWeight'] if b['weight'] == weight), None)
    if not bucket:
        return (prefer or '', '')
    if prefer:
        match = prefer if prefer in bucket['errorsEn'] else next((x for x in bucket['errorsEn'] if x.startswith(prefer[:35]) or prefer[:35] in x), None)
        if match:
            i = bucket['errorsEn'].index(match)
            return (match, bucket['errorsZh'][i] if i < len(bucket.get('errorsZh', [])) else '')
    return (bucket['errorsEn'][0], bucket.get('errorsZh', [''])[0] if bucket.get('errorsZh') else '')


# ---------------------------------------------------------------- state derivation

def first_time(events, name):
    for ev in events:
        if ev['name'] == name:
            return ev['t']
    return None


def times(events, name):
    return [ev['t'] for ev in events if ev['name'] == name]


def derive_vitals_sets(events):
    """Group vital-sign events into sets. A set is opened by a core vital
    (BP / pulse / resp) and completes when all three are in. Other vitals
    (GCS, skin, pupils, SpO2...) attach to the most recent set when they come
    within the set window, so a GCS taken just after the core three does not
    open a phantom set."""
    sets = []
    cur = None
    vit = [e for e in sorted(events, key=lambda e: e['t']) if e['name'] in VITAL_ALL]
    for i, ev in enumerate(vit):
        name = ev['name']
        core = name in VITAL_ITEMS
        if cur is None:
            if not core:
                if sets and ev['t'] - (sets[-1]['complete'] or sets[-1]['start']) <= VITALS_SET_MAX_MS:
                    sets[-1]['items'].setdefault(name, ev['t'])
                continue
            # a lone core vital (e.g. a BP recheck before a nitro dose) is a spot check, not a set
            partner = any(x['name'] in VITAL_ITEMS and x['name'] != name and 0 <= x['t'] - ev['t'] <= VITALS_SET_MAX_MS for x in vit[i + 1:])
            if not partner:
                continue
            cur = {'start': ev['t'], 'items': {}, 'complete': None}
            sets.append(cur)
        cur['items'].setdefault(name, ev['t'])
        if cur['complete'] is None and all(k in cur['items'] for k in VITAL_ITEMS):
            cur['complete'] = ev['t']
            cur = None
    return sets


def with_derived(events):
    """Append engine-derived events (vitals-set-N-complete)."""
    out = [dict(e) for e in events]
    for i, s in enumerate(derive_vitals_sets(events)):
        if s['complete'] is not None:
            out.append({'t': s['complete'], 'name': f'vitals-set-{i+1}-complete', 'eids': [], 'quote': '', 'components': []})
    return sorted(out, key=lambda e: e['t'])


def unlock_ok(cond, events, elapsed):
    if not cond or cond.get('always'):
        return True
    if 'anyOf' in cond:
        return any(unlock_ok(c, events, elapsed) for c in cond['anyOf'])
    if 'allOf' in cond:
        return all(unlock_ok(c, events, elapsed) for c in cond['allOf'])
    if 'elapsedMs' in cond and elapsed < cond['elapsedMs']:
        return False
    if 'afterEvent' in cond:
        n = len(times(events, cond['afterEvent']))
        if n < cond.get('count', 1):
            return False
    return True


def current_vitals_set(sheet, events, elapsed, fired=()):
    """The highest unlocked set, with the vitalsPatch of every fired state change applied."""
    ev = with_derived(events)
    cur = None
    for v in sheet['vitalsSets']:
        if unlock_ok(v.get('unlock'), ev, elapsed):
            cur = v
    cur = dict(cur or sheet['vitalsSets'][0])
    for sc in sheet.get('stateChanges', []):
        if sc['id'] in fired and sc.get('vitalsPatch'):
            for k, val in sc['vitalsPatch'].items():
                if isinstance(val, dict) and isinstance(cur.get(k), dict):
                    cur[k] = dict(cur[k], **val)
                else:
                    cur[k] = val
    return cur


def due_state_changes(sheet, events, elapsed, fired):
    """State changes whose conditions are met and that have not fired yet."""
    out = []
    events = with_derived(events)
    for sc in sheet.get('stateChanges', []):
        if sc['id'] in fired:
            continue
        w = sc.get('when') or {}
        if 'elapsedMs' in w and elapsed < w['elapsedMs']:
            continue
        if w.get('missingEvent') and first_time(events, w['missingEvent']) is not None:
            continue
        if w.get('afterEvent') and first_time(events, w['afterEvent']) is None:
            continue
        out.append(sc)
    return out


def _bp_spoken(bp):
    return re.sub(r'\s*/\s*', ' over ', str(bp or '')).strip()


def format_vital(vset, name, components):
    """The examiner's reply for one requested vital, giving only what was asked for
    (manual: candidate reports "pulse 64" -> rate only), phrased the way it is said aloud."""
    comps = set(c.lower() for c in (components or []))
    if name == 'blood-pressure':
        return f"BP's {_bp_spoken(vset['bp'])}."
    if name == 'pulse':
        p = vset['pulse']
        extra = []
        if 'rhythm' in comps and p.get('rhythm'):
            extra.append(p['rhythm'])
        if 'strength' in comps and p.get('strength'):
            extra.append(p['strength'] if p['strength'] not in ('normal',) else 'normal strength')
        return f"Pulse is {p['rate']}" + (', ' + ' and '.join(extra) if extra else '') + '.'
    if name == 'respirations':
        r = vset['resp']
        extra = []
        if 'depth' in comps and r.get('depth'):
            extra.append(r['depth'])
        if comps & {'character', 'rhythm', 'quality', 'effort'} and r.get('character'):
            extra.append(r['character'])
        return f"Resps are {r['rate']}" + (', ' + ' and '.join(extra) if extra else '') + '.'
    if name == 'gcs':
        g = vset['gcs']
        return f"GCS is {g['total']}. Eyes {g['e']}, verbal {g['v']}, motor {g['m']}." if g.get('e') else f"GCS is {g['total']}."
    if name == 'skin-vitals':
        return f"Skin's {vset['skin']}."
    if name == 'pupils':
        return f"Pupils are {vset['pupils']}."
    if name == 'pulse-oximetry':
        return f"SpO2 is {vset['spo2']}."
    if name == 'blood-glucose':
        return f"Blood sugar is {vset['bgl']}." if vset.get('bgl') else "There's no glucose reading in this scenario."
    if name == 'temperature':
        return f"Temp is {vset['temp']}." if vset.get('temp') else "There's no temperature in this scenario."
    return ''


# ---------------------------------------------------------------- event merging

import re as _re


def _norm(s):
    return _re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


REPORT_RX = _re.compile(r"\b(radio|patch(ing)?|pre-?alert|notif\w*|this is (unit|medic|ambulance)|hand[- ]?off|handover|hand over|"
                        r"report to|en route with|receiving (hospital|facility|team|ed))\b", _re.I)
DRUG_SAME_DOSE_MS = 150000   # no BC drug repeats faster than q3 min: mentions closer together are one administration


def merge_events(existing, new, candidate_log, now_ms):
    """Attach each newly reported event to the candidate utterance its quote came
    from (the model tends to re-list earlier actions), drop exact repeats, and
    return (accepted_events, newly_measured_vitals).

    candidate_log: [{'t', 'text'}] for candidate lines, newest last (incl. current)."""
    lines = [(c['t'], _norm(c['text'])) for c in candidate_log]
    raw_by_t = {c['t']: c['text'] for c in candidate_log}
    out = []
    seen = {(e['name'], e['t']) for e in existing}
    seen_eids = {x for e in existing for x in (e.get('eids') or [])}
    for ev in new:
        q = _norm(ev.get('quote', ''))[:60]
        t = now_ms
        if q and len(q) >= 8:
            hit = next((lt for lt, txt in reversed(lines) if q[:40] in txt), None)
            if hit is None:
                # quote not from the candidate at all: keep only if it fulfils something new
                if not (set(ev.get('eids') or []) - seen_eids) and ev['name'] in {e['name'] for e in existing}:
                    continue
            else:
                t = hit
        if (ev['name'], t) in seen and not (set(ev.get('eids') or []) - seen_eids):
            continue
        if ev['name'].startswith('drug:'):
            if REPORT_RX.search(raw_by_t.get(t, '')):
                continue   # "given ASA 160" in a radio report or hand-off is a report, not a dose
            if any(e['name'] == ev['name'] and abs(e['t'] - t) < DRUG_SAME_DOSE_MS for e in existing + out):
                continue
        if ev['name'] in VITAL_ALL and any(e['name'] == ev['name'] and abs(e['t'] - t) < 45000 for e in existing + out):
            continue
        ev = dict(ev, t=t, eids=[x for x in (ev.get('eids') or []) if x not in seen_eids])
        seen.add((ev['name'], t)); seen_eids.update(ev['eids'])
        out.append(ev)
    fresh_vitals = [e for e in out if e['name'] in VITAL_ALL and e['t'] >= now_ms - 1000]
    return out, fresh_vitals


KEYWORD_EVENTS = [   # (event name, regex) — only phrases that are unambiguous in a BC practical
    ('move:load', r'\b(load(ing|ed)?\b[^.]{0,40}\b(ambulance|unit|truck|rig)|into the (ambulance|unit|truck|rig)\b|load(ing)? (him|her|them|the patient)\b|major move\W+(now\W+)?load)'),
    ('move:lift-to-cot', r'\b(on(to)? the (cot|stretcher)|to the (cot|stretcher)|(lift\w*|transfer\w*|mov(e|ing))\b[^.]{0,30}\b(cot|stretcher)\b|straps? (are )?(secured|done up|on)|strapped (in|down))'),
    ('transport:rtc', r'(?<!non )\b(rtc|rapid transport|priority patient|load and go|unstable[, ]+(we are|we\'re) going)\b'),
    ('transport:non-rtc', r'\b(non[- ]?rtc|non[- ]?priority|stable patient|we have time)\b'),
    ('notification', r'\b(radio|patch|pre-?alert|notif(y|ication)|call(ing)? (the )?(hospital|receiving)|this is unit)\b'),
    ('hand-off-report', r'\b(hand[- ]?off|handover|report to the (nurse|doctor|hospital|receiving))\b'),
    ('ongoing-abc-i', r'\b(reassess\w*|re assess\w*|recheck\w*|re check\w*)\b.{0,20}\b(abc\w*|a b c\w*|airway)\b'),
    ('skill-spinal-mgmt', r'\b(hard collar|c collar|cervical collar|collar (is )?on|sized? (the |a )?collar|spinal (board|device)|backboard|long board|scoop( stretcher)?|vacuum mattress|head blocks|foam blocks)\b'),
]


MOVE_PLAN_RX = r"\b(will|i'll|we'll|we will|going to|gonna|plan\w*|prepar\w*|ready to|get ready|once|when we|after (we|the|splint\w*)|not|no|don'?t|won'?t|can'?t)\b"
TRANSPORT_COND_RX = r"\b(if|would|we'd|could|unless|in case|upgrade\w*|downgrade\w*|may|might|otherwise|not)\b"


def keyword_events(text, sheet, t, already):
    """Engine-side fallback: add the events above when the candidate's words plainly
    state them and the model did not report them this turn. Only the move keys the
    sheet declares are used."""
    out = []
    low = ' ' + _norm(text) + ' '
    names = {e['name'] for e in already}
    moves = set(sheet.get('majorMoves', []))
    off = set(sheet.get('disableKeywords') or [])   # e.g. multi-patient triage: "P1 is a stable patient" is not this patient's category
    for name, rx in KEYWORD_EVENTS:
        if name in off or (name in names and name != 'ongoing-abc-i'):
            continue
        if name.startswith('move:') and name.split(':', 1)[1] not in moves:
            continue
        if name.startswith('transport:') and any(n.startswith('transport:') for n in names):
            continue
        if name in items() and name != 'ongoing-abc-i' and not any(e['itemId'] == name for e in sheet.get('expected', [])):
            continue   # (ABC-I after moves is checked on every sheet)
        if name.startswith('move:') or name.startswith('transport:'):   # plans / conditionals are not acts: judge each sentence
            block = MOVE_PLAN_RX if name.startswith('move:') else TRANSPORT_COND_RX
            if any(_re.search(rx, ' ' + _norm(s) + ' ') and not _re.search(block, s.lower())
                   for s in _re.split(r'(?<=[.;!?])\s+', text or '')):
                out.append({'t': t, 'name': name, 'eids': [], 'quote': text[:120], 'components': ['keyword']})
            continue
        if _re.search(rx, low):
            out.append({'t': t, 'name': name, 'eids': [], 'quote': text[:120], 'components': ['keyword']})
    raw = (text or '').lower()
    for kw in sheet.get('keywordEvents', []):   # sheet-declared detectors for good acts the model may miss
        ev = kw.get('event')
        if not ev or ev in names or any(o['name'] == ev for o in out):
            continue
        try:
            for sent in _re.split(r'(?<=[.;!?])\s+', raw):
                if kw.get('blockRegex') and _re.search(kw['blockRegex'], sent, _re.I):
                    continue
                if _re.search(kw['regex'], sent, _re.I):
                    out.append({'t': t, 'name': ev, 'eids': [], 'quote': sent[:120], 'components': ['keyword']})
                    break
        except _re.error:
            pass
    return out


PRIMARY_RX = {   # initial-assessment items in the words every candidate uses (credited only before baseline vitals)
    'airway': r'\b(airway|patent|head tilt|jaw thrust|opa|npa|suction\w*)\b',
    'breathing': r'\b(breathing|respirat\w*|resps|chest rise|auscultat\w*|air entry|breath sounds|lung sounds|listen\w* to (his|her|the) (chest|lungs))\b',
    'circulation': r'\b(pulse|radial|carotid|circulation|major bleed\w*|bleeding)\b',
    'rapid-body-survey': r'\b(rapid body survey|rbs|rapid (trauma )?(survey|exam|assessment)|head to toe|modified (rbs|survey|body survey))\b',
    'delicate-spine': r'\b(c spine|manual (c spine|stabili[sz]\w*|inline)|in ?line stabili[sz]\w*|hold\w* (his|her|the) head|spinal precautions|spinal motion restriction|smr)\b',
    'skin-primary': r'\bskin\b',
}
TRIGGER_SKIP = set(VITAL_ALL) | set(PRESENCE_EXEMPT)   # vitals are measured (and spoken) only through the model + engine


def _phrase_rx(p):
    return r'(?<![a-z0-9])' + _re.escape(_norm(p)) + r'(?![a-z0-9])'


def trigger_events(text, sheet, track, t, already):
    """Engine-side credit for expected actions: the sheet's own trigger phrases (per action)
    and the plain words of the initial assessment (per item). A good act the model did not
    map must never become a false auto-fail. Primary-survey credit closes once the first
    full vitals set is in, and a radio report or hand-off never earns credit."""
    if REPORT_RX.search(text or ''):
        return []
    low = ' ' + _norm(text) + ' '
    if not low.strip():
        return []
    primary_open = not any(s['complete'] is not None for s in derive_vitals_sets(already))
    have = {x for e in already for x in (e.get('eids') or [])}
    exp = applicable_expected(sheet, track)
    out = []
    for e in exp:
        if e['eid'] in have or e['itemId'] in TRIGGER_SKIP or (e['phase'] == 'primary' and not primary_open):
            continue
        if any(len(_norm(p)) >= 3 and _re.search(_phrase_rx(p), low) for p in e.get('triggers') or []):
            out.append({'t': t, 'name': e['itemId'], 'eids': [e['eid']], 'quote': (text or '')[:120], 'components': ['trigger']})
    if primary_open:
        names = {e['name'] for e in already} | {o['name'] for o in out}
        exp_ids = {e['itemId'] for e in exp}
        for name, rx in PRIMARY_RX.items():
            if name in exp_ids and name not in names and _re.search(rx, low):
                out.append({'t': t, 'name': name, 'eids': [], 'quote': (text or '')[:120], 'components': ['keyword']})
    return out


DRUG_GIVE = r'\b(giv(e|ing)|administer(ing|ed)?|push(ing)?|spray(ing)?|squirt|chew|self[- ]administer\w*|inhal\w*|hand(ing)? (him|her) the|start(ing)? (the|an?)|hang(ing)?|bolus|onboard\w*|draw(ing)? up)\b'
DRUG_NOW = r"\b(giving|administering|pushing|spraying|starting|hanging|bolusing|i'?m giving|i am giving)\b"
DOSE = r'\b\d+(\.\d+)?\s*(mg|g|grams?|mcg|micrograms?|ml|millilit\w*|milligrams?|units?|puffs?|sprays?|l/min|litres?)\b'
DRUG_BLOCK = r"\b(given|gave|received|can'?t|cannot|unable|shouldn'?t|scope|ruled out|(is|are) out|had|already|last dose|was|were|will|i'll|we'll|going to|gonna|need\w*|once|plan\w*|did|do you|do we|have you|any|should|can give|could give|can be given|pcp|als|advanced care|not|no|never|without|withh?old\w*|hold(ing)? off|don'?t|won'?t|contraindicat\w*|caution\w*|avoid\w*|if|consider\w*|would|could|may|might|later|instead of|rather than|allerg\w*|taken|took|takes|on (a|any)|prescrib\w*|home)\b"


def drug_events(text, sheet, track, t, reported):
    """A sentence that names an allowed drug AND says it is being given (a give-verb or a dose)
    AND has no negation/conditional/history word -> drug:<key>. Only for drugs the model did not
    report this turn. Conservative by design: a missed drug costs a point, a phantom drug can
    trigger an absent-rule."""
    out = []
    if REPORT_RX.search(text or ''):
        return out
    have = {e['name'] for e in reported}
    for sent in _re.split(r'(?<=[.;!?])\s+|\s+(?:but|then)\s+', text or ''):
        low = sent.lower()
        if not low.strip() or _re.search(DRUG_BLOCK, low):
            continue
        if low.rstrip().endswith('?') or not (_re.search(DRUG_GIVE, low) or _re.search(DOSE, low)):
            continue   # questions are never doses
        if _re.search(r"\bmax(imum)?\b|/\s*kg\b|per kilo\w*|\bthat('s| is)\b|\bwhich is\b|works out|\bequals\b", low) and not _re.search(DRUG_NOW, low):
            continue   # a ceiling or a dose calculation is not a dose unless the drug is being given in the same breath
        for d in sheet.get('drugs', []):
            name = 'drug:' + d['key']
            if name in have:
                continue
            aliases = [d['key'].replace('-', ' ')] + [a.lower() for a in d.get('namesEn', [])]
            if any(_re.search(r'\b' + _re.escape(a) + r'\b', low) for a in aliases if len(a) >= 3):
                out.append({'t': t, 'name': name, 'eids': [], 'quote': sent[:120], 'components': ['keyword']})
                have.add(name)
    return out


CLOSING_EVIDENCE = {   # regex evidence that an element IS present in a report
    'ageSex': r'\b\d{1,3}[- ]?(year|yo|y/o|yr)s?[- ]?old\b|\b(male|female|man|woman)\b',
    'cc': r'\b(chief complaint|complain(ing|s)? of|c/c|presenting with)\b',
    'moi': r'\b(mechanism|fell|fall|crash|mvc|mva|saw|stab|gunshot|struck)\b',
    'hxcc': r'\b(onset|started|woke|since|ago|radiat|opqrst)\b',
    'vitals': r'\b(bp|blood pressure)\b[^.]{0,20}\d{2,3}\s*(/|over)\s*\d{2,3}',
    'initialVitals': r'\b(bp|blood pressure)\b[^.]{0,20}\d{2,3}\s*(/|over)\s*\d{2,3}',
    'finalVitals': r'(\b(bp|blood pressure)\b[^.]{0,20}\d{2,3}\s*(/|over)\s*\d{2,3}[\s\S]*){2}|\b(latest|second set|now|current|final)\b[^.]{0,30}\b(bp|pulse|vitals)\b',
    'pmhx': r'\b(history of|hx of|pmhx|past medical|known (diabetic|hypertensive)|no (medical )?history)\b',
    'meds': r'\b(meds?|medications?|takes|on (a )?(pill|tablet))\b',
    'allergies': r'\b(allerg\w*|nka|nkda)\b',
    'treatments': r'\b(given|gave|administered|treatment|tourniquet|splint|collar|oxygen|asa|nitro|entonox|txa|naloxone|glucagon|epi)\b',
    'findings': r'\b(exam|findings|auscultat|tender|clear|no jvd|deform|swell|bruis)\b',
}


QUALITY_VETO = [   # (substring of the official error string, regex in the candidate's words that refutes it)
    ('delay in reassessing vital signs', r'.'),          # timed by the engine
    ('set of vital signs in less than 3 minutes', r'.'),  # timed by the engine
    ('prime the S/L spray', r'\bprim(e|ed|ing)\b'),
    ('verbalize strength and/or rhythm', r'\b(strength|rhythm|regular|irregular|strong|weak|thready|bounding)\b'),
    ('verbalize depth', r'\b(depth|shallow|deep|adequate|laboured|labored)\b'),
    ('verbalize lubricating', r'\blubric'),
    ('does not verbalize a', r'\b(alert|avpu)\b'),
]


def veto_quality(quality, candidate_text):
    low = ' ' + (candidate_text or '').lower() + ' '
    cand_norm = _norm(candidate_text)
    out = []
    for q in quality or []:
        if q.get('itemId') in QUALITY_EXCLUDED or (q.get('weight') or 0) >= 100:
            continue   # engine/closing-owned items; a model judgement never auto-fails a candidate
        err = (q.get('errorEn') or '').lower()
        if any(sub.lower() in err and _re.search(rx, low) for sub, rx in QUALITY_VETO):
            continue
        quote = q.get('quote') or ''
        if _re.search(r'\b(examiner|patient|partner|engine)\s*:', quote, _re.I):
            continue   # evidence must be the candidate's own words
        qn = _norm(_re.sub(r'^\s*\[?\d{1,2}:\d{2}\]?\s*(candidate\s*:)?', '', quote, flags=_re.I))
        if len(qn) >= 12 and qn[:30] not in cand_norm:
            continue
        out.append(q)
    return out


def finalize_closing(inp, sheet, candidate_log, pcr_submitted):
    """Turn the closing_review tool output into the engine's closing dict + vetted quality picks.
    The candidate's own words beat the model's 'missing' verdicts; elements the sheet marks
    as not applicable (fact is null) are never 'missing'; refuted quality picks are dropped."""
    closing = {'notification': {'given': False}, 'handoff': {'given': False},
               'pcr': {'submitted': pcr_submitted, 'missingFields': [], 'mismatches': []}}
    quality = []
    if not inp:
        return closing, quality
    closing['notification'] = inp.get('notification', closing['notification'])
    closing['handoff'] = inp.get('handoff', closing['handoff'])
    closing['pcr'] = dict(inp.get('pcr', {}), submitted=pcr_submitted)
    cand = [e for e in candidate_log if e.get('role') == 'candidate']
    facts = {'notification': sheet.get('notificationFacts') or {}, 'handoff': sheet.get('handoffFacts') or {}}

    def report_near(tsec):
        tms = (tsec or 0) * 1000 if (tsec or 0) < 10000 else tsec
        near = sorted(cand, key=lambda e: abs(e.get('t', 0) - tms))[:2]
        return ' '.join(e.get('text', '') for e in near)
    for key in ('notification', 'handoff'):
        c = closing[key]
        if c.get('given'):
            c['missing'] = [m for m in closing_sanity(c.get('missing'), report_near(c.get('t'))) if facts[key].get(m)]
    quality = veto_quality(inp.get('quality') or [], ' '.join(e.get('text', '') for e in cand))
    return closing, quality


def closing_sanity(missing, report_text):
    """Drop 'missing' elements that the candidate's own report plainly contains."""
    low = ' ' + (report_text or '').lower() + ' '
    keep = []
    for m in missing or []:
        rx = CLOSING_EVIDENCE.get(m)
        if rx and _re.search(rx, low):
            continue
        keep.append(m)
    return keep


# ---------------------------------------------------------------- scoring

class Form:
    def __init__(self):
        self.rows = []       # {itemId, weight, errorEn, errorZh, evidence, source}

    def add(self, item_id, weight, error_en=None, evidence=None, source='engine', error_zh=None, name_en=None):
        en, zh = official_error(item_id, weight, error_en) if item_id in items() else (error_en or '', error_zh or '')
        it = items().get(item_id, {})
        self.rows.append({'itemId': item_id, 'nameEn': name_en or it.get('nameEn', item_id), 'nameZh': it.get('nameZh', ''),
                          'section': it.get('section', 'appendix'), 'weight': weight, 'errorEn': en, 'errorZh': zh or error_zh or '',
                          'evidence': evidence or {}, 'source': source})

    def consolidate(self):
        """One deduction per item at its highest level; section caps; total."""
        prio = {'engine': 2, 'engine-presence': 1, 'examiner-judgement': 0}
        best = {}
        for r in self.rows:
            k = r['itemId']
            key = (r['weight'], prio.get(r['source'], 0))
            if k not in best or key > (best[k]['weight'], prio.get(best[k]['source'], 0)):
                best[k] = r
        rows = sorted(best.values(), key=lambda r: -r['weight'])
        by_section = {}
        for r in rows:
            by_section.setdefault(r['section'], 0)
            by_section[r['section']] += r['weight']
        total = 0
        for sec, ded in by_section.items():
            total += min(ded, CAPS.get(sec, 10**9))
        score = max(0, 100 - total)
        autofail = any(r['weight'] >= 100 for r in rows)
        return {'rows': rows, 'deducted': min(100, total), 'score': 0 if autofail else score, 'autofail': autofail,
                'pass': (not autofail) and score >= 70}


def check_rule(rule, events, end_ms):
    """Evaluate one protocolRule; return evidence dict if it fires, else None."""
    c = rule['check']
    if c == 'present':
        if first_time(events, rule['event']) is None:
            return {'t': end_ms, 'quote': f"never recorded: {rule['event']}"}
    elif c == 'absent':
        t = first_time(events, rule['event'])
        if t is not None:
            ev = next(e for e in events if e['name'] == rule['event'])
            return {'t': t, 'quote': ev.get('quote', '')}
    elif c == 'ordered':
        tf, tt = first_time(events, rule['first']), first_time(events, rule['then'])
        if tt is not None and (tf is None or tf > tt):
            ev = next(e for e in events if e['name'] == rule['then'])
            return {'t': tt, 'quote': ev.get('quote', '') or f"{rule['then']} before {rule['first']}"}
    elif c == 'max_count':
        ts = times(events, rule['event'])
        if len(ts) > rule['max']:
            return {'t': ts[rule['max']], 'quote': f"{rule['event']} x{len(ts)} (max {rule['max']})"}
    elif c == 'before_each':
        reqs = times(events, rule['requires'])
        for t in times(events, rule['event']):
            if not any(t - rule.get('withinMs', 10**9) <= r <= t for r in reqs):
                return {'t': t, 'quote': f"{rule['event']} without {rule['requires']} in the preceding {rule.get('withinMs', 0)//60000} min"}
    elif c == 'within_after':
        for t in times(events, rule['after']):
            if not any(t < x <= t + rule.get('withinMs', REASSESS_WINDOW_MS) for x in times(events, rule['event'])):
                return {'t': t, 'quote': f"no {rule['event']} within {rule.get('withinMs', REASSESS_WINDOW_MS)//60000} min after {rule['after']}"}
    return None


def pain_management(sheet, track, events, form):
    """Appendix A of the grading criteria."""
    pm = sheet.get('painManagement') or {}
    if not pm.get('applies'):
        return
    ent = first_time(events, 'drug:entonox')
    ace = first_time(events, 'drug:acetaminophen')
    ibu = first_time(events, 'drug:ibuprofen')
    realign = first_time(events, pm.get('realignmentEvent', 'skill-fracture-mgmt'))
    name = 'Pain Management (Appendix A)'
    lic = {d['key']: d.get('licence', 'both') for d in sheet.get('drugs', [])}
    ind = pm.get('oralsIndicated', ['acetaminophen', 'ibuprofen'] if pm.get('indicatedForPcp', True) else [])
    ind = [k for k in ind if lic.get(k, 'both') in ('both', track)]   # contraindicated or out-of-licence orals are not "indicated"
    if ind:
        given = {'acetaminophen': ace, 'ibuprofen': ibu}
        got = sum(1 for k in ind if given.get(k) is not None)
        orals = 2 if got == len(ind) else (1 if got else 0)   # "both" = every indicated oral
        if ent is not None and orals == 2 and realign is not None and ent > realign:
            form.add('pain-management', 100, 'Delaying the Entonox until after they have realigned or performed fracture management when they have administered Acetaminophen and Ibuprofen', {'t': ent}, name_en=name)
        elif ent is not None and orals == 0:
            form.add('pain-management', 10, 'Administering Entonox for pain but not administering Acetaminophen and Ibuprofen (when indicated)', {'t': ent}, name_en=name)
        elif ent is not None and orals == 1:
            form.add('pain-management', 10, 'Administering one of either Acetaminophen and Ibuprofen for pain but not both and administers Entonox', {'t': ent}, name_en=name)
        elif ent is None and orals == 2:
            form.add('pain-management', 25, 'Administering Acetaminophen and Ibuprofen for pain but not Entonox', {'t': realign or 0}, name_en=name)
        elif ent is None and orals == 1:
            form.add('pain-management', 25, 'Administering one of either Acetaminophen and Ibuprofen for pain but not both and does not administer Entonox', {'t': realign or 0}, name_en=name)
    if ent is not None and realign is not None and ent > realign:
        # Entonox was indicated before the fracture management and came only after it: the
        # detriment the 100% line describes, at either licence level, with or without orals
        form.add('pain-management', 100, 'Does not administer Entonox in the instance when indicated where it does cause further detriment to the patient condition (realigning a limb/performed fracture management)', {'t': realign, 'quote': 'Entonox given only after the fracture management'}, name_en=name)
    elif ent is None and realign is not None:
        form.add('pain-management', 100, 'Does not administer Entonox in the instance when indicated where it does cause further detriment to the patient condition (realigning a limb/performed fracture management)', {'t': realign}, name_en=name)
    elif ent is None:
        form.add('pain-management', 25, 'Does not administer Entonox in the instance when it is indicated where it does not cause further detriment for the patient', {'t': 0}, name_en=name)


def score(sheet, track, events, end_ms, closing=None, quality=None):
    """Build the grading form.

    closing: {notification: {given, missing:[...]}, handoff: {given, missing:[...]},
              pcr: {submitted, missingFields:[...], mismatches:[...]}}   (from the finish pass)
    quality: [{itemId, weight, errorEn, quote, t}]                       (LLM picks, constrained)
    """
    ev = with_derived(events)
    form = Form()
    done_eids = set()
    for e in ev:
        done_eids.update(e.get('eids') or [])
    done_names = set(e['name'] for e in ev)
    drug_credit = set()
    if any(n.startswith('drug:') for n in done_names):   # giving a drug is initiating a protocol; the rules judge how well
        words = ['medication', 'drug', 'dose', 'analges'] + [a.lower() for d in sheet.get('drugs', []) for a in [d['key'].replace('-', ' ')] + (d.get('namesEn') or []) if len(a) >= 3]
        for e in applicable_expected(sheet, track):
            if e['itemId'] in ('protocols', 'skill-drug-admin') and any(_re.search(r'\b' + _re.escape(w), e['actionEn'].lower()) for w in words):
                drug_credit.add(e['eid'])

    # 1. presence of expected actions
    exp = applicable_expected(sheet, track)
    per_item = {}
    first100 = {}
    for e in exp:
        per_item[e['itemId']] = per_item.get(e['itemId'], 0) + 1
        if e['weight'] == 100 and e.get('phase', 'primary') == 'primary':
            first100.setdefault(e['itemId'], e['eid'])
    for e in exp:
        if e['itemId'] in PRESENCE_EXEMPT:
            continue
        # name-level credit: below 100, capped items, or the item's only action (no other action it could be confused with)
        if e['eid'] in done_eids or e['eid'] in drug_credit or (e['itemId'] in done_names and (e['weight'] < 100 or e['itemId'] in PRESENCE_CAP or per_item[e['itemId']] == 1)):
            continue
        w = min(e['weight'], PRESENCE_CAP.get(e['itemId'], 10**9))
        if w == 100 and (e.get('phase', 'primary') != 'primary' or e['eid'] != first100.get(e['itemId'])):
            w = 15   # the 100% strings describe the item's core initial-assessment act; other actions of the item are judged by the sheet's rules
        it = items().get(e['itemId'])
        if it and w not in it['weights']:
            w = max([x for x in it['weights'] if x <= w] or [it['weights'][-1]])
        if e['itemId'] in PRESENCE_CAP and e['actionEn'].lower().startswith('verbalize'):
            w = min(w, 15)   # not saying a ceiling/rule aloud is a caution, not a failed treatment
        form.add(e['itemId'], w, PREFERRED_MISS_VERBALIZE.get(e['itemId']) if w == 15 and e['actionEn'].lower().startswith('verbalize') else PREFERRED_MISS.get(e['itemId']),
                 {'t': end_ms, 'quote': 'not done / not verbalized: ' + e['actionEn']}, source='engine-presence')

    # 2. vitals timing (Overall Call Management)
    sets = derive_vitals_sets(ev)
    for s in sets:
        took = (s['complete'] if s['complete'] is not None else end_ms) - s['start']
        if took > VITALS_SET_MAX_MS:
            form.add('overall-call-management', 15, 'Does not complete a set of vital signs in less than 3 minutes and/or', {'t': s['start'], 'quote': f'set took {took/60000:.1f} min'})
            break
    priority = sheet['priority'] == 'rtc'
    mod_lo, mod_hi, major = (7, 8, 9) if priority else (17, 18, 19)
    if sets and sets[0]['complete'] is not None:
        nxt = sets[1]['start'] if len(sets) > 1 else end_ms
        gap_min = (nxt - sets[0]['complete']) / 60000
        if gap_min > major:
            form.add('overall-call-management', 15, 'Major delay in reassessing vital signs', {'t': nxt, 'quote': f'{gap_min:.0f} min between sets'})
        elif gap_min >= mod_lo:   # 7-9 (priority) / 17-19 (stable): moderate
            form.add('overall-call-management', 10, 'Moderate delay in reassessing vital signs', {'t': nxt, 'quote': f'{gap_min:.0f} min between sets'})

    # 3. transport decision and packaging time
    t_rtc, t_non = first_time(ev, 'transport:rtc'), first_time(ev, 'transport:non-rtc')
    correct = sheet['priority']
    accepted = sheet.get('acceptedPriorities') or [correct]   # e.g. post-ictal: guideline p.7 says altered LOC = unstable
    decided = 'rtc' if t_rtc is not None and (t_non is None or t_rtc < t_non) else ('non-rtc' if t_non is not None else None)
    if decided in accepted:
        correct = decided   # packaging limit follows the candidate's (acceptable) category
    if decided is None:
        form.add('transport', 25, 'Fails to place the patient in the correct category (Priority or Non-Priority – Medical/Trauma) at the end of the initial assessment and treats as such detrimental to patient care and/or', {'t': end_ms, 'quote': 'no transport decision'})
    elif decided != correct:
        form.add('transport', 25, 'Fails to place the patient in the correct category (Priority or Non-Priority – Medical/Trauma) at the end of the initial assessment and treats as such detrimental to patient care and/or', {'t': t_rtc if decided == 'rtc' else t_non, 'quote': f'decided {decided}, correct {correct}'})
    load_moves = [m for m in sheet.get('majorMoves', []) if m in ('load', 'lift-to-cot')]
    t_pack = min([x for x in (first_time(ev, 'move:load'), first_time(ev, 'move:lift-to-cot')) if x is not None], default=None)
    limit = 15 if correct == 'rtc' else 30
    t0 = 0
    pf = sheet.get('packagingFromEvent')   # e.g. ["state:rosc"]: an arrest is packaged from ROSC, not from the door
    if pf:
        starts = [x for x in (first_time(ev, k) for k in ([pf] if isinstance(pf, str) else pf)) if x is not None]
        t0 = min(starts) if starts else None
    if t0 is None:
        pass   # e.g. no ROSC in the run: packaging time is not judged
    elif t_pack is None or t_pack - t0 > limit * 60000:
        s = ('Does not assess, package, and have a Priority patient ready to load in 15 minutes or less where appropriate' if correct == 'rtc'
             else 'Does not assess, package, and have a non-Priority patient ready to load in 30 minutes or less where appropriate')
        form.add('transport', 25, s, {'t': t_pack or end_ms, 'quote': 'not packaged within %d min' % limit if t_pack else 'never packaged'})

    # 4. ongoing ABC-I after each major move
    moves = [e for e in ev if e['name'].startswith('move:')]
    reassess = times(ev, 'ongoing-abc-i')
    if moves:
        for m in moves:
            if end_ms - m['t'] < 60000:
                continue   # scenario ended right after the move; no chance to reassess
            if not any(m['t'] <= r <= m['t'] + REASSESS_WINDOW_MS for r in reassess):
                form.add('ongoing-abc-i', 15, 'Does not reassess A.B.C. I\'s after each major "move"', {'t': m['t'], 'quote': m.get('quote', m['name'])})
                break
    elif not reassess:
        form.add('ongoing-abc-i', 15, 'Does not reassess primary interventions at any time', {'t': end_ms})

    # 5. scenario protocol rules
    for rule in sheet.get('protocolRules', []):
        if rule.get('licence', 'both') not in ('both', track):
            continue
        hit = check_rule(rule, ev, end_ms)
        if hit:
            d = rule['deduct']
            form.add(d['itemId'], d['weight'], d['errorEn'], hit)

    # 6. Appendix A
    pain_management(sheet, track, ev, form)

    # 7. closing (notification / hand-off / PCR) from the finish pass
    c = closing or {}
    n = c.get('notification') or {}
    if not n.get('given'):
        form.add('notification', 5 if priority else 3, 'Fails to notify the hospital at any time for a critical patient' if priority else 'Fails to notify the hospital at any time for a non-critical patient', {'t': end_ms})
    else:
        miss = n.get('missing') or []
        crit = [m for m in miss if m in ('vitals', 'treatments', 'cc')]
        if crit:
            form.add('notification', 3, 'Failure to provide critical information potentially detrimental to patient care (e.g. not reporting ventilating the apneic patient)', {'t': n.get('t', end_ms), 'quote': 'missing: ' + ', '.join(crit)})
        elif miss:
            form.add('notification', 1, 'Failure to provide non-critical information in a record or report', {'t': n.get('t', end_ms), 'quote': 'missing: ' + ', '.join(miss)})
    h = c.get('handoff') or {}
    if not h.get('given'):
        form.add('hand-off-report', 5, 'Fails to provide a report and/or is unsure how to provide a handover report', {'t': end_ms})
    else:
        miss = h.get('missing') or []
        crit = [m for m in miss if m in ('initialVitals', 'finalVitals', 'treatments', 'allergies', 'meds', 'cc')]
        if len(miss) >= 5:
            form.add('hand-off-report', 5, 'Report given with gross deficiencies', {'t': h.get('t', end_ms), 'quote': 'missing: ' + ', '.join(miss)})
        elif crit:
            form.add('hand-off-report', 3, 'Fails to provide critical information in a record or report potentially detrimental to patient care', {'t': h.get('t', end_ms), 'quote': 'missing: ' + ', '.join(crit)})
        elif miss:
            form.add('hand-off-report', 1, 'Failure to provide non-critical information in a record or report', {'t': h.get('t', end_ms), 'quote': 'missing: ' + ', '.join(miss)})
    p = c.get('pcr') or {}
    if not p.get('submitted'):
        form.add('documentation', 5, 'Deduction if the candidate does not submit a PCR', {'t': end_ms})
    else:
        mf = p.get('missingFields') or []
        mm = [x for x in (p.get('mismatches') or []) if len(x) > 12 and (':' in x or '\u2014' in x or '-' in x)]
        if len(mf) >= 3:
            form.add('documentation', 3, 'Deduction if the candidate misses significant data fields that are relevant to the simulation (e.g. missing three or more data fields)', {'t': end_ms, 'quote': 'missing: ' + ', '.join(mf)})
        elif mm:
            form.add('documentation', 3, "Deduction if the data entered does not match what occurred in the simulation (e.g. medications and allergies don't match between the scenario and the documentation)", {'t': end_ms, 'quote': '; '.join(mm)[:200]})
        elif mf:
            form.add('documentation', 1, 'Deduction if the candidate submits a PCR but it contains minor deficiencies (e.g. missing one or two data fields that are relevant to the simulation)', {'t': end_ms, 'quote': 'missing: ' + ', '.join(mf)})

    # 8. LLM quality picks (constrained to official strings; never raises a level the engine already set)
    for q in quality or []:
        it = items().get(q.get('itemId'))
        if not it:
            continue
        bucket = next((b for b in it['errorsByWeight'] if b['weight'] == q.get('weight')), None)
        if not bucket or q.get('errorEn') not in bucket['errorsEn']:
            continue
        form.add(q['itemId'], q['weight'], q['errorEn'], {'t': q.get('t', 0), 'quote': q.get('quote', '')}, source='examiner-judgement')

    result = form.consolidate()
    result['caps'] = CAPS
    result['vitalsSets'] = [{'start': s['start'], 'complete': s['complete'], 'items': s['items']} for s in sets]
    result['transport'] = {'decided': decided, 'correct': correct, 'packagedAt': t_pack}
    result['durationMs'] = end_ms
    return result
