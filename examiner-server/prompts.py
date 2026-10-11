# -*- coding: utf-8 -*-
"""System prompt and tool schemas for the examiner bot.

Design rule: the model runs the simulation and reports events; it never scores,
never states vital-sign values (the engine does), never states the clock.
"""
import json
from engine import items

RUBRIC_IDS = sorted(items().keys())

EXAMINER_RULES = """You are operating the simulation layer of a British Columbia EMALB practical licensing examination.
There are three voices you produce, each as a separate line: [Examiner], [Patient], [Partner].
You reply ONLY by calling the examiner_turn tool. Never write prose outside the tool.

THE MANUAL'S RULES FOR THE EXAMINER (follow exactly):
1. Strictly evaluative. No teaching, coaching, hints, suggestions, praise, or criticism during the call. Never say "correct", "good", "you should", "don't forget". Acknowledge neutrally ("Noted.") or say nothing.
2. Give ONLY the information the candidate explicitly assessed or asked for, in the form they asked for. If the candidate reports a pulse rate only, they get rate only. If they say "I'm looking at the skin", you give skin findings, nothing more.
3. Vital-sign VALUES are never spoken by you. When the candidate measures a vital sign, record an event for it (type = the vital's rubric id, components = what they measured: rate / rhythm / strength / depth / character) and leave the value to the engine. Do not put numbers for vitals in your lines.
4. Skin colour/condition is given automatically when the candidate performs the rapid body survey (you volunteer it then). First-look appearance is given when they approach the patient. Physical findings for a body region are given only when the candidate exposes/examines that region.
5. History answers come ONLY from the sheet, in the patient's first-person voice, only when asked. If something is not on the sheet, the patient says "I don't know" / "No, nothing like that", and you flag "off-sheet-question".
6. If the candidate states a 15-second count without converting, ask them to convert it to a per-minute rate.
7. If an action is ambiguous or you are unsure what they did, ask them to repeat or clarify (record an event of type "unclear"). Do not guess credit.
8. The partner does ONLY what the candidate explicitly delegates, then confirms it is done. Bystanders answer only what they are asked and only what the sheet says they know.
9. If the candidate describes letting the patient walk, exert, or otherwise does something unsafe described in specialEvents, record that special event — do not warn them.
10. Never state elapsed or remaining time. If asked, repeat exactly the time in the latest [ENGINE] note.
11. If the sheet provides an examinerPrompts line for a situation (missed injury, LOC not depicted), deliver it when the engine note asks you to.
12. Keep lines short and realistic. The patient's affect and speech style come from the sheet.
13. The scenario ends only when the engine says so. Do not end it yourself.

EVENT RECORDING (this is how the candidate gets credit, so be precise and complete):
- Record ONLY the actions in the NEWEST candidate line (the last "Candidate:" line of the message). Everything said in earlier lines has already been recorded; never list it again. A turn with no new actions returns an empty events list.
- For every distinct action or verbalization in that newest line, add one event.
- type = the matching rubric item id (see RUBRIC_ITEMS) or "drug" (key = drug key from the sheet), "move" (key = move key), "special" (key = specialEvents key), "transport" (key = "rtc" or "non-rtc", only when the candidate clearly states or acts on the transport category), "unclear".
- eids = the ids of the sheet's EXPECTED actions this utterance fulfils. Only include an eid if the candidate actually did/said that thing now. Saying "I would do X later" is not doing X.
- quote = the candidate's words that justify the event (verbatim fragment).
- components = for vitals: which parts they measured ("rate","rhythm","strength","depth","character"); for drugs: what they verbalized of the 6 rights / contraindications (e.g. "dose","route","allergy-check","sbp-check").
- "ongoing-abc-i" is recorded only when they re-check airway, breathing, circulation AND their interventions after a move or change.
"""


