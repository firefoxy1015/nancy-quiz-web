# -*- coding: utf-8 -*-
"""Golden tests for the deterministic engine (no model, no sheets on disk)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import engine

M = 60000


def sheet(priority='rtc', pain=False):
    exp = [
        ('loc-avpu', 15), ('delicate-spine', 100), ('airway', 100), ('breathing', 100), ('circulation', 100),
        ('rapid-body-survey', 100), ('oxygen', 15), ('transport', 25), ('chief-complaint', 15), ('history-of-cc', 15),
        ('blood-pressure', 15), ('pulse', 15), ('respirations', 15), ('gcs', 5), ('ongoing-abc-i', 15),
        ('notification', 5), ('hand-off-report', 5), ('documentation', 5), ('fe-cns', 5),
    ]
    return {'id': 'test', 'titleEn': 'T', 'type': 'trauma', 'priority': priority,
            'expected': [{'eid': 'E%02d' % (i + 1), 'itemId': k, 'weight': w, 'licence': 'pcp' if k.startswith('fe-') else 'both', 'actionEn': k}
                         for i, (k, w) in enumerate(exp)],
            'vitalsSets': [{'set': 1, 'unlock': {'always': True}}], 'majorMoves': ['lift-to-cot', 'load'],
            'drugs': [{'key': 'entonox'}, {'key': 'acetaminophen'}, {'key': 'ibuprofen'}],
            'protocolRules': [
                {'id': 'spine-first', 'check': 'ordered', 'first': 'delicate-spine', 'then': 'move:lift-to-cot',
                 'deduct': {'itemId': 'delicate-spine', 'weight': 100, 'errorEn': 'Fails to initiate C-spine control at any time when indicated'}}],
            'painManagement': {'applies': pain, 'indicatedForPcp': True, 'realignmentEvent': 'skill-fracture-mgmt'}}


def ev(t, name, eids=(), comps=()):
    return {'t': int(t * M), 'name': name, 'eids': list(eids), 'quote': name, 'components': list(comps)}


def perfect(priority='rtc'):
    s = sheet(priority)
    b = {e['itemId']: e['eid'] for e in s['expected']}
    e = [ev(0.5, 'loc-avpu', [b['loc-avpu']]), ev(0.6, 'delicate-spine', [b['delicate-spine']]), ev(0.8, 'airway', [b['airway']]),
         ev(1.0, 'breathing', [b['breathing']]), ev(1.2, 'circulation', [b['circulation']]), ev(2.0, 'rapid-body-survey', [b['rapid-body-survey']]),
         ev(2.5, 'oxygen', [b['oxygen']]), ev(3.0, 'transport:' + priority, [b['transport']]),
         ev(4.0, 'chief-complaint', [b['chief-complaint']]), ev(5.0, 'history-of-cc', [b['history-of-cc']]),
         ev(6.0, 'blood-pressure', [b['blood-pressure']]), ev(6.5, 'pulse', [b['pulse']], ['rate', 'rhythm', 'strength']),
         ev(7.0, 'respirations', [b['respirations']], ['rate', 'depth']), ev(7.2, 'gcs', [b['gcs']]),
         ev(10.0, 'move:lift-to-cot'), ev(10.5, 'ongoing-abc-i', [b['ongoing-abc-i']]), ev(12.0, 'move:load'), ev(12.3, 'ongoing-abc-i'),
         ev(13.0, 'blood-pressure'), ev(13.2, 'pulse', [], ['rate', 'rhythm', 'strength']), ev(13.4, 'respirations', [], ['rate', 'depth']),
         ev(14.0, 'notification', [b['notification']]), ev(20.0, 'hand-off-report', [b['hand-off-report']]), ev(20.0, 'fe-cns', [b['fe-cns']])]
    closing = {'notification': {'given': True, 'missing': []}, 'handoff': {'given': True, 'missing': []},
               'pcr': {'submitted': True, 'missingFields': [], 'mismatches': []}}
    return s, e, closing


def test_perfect_run_scores_100():
    s, e, c = perfect()
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert r['score'] == 100 and r['pass'] and not r['autofail'], r['rows']


def test_emr_ignores_pcp_items():
    s, e, c = perfect()
    e = [x for x in e if x['name'] != 'fe-cns']
    r = engine.score(s, 'emr', e, 22 * M, closing=c)
    assert r['score'] == 100, r['rows']


def test_missing_cspine_is_autofail():
    s, e, c = perfect()
    e = [x for x in e if x['name'] != 'delicate-spine']
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert r['autofail'] and not r['pass'] and r['score'] == 0
    assert any(x['itemId'] == 'delicate-spine' and x['weight'] == 100 for x in r['rows'])


def test_slow_vitals_set_and_major_gap():
    s, e, c = perfect()
    e = [x for x in e if x['name'] not in ('blood-pressure', 'pulse', 'respirations')]
    e += [ev(6.0, 'blood-pressure'), ev(8.0, 'pulse', [], ['rate']), ev(9.5, 'respirations', [], ['rate'])]   # 3.5-minute set
    e += [ev(22.0, 'blood-pressure'), ev(22.2, 'pulse'), ev(22.4, 'respirations')]                             # 12.5-minute gap: major for a priority patient
    r = engine.score(s, 'pcp', e, 25 * M, closing=c)
    ocm = [x for x in r['rows'] if x['itemId'] == 'overall-call-management']
    assert len(ocm) == 1 and ocm[0]['weight'] == 15, r['rows']


def test_rtc_packaged_late_and_wrong_category():
    s, e, c = perfect('rtc')
    e = [x for x in e if not x['name'].startswith('move:') and not x['name'].startswith('transport:')]
    e += [ev(3.0, 'transport:non-rtc'), ev(18.0, 'move:lift-to-cot'), ev(18.2, 'ongoing-abc-i'), ev(19.0, 'move:load'), ev(19.1, 'ongoing-abc-i')]
    r = engine.score(s, 'pcp', e, 25 * M, closing=c)
    tr = [x for x in r['rows'] if x['itemId'] == 'transport']
    assert len(tr) == 1 and tr[0]['weight'] == 25


def test_move_without_reassessment():
    s, e, c = perfect()
    e = [x for x in e if x['name'] != 'ongoing-abc-i']
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    row = next(x for x in r['rows'] if x['itemId'] == 'ongoing-abc-i')
    assert row['weight'] == 15 and 'move' in row['errorEn']


def test_pain_management_appendix_a():
    s, e, c = perfect()
    s['painManagement']['applies'] = True
    e += [ev(8.0, 'drug:acetaminophen'), ev(8.1, 'drug:ibuprofen'), ev(9.0, 'skill-fracture-mgmt'), ev(9.5, 'drug:entonox')]
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert r['autofail'] and any(x['itemId'] == 'pain-management' and x['weight'] == 100 for x in r['rows'])
    e2 = [x for x in e if not x['name'].startswith('drug:')] + [ev(8.5, 'drug:entonox')]
    r2 = engine.score(s, 'emr', e2, 22 * M, closing=c)
    assert not any(x['itemId'] == 'pain-management' for x in r2['rows']), r2['rows']


def test_closing_deductions():
    s, e, c = perfect()
    c = {'notification': {'given': False}, 'handoff': {'given': True, 'missing': ['allergies']},
         'pcr': {'submitted': True, 'missingFields': ['meds', 'allergies', 'vitals'], 'mismatches': []}}
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    w = {x['itemId']: x['weight'] for x in r['rows']}
    assert w['notification'] == 5 and w['hand-off-report'] == 3 and w['documentation'] == 3


def test_quality_pick_only_official_strings():
    s, e, c = perfect()
    q = [{'itemId': 'pulse', 'weight': 3, 'errorEn': 'Consistently fails to verbalize strength and/or rhythm two or more times', 'quote': 'pulse 92', 't': 6 * M},
         {'itemId': 'pulse', 'weight': 3, 'errorEn': 'made up', 'quote': '', 't': 0}]
    r = engine.score(s, 'pcp', e, 22 * M, closing=c, quality=q)
    rows = [x for x in r['rows'] if x['itemId'] == 'pulse']
    assert len(rows) == 1 and rows[0]['weight'] == 3 and rows[0]['source'] == 'examiner-judgement'
    assert r['score'] == 97


def test_vitals_reply_rate_only():
    v = {'set': 1, 'bp': '128/82', 'pulse': {'rate': 92, 'rhythm': 'regular', 'strength': 'strong'},
         'resp': {'rate': 18, 'depth': 'normal', 'character': 'regular'}, 'gcs': {'total': 15, 'e': 4, 'v': 5, 'm': 6},
         'skin': 'pink', 'pupils': 'PERL', 'spo2': '97% RA'}
    assert engine.format_vital(v, 'pulse', ['rate']) == 'Pulse: rate 92 — rate only.'
    assert engine.format_vital(v, 'pulse', ['rate', 'rhythm', 'strength']) == 'Pulse: rate 92, regular, strong.'
    assert engine.format_vital(v, 'respirations', ['rate']) == 'Respirations: rate 18 — rate only.'
    assert 'E4 V5 M6' in engine.format_vital(v, 'gcs', [])


def test_merge_events_dedupes_relisted_actions():
    log = [{'t': 30000, 'text': 'Gloves on. Scene is safe, one patient.'}, {'t': 90000, 'text': 'Checking his radial pulse for rate, strength and regularity.'},
           {'t': 150000, 'text': 'Blood pressure on the left arm.'}]
    existing = [{'t': 30000, 'name': 'scene-ppe', 'eids': ['E04'], 'quote': 'Gloves on', 'components': []},
                {'t': 90000, 'name': 'circulation', 'eids': ['E11'], 'quote': 'radial pulse', 'components': ['rate']}]
    new = [{'t': 150000, 'name': 'scene-ppe', 'eids': ['E04'], 'quote': 'Gloves on. Scene is safe', 'components': []},
           {'t': 150000, 'name': 'circulation', 'eids': ['E11'], 'quote': 'radial pulse for rate', 'components': []},
           {'t': 150000, 'name': 'blood-pressure', 'eids': ['E28'], 'quote': 'Blood pressure on the left arm', 'components': []},
           {'t': 150000, 'name': 'transport:rtc', 'eids': ['E17'], 'quote': 'Scene is safe, one patient', 'components': []}]
    out, fresh = engine.merge_events(existing, new, log, 150000)
    names = [(e['name'], e['t']) for e in out]
    assert ('blood-pressure', 150000) in names and ('transport:rtc', 30000) in names   # late catch keeps the real time
    assert not any(n in ('scene-ppe', 'circulation') for n, _ in names)                # relisted actions dropped
    assert [e['name'] for e in fresh] == ['blood-pressure']


def test_lone_bp_recheck_is_not_a_vitals_set():
    s, e, c = perfect()
    e += [ev(11.0, 'blood-pressure')]   # BP recheck before a nitro dose, nothing else for 2 min
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert not any(x['itemId'] == 'overall-call-management' for x in r['rows']), r['rows']
    assert len(r['vitalsSets']) == 2


def test_keyword_fallback_catches_packaging_and_rtc():
    sheet = {'majorMoves': ['lift-to-cot', 'load']}
    out = engine.keyword_events("He's on the cot, straps secured, loading into the ambulance.", sheet, 5000, [])
    names = {e['name'] for e in out}
    assert names == {'move:lift-to-cot', 'move:load'}
    out2 = engine.keyword_events("This is a cardiac chest pain, he's unstable, we're RTC.", sheet, 5000, [])
    assert {e['name'] for e in out2} == {'transport:rtc'}
    out3 = engine.keyword_events("Radio to the hospital: this is unit 4 en route.", sheet, 5000, [{'name': 'notification'}])
    assert out3 == []   # already reported by the model


def test_closing_sanity_trusts_the_candidates_words():
    report = 'Initial vitals BP 148/92, pulse 96 regular; latest BP 122/78, pulse 88. Meds amlodipine and rosuvastatin. Allergies none known.'
    assert engine.closing_sanity(['initialVitals', 'finalVitals', 'meds', 'allergies', 'pmhx'], report) == ['pmhx']


def test_same_utterance_vitals_form_a_complete_set():
    s, e, c = perfect()
    e = [x for x in e if x['name'] not in ('blood-pressure', 'pulse', 'respirations', 'gcs')]
    e += [ev(8.2, 'blood-pressure'), ev(8.2, 'pulse', [], ['rate', 'rhythm', 'strength']), ev(8.2, 'respirations', [], ['rate', 'depth']), ev(8.2, 'gcs')]
    e += [ev(11.0, 'blood-pressure')]                                                   # lone recheck before a dose
    e += [ev(15.0, 'blood-pressure'), ev(15.0, 'pulse'), ev(15.0, 'respirations')]   # 6.8 min after set 1: inside the priority interval
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert [v['complete'] for v in r['vitalsSets']] == [int(8.2 * M), 15 * M], r['vitalsSets']
    assert not any(x['itemId'] == 'overall-call-management' for x in r['rows']), r['rows']
    sheet = dict(s, protocolRules=[{'id': 'x', 'check': 'ordered', 'first': 'vitals-set-1-complete', 'then': 'drug:entonox',
                                    'deduct': {'itemId': 'protocols', 'weight': 100, 'errorEn': 'Does not complete baseline vital signs prior to initiating the protocol'}}])
    r2 = engine.score(sheet, 'pcp', e + [ev(9.5, 'drug:entonox')], 22 * M, closing=c)
    assert not any(x['itemId'] == 'protocols' for x in r2['rows']), r2['rows']


def test_reassessment_in_same_utterance_as_move_counts():
    s, e, c = perfect()
    e = [x for x in e if x['name'] not in ('ongoing-abc-i',) and not x['name'].startswith('move:')]
    e += [ev(10.0, 'move:lift-to-cot'), ev(10.0, 'ongoing-abc-i'), ev(12.0, 'move:load'), ev(12.0, 'ongoing-abc-i')]
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert not any(x['itemId'] == 'ongoing-abc-i' for x in r['rows']), r['rows']


def test_quality_veto_drops_refuted_picks():
    q = [{'itemId': 'skill-drug-admin', 'weight': 10, 'errorEn': 'Does not verbalize they would prime the S/L spray prior to use', 'quote': 'priming', 't': 1},
         {'itemId': 'pulse', 'weight': 3, 'errorEn': 'Consistently fails to verbalize strength and/or rhythm two or more times', 'quote': 'pulse 96', 't': 2}]
    kept = engine.veto_quality(q, "I'm priming the nitro spray. Pulse 96.")
    assert [x['itemId'] for x in kept] == ['pulse']
    kept2 = engine.veto_quality(q, "Pulse 96, strong and regular. Nitro spray, one spray.")
    assert [x['itemId'] for x in kept2] == ['skill-drug-admin']


def test_rule_row_beats_presence_row_on_a_tie():
    s, e, c = perfect('rtc')
    s['expected'].append({'eid': 'E98', 'itemId': 'transport', 'weight': 25, 'licence': 'both', 'actionEn': 'Ready to load within 15 minutes'})
    e = [x for x in e if not x['name'].startswith('move:')] + [ev(18.0, 'move:lift-to-cot'), ev(18.1, 'ongoing-abc-i'), ev(19.0, 'move:load'), ev(19.1, 'ongoing-abc-i')]
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    row = next(x for x in r['rows'] if x['itemId'] == 'transport')
    assert row['weight'] == 25 and 'ready to load in 15 minutes' in row['errorEn'] and row['source'] == 'engine'


def test_verbalize_items_cap_at_15():
    s, e, c = perfect()
    s['expected'].append({'eid': 'E97', 'itemId': 'protocols', 'weight': 100, 'licence': 'both', 'actionEn': 'Verbalize the maximum of 3 doses'})
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    row = next(x for x in r['rows'] if x['itemId'] == 'protocols')
    assert row['weight'] == 15 and 'cautions' in row['errorEn']


def test_finalize_closing_vets_the_model():
    sheet = {'notificationFacts': {'ageSex': 'x', 'cc': 'x', 'moi': None, 'vitals': 'x'}, 'handoffFacts': {'ageSex': 'x', 'meds': 'x', 'allergies': 'x', 'moi': None}}
    log = [{'t': 9 * M + 30000, 'role': 'candidate', 'text': "I'm priming the nitro spray and giving one spray."},
           {'t': 18 * M, 'role': 'candidate', 'text': 'Radio to the hospital: 62-year-old male, chest pain, BP 148 over 92.'},
           {'t': 24 * M, 'role': 'candidate', 'text': 'Hand-off: meds amlodipine, allergies none known.'}]
    inp = {'notification': {'given': True, 't': 1080, 'missing': ['moi', 'vitals']},
           'handoff': {'given': True, 't': 1440, 'missing': ['moi', 'meds', 'allergies', 'ageSex']},
           'pcr': {'missingFields': [], 'mismatches': []},
           'quality': [{'itemId': 'skill-drug-admin', 'weight': 10, 'errorEn': 'Does not verbalize they would prime the S/L spray prior to use', 'quote': 'priming', 't': 570},
                       {'itemId': 'pulse', 'weight': 3, 'errorEn': 'Consistently fails to verbalize strength and/or rhythm two or more times', 'quote': 'pulse', 't': 1}]}
    closing, quality = engine.finalize_closing(inp, sheet, log, True)
    assert closing['notification']['missing'] == []                      # vitals present in the radio report; moi not applicable
    assert closing['handoff']['missing'] == []                           # meds/allergies present; age/sex found in the adjacent radio line; moi n/a
    assert [q['itemId'] for q in quality] == ['pulse']                   # the priming pick is refuted by the candidate's words
    assert closing['pcr']['submitted'] is True


def test_drug_event_counts_as_protocol_initiated():
    s, e, c = perfect()
    s['expected'].append({'eid': 'E96', 'itemId': 'protocols', 'weight': 100, 'licence': 'both', 'actionEn': 'Initiate the protocol with correct indications'})
    r0 = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert any(x['itemId'] == 'protocols' for x in r0['rows'])            # nothing given: the umbrella item is missed
    r1 = engine.score(s, 'pcp', e + [ev(9.0, 'drug:entonox')], 22 * M, closing=c)
    assert not any(x['itemId'] == 'protocols' for x in r1['rows'])        # a drug was given: the protocol was initiated


def test_transport_items_are_engine_judged():
    s, e, c = perfect('rtc')
    s['expected'].append({'eid': 'E95', 'itemId': 'transport', 'weight': 25, 'licence': 'both', 'actionEn': 'Ready to load within 15 minutes'})
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    assert not any(x['itemId'] == 'transport' for x in r['rows']), r['rows']   # packaged at 12 min: nothing to deduct


DRUG_SHEET = {'drugs': [{'key': 'txa', 'namesEn': ['TXA', 'tranexamic acid'], 'licence': 'pcp'},
                        {'key': 'entonox', 'namesEn': ['Entonox', 'nitrous'], 'licence': 'both'},
                        {'key': 'asa', 'namesEn': ['ASA', 'aspirin'], 'licence': 'both'}]}


def test_drug_keyword_fallback_affirmative_only():
    f = lambda text, track='pcp', rep=(): [e['name'] for e in engine.drug_events(text, DRUG_SHEET, track, 1000, list(rep))]
    assert f('TXA 2 g IV over 1 minute with the 6 rights.') == ['drug:txa']
    assert f("Giving Entonox now, he'll self-administer.") == ['drug:entonox']
    assert f('No Entonox, he is in shock.') == []
    assert f('Entonox is contraindicated with a pneumothorax.') == []
    assert f('If his pain gets worse I would consider Entonox.') == []
    assert f('Have you taken any aspirin today?') == []
    assert f('TXA 2 g IV over 1 minute.', track='emr') == []                      # not an EMR drug
    assert f('Giving ASA 160 mg chewed.', rep=[{'name': 'drug:asa'}]) == []        # model already reported it


def test_quality_picks_filtered():
    cand = 'Radio to the receiving hospital: 52-year-old male. Pulse 120. Pulse 118.'
    q = [{'itemId': 'notification', 'weight': 5, 'errorEn': 'x', 'quote': 'Radio to the receiving hospital', 't': 1},
         {'itemId': 'rapid-body-survey', 'weight': 15, 'errorEn': 'y', 'quote': '[01:30] Examiner: The time of tourniquet application is 1006 hours.', 't': 2},
         {'itemId': 'protocols', 'weight': 100, 'errorEn': 'z', 'quote': 'Pulse 120', 't': 3},
         {'itemId': 'pulse', 'weight': 3, 'errorEn': 'Consistently fails to verbalize strength and/or rhythm two or more times', 'quote': '[00:30] Candidate: Pulse 120. Pulse 118.', 't': 4},
         {'itemId': 'pulse', 'weight': 3, 'errorEn': 'Consistently fails to verbalize strength and/or rhythm two or more times', 'quote': 'words the candidate never said at all', 't': 5}]
    kept = engine.veto_quality(q, cand)
    assert [(x['itemId'], x['t']) for x in kept] == [('pulse', 4)]


def test_presence_miss_is_capped_for_protocol_items():
    s, e, c = perfect()
    s['expected'].append({'eid': 'E99', 'itemId': 'protocols', 'weight': 100, 'licence': 'both', 'actionEn': 'Administer Entonox for pain when indicated'})
    r = engine.score(s, 'pcp', e, 22 * M, closing=c)
    row = next(x for x in r['rows'] if x['itemId'] == 'protocols')
    assert row['weight'] == 25 and not r['autofail'] and 'Fails to administer' in row['errorEn']
