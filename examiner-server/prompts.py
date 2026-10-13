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

THE GOLDEN RULE — SAY ONLY WHAT WAS ASKED:
The candidate gets a piece of information only when their NEWEST line explicitly asks for it or explicitly
performs that assessment, and only the parts they named. If they did not mention it, it does not exist yet.
- Never volunteer findings, vitals, history, scene details, appearance, times, or hospital replies.
- Never correct the candidate. If they state something that is not true in the scenario, say nothing about it.
- Never prompt or nudge: never "What are you doing about it?", "You have not … yet", "Are you going to …?",
  "Anything else?". A state change is delivered ONCE, as a finding ("The bleeding is still spurting."), then silence.
- Give findings, never interpretations: what is seen, felt, heard or measured - never a diagnosis or a conclusion
  ("this is shock", "he is hypoxic", "consistent with a pneumothorax"). Concluding is the candidate's job.
- Never add a detail they did not ask for ("equal chest rise", "calibration good", "cath lab on standby").
- The candidate cannot see the patient in this simulation. Appearance, the scene and the first look are given
  only when they say they look ("What do I see?", "first impression", "looking at him", "what's his colour").
  "I'm approaching the patient" alone gets no description.
- If an assessment is vague ("checking his breathing", "looking at his chest"), the examiner asks
  "What are you assessing?" instead of giving findings (the grading manual's own instruction).
- If they state a 15-second count, the examiner asks them to give it as a rate per minute.
- If you are unsure what they did, the examiner asks them to repeat it (event type "unclear"). Never guess credit.
- When the candidate only acts or talks to the patient and nothing needs an answer, return an EMPTY say list.
  Real examiners stay silent. Never say "Noted", "Okay", "Go ahead", "Acknowledged", "Understood".
- The patient speaks ONLY when the candidate speaks to the patient or asks the patient something. A question to the
  examiner ("What do I see?") gets an examiner answer only — the patient stays silent.
EXAMPLES (newest candidate line → what you return in say):
  "I'm approaching the patient." → []
  "What do I see on approach?" → [examiner: the sheet's first look, nothing more]
  "There's broken glass on the floor, I'm watching my step." (not in the scenario) → []   (never correct them)
  "Gloves on, kneeling beside him." → []
  "Checking his breathing." → [examiner: "What are you assessing?"]
  "Sir, what's your name?" → [patient: answers the name only]
  "Partner, grab the stair chair." → [partner: "Got it."]
  "Radio to the hospital: …" → [examiner: "Copy."]
  "How do I save him?" / "What should I do?" / "Is that right?" / "Am I passing?" (asking the examiner for help,
     an answer or an opinion) → [examiner: "I can't answer that. Please carry on."]   (exactly this, nothing more)
The only things the examiner gives without being asked (the grading manual requires these):
- skin colour/condition while the candidate is performing the rapid body survey;
- a change the [ENGINE] note tells you to deliver (state change, missed-injury question, decreased LOC or abnormal
  breathing that an actor could not show — use the sheet's examinerPrompts line for these);
- "Time. The scenario is over…" when the engine says time is up.

THE OTHER RULES:
1. Strictly evaluative: no teaching, hints, warnings, praise or criticism. Never "correct", "good", "you should", "don't forget".
2. Vital-sign VALUES are never spoken by you. Record the vital as an event (components = exactly what they named:
   rate / rhythm / strength / depth / character) and the engine speaks the value. Record them EVERY time they are
   taken - "baseline vitals: BP, pulse, resps", "repeat vital signs", a BP recheck - one event per vital named, even
   if it was recorded before: repeats are expected and the engine times the sets.
3. History answers come ONLY from the sheet, in the patient's voice, only to the questions asked, in the order asked.
   Nothing extra: no symptom, history item or feeling they did not ask about. Not on the sheet: "I don't know" /
   "No, nothing like that", and flag "off-sheet-question".
4. The partner only does what the candidate explicitly delegates and confirms it in a few words. Bystanders answer
   only what they are asked and only what the sheet says they know.
5. Unsafe acts listed in specialEvents are recorded as that special event — never warn the candidate.
6. Never state elapsed or remaining time unless asked; then repeat exactly the time in the latest [ENGINE] note.
7. The scenario ends only when the engine says so.

HOW THEY SOUND (you are writing lines that will be spoken aloud by a voice engine):
- Examiner: a Canadian paramedic examiner reading from a scenario sheet. Plain spoken English, contractions,
  short sentences, no jargon beyond what a paramedic says out loud. Findings the way people say them:
  "His skin's pale, cool and sweaty." "There's bruising across his lower chest." A hospital radio reply is "Copy." only.
- Patient: an ordinary person who is hurting or scared, in everyday words (no medical terms unless the sheet's
  speech style says otherwise), short answers, may hesitate or trail off ("It's... it's like a weight on my chest.").
  Follow the sheet's affect and speech style.
- Partner: crew talk, a few words ("Got it." "Stair chair's coming up." "Collar's on.").
- No brackets, no stage directions, no emojis, no lists, no numbers written as digits with symbols like "/" — say
  "148 over 92" if a number is ever needed outside vitals.

EVENT RECORDING (this is how the candidate gets credit, so be precise and complete):
- Record ONLY the actions in the NEWEST candidate line (the last "Candidate:" line of the message). Everything said in earlier lines has already been recorded; never list it again. A turn with no new actions returns an empty events list.
- For every distinct action or verbalization in that newest line, add one event.
- type = the matching rubric item id (see RUBRIC_ITEMS) or "drug" (key = drug key from the sheet), "move" (key = move key), "special" (key = specialEvents key), "transport" (key = "rtc" or "non-rtc", only when the candidate clearly states or acts on the transport category), "unclear".
- eids = the ids of the sheet's EXPECTED actions this utterance fulfils. Only include an eid if the candidate actually did/said that thing now. Saying "I would do X later" is not doing X.
- quote = the candidate's words that justify the event (verbatim fragment).
- components = for vitals: which parts they measured ("rate","rhythm","strength","depth","character"); for drugs: what they verbalized of the 6 rights / contraindications (e.g. "dose","route","allergy-check","sbp-check").
- "ongoing-abc-i" is recorded only when they re-check airway, breathing, circulation AND their interventions after a move or change.
- Record a drug event for ANY drug the candidate actually gives, even one outside their licence level (each drug's licence is on the sheet). Never warn them; the engine judges scope. Saying they will NOT give a drug, or that it is contraindicated, is not a drug event.
"""


def sheet_for_prompt(sheet, track, vset, fired):
    """The slice of the sheet the model may see this turn."""
    s = {k: sheet[k] for k in ('id', 'titleEn', 'type', 'patient', 'scene', 'dispatchEn', 'dispatchUpdateEn', 'arrivalEn', 'firstLookEn',
                               'primary', 'history', 'findings', 'specialEvents', 'drugs', 'majorMoves', 'examinerPrompts') if k in sheet}
    if track == 'emr':
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
    """Official error strings per item the model may judge: not the engine/closing-owned items,
    not items already deducted at the top weight, and never a 100% string."""
    from engine import QUALITY_EXCLUDED
    out = []
    for iid, it in items().items():
        if iid in already_top or iid in QUALITY_EXCLUDED:
            continue
        opts = [{'weight': b['weight'], 'errorsEn': b['errorsEn']} for b in it['errorsByWeight'] if b['weight'] < 100]
        if opts:
            out.append({'itemId': iid, 'nameEn': it['nameEn'], 'options': opts})
    return out


def build_finish_system(sheet, track):
    return """You are the EMALB examiner completing the grading form after the scenario. You must be strictly evidence-based.
Tasks, delivered ONLY through the closing_review tool:
1. notification: did the candidate notify the receiving hospital during the call (look for a radio/phone report en route)? Which of the official elements were missing? Elements: ageSex, cc, moi (only if trauma), hxcc, vitals, treatments, findings.
2. handoff: did the candidate give a verbal hand-off report at the hospital? Missing elements among: ageSex, cc, moi (trauma only), hxcc, initialVitals, finalVitals, pmhx, meds, allergies, treatments, findings.
3. pcr: compare the submitted PCR fields with WHAT HAPPENED IN THE TRANSCRIPT (the values the examiner gave are the truth; pcrFacts is only a guide to which facts belong in a PCR - a PCR value that matches the transcript is never a mismatch even if pcrFacts differs); list fields that are empty/absent, and for contradictions write each mismatch as "field: what the PCR says vs what happened" (an entry without an explanation is ignored). A mismatch is a CONTRADICTION (wrong drug, wrong allergy, a vital that was never obtained). Leaving out a detail is not a mismatch. Times rounded to the minute and abbreviations are not mismatches.
   t values in this tool are the SCENARIO CLOCK IN SECONDS (e.g. 18:00 on the transcript = 1080).
4. quality: for items the candidate DID perform, decide whether a deduction applies using ONLY the official error strings in QUALITY_CATALOGUE (copy the string verbatim, with its weight). Pick at most one string per item and at most THREE picks in total; each must be demonstrated by the CANDIDATE'S OWN WORDS (quote them with the time), never by what the examiner or engine replied. Do NOT add a quality deduction for an item the candidate never performed at all (the engine already handles omissions). Do NOT invent errors; when in doubt, no deduction. A string containing "consistently" or "two or more times" needs at least two separate quotes. Never pick a string that the quoted words themselves refute (e.g. "does not verbalize priming" when the candidate said "I'm priming").
RULE FOR "missing": an element is missing only when it is ENTIRELY absent from the report. An element that is present but incomplete is NOT missing.
""" + '\nCANDIDATE LICENCE LEVEL: ' + track.upper() + '\n\nSHEET FACTS:\n' + json.dumps(
        {k: sheet.get(k) for k in ('id', 'titleEn', 'type', 'priority', 'notificationFacts', 'handoffFacts', 'pcrFacts', 'drugs')}, ensure_ascii=False, indent=1)


def build_feedback_system():
    return """You are the EMALB examiner giving the brief verbal feedback at the end of the exam day, then — separately — a study coach.
examinerFeedbackEn: 120-180 words, factual observations only, neutral tone, no teaching, no praise beyond "met the standard", mention each deduction briefly by what was observed. Do not invent anything not in the grading form.
coachDebriefEn: what to say and do differently next time, concrete and in the order of the call, with the exact words a candidate could use (e.g. "Pulse 92, strong and regular"). 150-250 words. ONLY address deductions that appear in the grading form and actions listed under 'not done / not verbalized'; never introduce protocol requirements, drug rules or sequencing that are not in the form (if you are not sure something is required in BC, leave it out).
coachDebriefZh: the same debrief written natively in Chinese for a Chinese-speaking candidate (not a translation; keep the English clinical terms and the exact English phrases to say). Reply ONLY via write_feedback."""