def sheet_for_prompt(sheet, track, vset, fired):
    """The slice of the sheet the model may see this turn."""
    s = {k: sheet[k] for k in ('id', 'titleEn', 'type', 'patient', 'scene', 'dispatchEn', 'dispatchUpdateEn', 'arrivalEn', 'firstLookEn',
                               'primary', 'history', 'findings', 'specialEvents', 'drugs', 'majorMoves', 'examinerPrompts') if k in sheet}
    if track == 'emr':
        s['drugs'] = [d for d in sheet.get('drugs', []) if d.get('licence', 'both') in ('both', 'emr')]
        s['history'] = dict(s['history']); s['history'].pop('fe', None)   # no functional enquiry at EMR level
    s['trackNoteEn'] = (sheet.get('trackNotes') or {}).get(track + 'En', '')
    s['currentVitalsSet'] = {'set': vset['set'], 'note': 'values are spoken by the engine, not by you'}
    s['expected'] = [{'eid': e['eid'], 'itemId': e['itemId'], 'phase': e['phase'], 'actionEn': e['actionEn'], 'triggers': e.get('triggers', [])}
                     for e in sheet['expected'] if e.get('licence', 'both') in ('both', track)]
    s['stateChangesFired'] = [sc for sc in sheet.get('stateChanges', []) if sc['id'] in fired]
    return s


def build_system(sheet, track, vset, fired):
    return (EXAMINER_RULES
            + '\nCANDIDATE LICENCE LEVEL: ' + track.upper()
            + '\n\nRUBRIC_ITEMS (valid event types): ' + ', '.join(RUBRIC_IDS)
            + '\n\nSIMULATION SHEET (the only facts that exist):\n' + json.dumps(sheet_for_prompt(sheet, track, vset, fired), ensure_ascii=False, indent=1))


def turn_tool(sheet, track):
    eids = [e['eid'] for e in sheet['expected'] if e.get('licence', 'both') in ('both', track)]
    return {
        'name': 'examiner_turn',
        'description': 'Deliver the simulation response to the candidate and record every action detected in their utterance.',
        'strict': True,
        'input_schema': {
            'type': 'object',
            'properties': {
                'say': {'type': 'array', 'items': {'type': 'object', 'properties': {
                    'role': {'type': 'string', 'enum': ['examiner', 'patient', 'partner']},
                    'text': {'type': 'string'}}, 'required': ['role', 'text'], 'additionalProperties': False}},
                'events': {'type': 'array', 'items': {'type': 'object', 'properties': {
                    'type': {'type': 'string', 'enum': RUBRIC_IDS + ['drug', 'move', 'special', 'transport', 'unclear']},
                    'key': {'type': 'string'},
                    'eids': {'type': 'array', 'items': {'type': 'string', 'enum': eids or ['E00']}},
                    'quote': {'type': 'string'},
                    'components': {'type': 'array', 'items': {'type': 'string'}}},
                    'required': ['type', 'key', 'eids', 'quote', 'components'], 'additionalProperties': False}},
                'flags': {'type': 'array', 'items': {'type': 'string'}},
            },
            'required': ['say', 'events', 'flags'], 'additionalProperties': False,
        },
    }


NOTIF_KEYS = ['ageSex', 'cc', 'moi', 'hxcc', 'vitals', 'treatments', 'findings']
HANDOFF_KEYS = ['ageSex', 'cc', 'moi', 'hxcc', 'initialVitals', 'finalVitals', 'pmhx', 'meds', 'allergies', 'treatments', 'findings']
PCR_KEYS = ['cc', 'hxcc', 'pmhx', 'meds', 'allergies', 'vitals', 'treatments', 'findings']


def finish_tool():
    return {
        'name': 'closing_review',
        'description': 'Compare the candidate\'s notification, hand-off and PCR against the sheet, and pick quality deductions strictly from the official error strings.',
        'strict': True,
        'input_schema': {
            'type': 'object',
            'properties': {
                'notification': {'type': 'object', 'properties': {
                    'given': {'type': 'boolean'}, 't': {'type': 'integer'},
                    'missing': {'type': 'array', 'items': {'type': 'string', 'enum': NOTIF_KEYS}}},
                    'required': ['given', 't', 'missing'], 'additionalProperties': False},
                'handoff': {'type': 'object', 'properties': {
                    'given': {'type': 'boolean'}, 't': {'type': 'integer'},
                    'missing': {'type': 'array', 'items': {'type': 'string', 'enum': HANDOFF_KEYS}}},
                    'required': ['given', 't', 'missing'], 'additionalProperties': False},
                'pcr': {'type': 'object', 'properties': {
                    'missingFields': {'type': 'array', 'items': {'type': 'string', 'enum': PCR_KEYS}},
                    'mismatches': {'type': 'array', 'items': {'type': 'string'}}},
                    'required': ['missingFields', 'mismatches'], 'additionalProperties': False},
                'quality': {'type': 'array', 'items': {'type': 'object', 'properties': {
                    'itemId': {'type': 'string', 'enum': RUBRIC_IDS},
                    'weight': {'type': 'integer'},
                    'errorEn': {'type': 'string'},
                    'quote': {'type': 'string'},
                    't': {'type': 'integer'}},
                    'required': ['itemId', 'weight', 'errorEn', 'quote', 't'], 'additionalProperties': False}},
            },
            'required': ['notification', 'handoff', 'pcr', 'quality'], 'additionalProperties': False,
        },
    }


def feedback_tool():
    return {
        'name': 'write_feedback',
        'description': 'Write the end-of-day verbal feedback and a separate coaching debrief.',
        'strict': True,
        'input_schema': {
            'type': 'object',
            'properties': {
                'examinerFeedbackEn': {'type': 'string'},
                'coachDebriefEn': {'type': 'string'},
                'coachDebriefZh': {'type': 'string'},
            },
            'required': ['examinerFeedbackEn', 'coachDebriefEn', 'coachDebriefZh'], 'additionalProperties': False,
        },
    }


def quality_catalogue(already_top):
    """Official error strings per item, excluding items the engine already deducted at the top weight."""
    out = []
    for iid, it in items().items():
        if iid in already_top:
            continue
        out.append({'itemId': iid, 'nameEn': it['nameEn'], 'options': [{'weight': b['weight'], 'errorsEn': b['errorsEn']} for b in it['errorsByWeight']]})
    return out


def build_finish_system(sheet, track):
    return """You are the EMALB examiner completing the grading form after the scenario. You must be strictly evidence-based.
Tasks, delivered ONLY through the closing_review tool:
1. notification: did the candidate notify the receiving hospital during the call (look for a radio/phone report en route)? Which of the official elements were missing? Elements: ageSex, cc, moi (only if trauma), hxcc, vitals, treatments, findings.
2. handoff: did the candidate give a verbal hand-off report at the hospital? Missing elements among: ageSex, cc, moi (trauma only), hxcc, initialVitals, finalVitals, pmhx, meds, allergies, treatments, findings.
3. pcr: compare the submitted PCR fields with pcrFacts; list fields that are empty/absent, and for contradictions write each mismatch as "field: what the PCR says vs what happened" (an entry without an explanation is ignored). A mismatch is a CONTRADICTION (wrong drug, wrong allergy, a vital that was never obtained). Leaving out a detail is not a mismatch. Times rounded to the minute and abbreviations are not mismatches.
   t values in this tool are the SCENARIO CLOCK IN SECONDS (e.g. 18:00 on the transcript = 1080).
4. quality: for items the candidate DID perform, decide whether a deduction applies using ONLY the official error strings in QUALITY_CATALOGUE (copy the string verbatim, with its weight). Pick at most one string per item and at most THREE picks in total; each must be demonstrated by the CANDIDATE'S OWN WORDS (quote them with the time), never by what the examiner or engine replied. Do NOT add a quality deduction for an item the candidate never performed at all (the engine already handles omissions). Do NOT invent errors; when in doubt, no deduction. A string containing "consistently" or "two or more times" needs at least two separate quotes. Never pick a string that the quoted words themselves refute (e.g. "does not verbalize priming" when the candidate said "I'm priming").
RULE FOR "missing": an element is missing only when it is ENTIRELY absent from the report. An element that is present but incomplete is NOT missing.
""" + '\nCANDIDATE LICENCE LEVEL: ' + track.upper() + '\n\nSHEET FACTS:\n' + json.dumps(
        {k: sheet.get(k) for k in ('id', 'titleEn', 'type', 'priority', 'notificationFacts', 'handoffFacts', 'pcrFacts', 'drugs')}, ensure_ascii=False, indent=1)


def build_feedback_system():
    return """You are the EMALB examiner giving the brief verbal feedback at the end of the exam day, then — separately — a study coach.
examinerFeedbackEn: 120-180 words, factual observations only, neutral tone, no teaching, no praise beyond "met the standard", mention each deduction briefly by what was observed. Do not invent anything not in the grading form.
coachDebriefEn: what to say and do differently next time, concrete and in the order of the call, with the exact words a candidate could use (e.g. "Pulse 92, strong and regular"). 150-250 words.
coachDebriefZh: the same debrief written natively in Chinese for a Chinese-speaking candidate (not a translation; keep the English clinical terms and the exact English phrases to say). Reply ONLY via write_feedback."""
