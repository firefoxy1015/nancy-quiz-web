# -*- coding: utf-8 -*-
"""AI Examiner API for the BC EMR/PCP exam-prep site.

Stateless: the browser keeps the whole run (log + events) and sends it back on
every call. The server owns the sheets, the model channel and the scoring engine.
"""
import datetime, json, os, re, time
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

import engine, prompts, llm

app = FastAPI(title='bcprep examiner')
ORIGINS = [o.strip() for o in os.environ.get('EXAMINER_ORIGINS', 'https://firefoxy1015.github.io,http://localhost:8765,http://127.0.0.1:8765').split(',') if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=['*'], allow_headers=['*'])

DAILY_CAP = int(os.environ.get('EXAMINER_DAILY_CAP', '4'))
_usage: Dict[str, Dict[str, int]] = {}


def _today():
    return datetime.date.today().isoformat()


def _count(device, inc=0):
    day = _usage.setdefault(_today(), {})
    for k in [k for k in _usage if k != _today()]:
        _usage.pop(k, None)
    day[device] = day.get(device, 0) + inc
    return day[device]


def fmt_t(ms):
    s = max(0, int(ms // 1000))
    return f'{s // 60:02d}:{s % 60:02d}'


class StartReq(BaseModel):
    scenarioId: str
    track: str


class TurnReq(BaseModel):
    scenarioId: str
    track: str
    elapsedMs: int
    text: str
    log: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []
    fired: List[str] = []


class FinishReq(BaseModel):
    scenarioId: str
    track: str
    endMs: int
    log: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []
    pcr: Dict[str, Any] = {}


@app.get('/health')
def health():
    return {'ok': True, 'channels': [c['name'] for c in llm.CHANNELS], 'model': llm.MODEL, 'sheets': engine.list_sheets()}


@app.get('/api/examiner/scenarios')
def scenarios():
    return {'scenarios': engine.list_sheets()}


@app.post('/api/examiner/start')
def start(req: StartReq, x_device: Optional[str] = Header(default=None)):
    if req.track not in ('emr', 'pcp'):
        raise HTTPException(400, 'track must be emr or pcp')
    try:
        sheet = engine.load_sheet(req.scenarioId)
    except FileNotFoundError:
        raise HTTPException(404, 'unknown scenario')
    device = x_device or 'anon'
    if _count(device) >= DAILY_CAP:
        raise HTTPException(429, f'daily limit of {DAILY_CAP} examiner sessions reached')
    n = _count(device, 1)
    sc = sheet['scene']
    return {
        'scenario': {'id': sheet['id'], 'titleEn': sheet['titleEn'], 'type': sheet['type']},
        'brief': {'dispatchEn': sheet['dispatchEn'], 'dispatchUpdateEn': sheet.get('dispatchUpdateEn'),
                  'equipmentEn': sc.get('equipmentEn', []), 'partnerEn': sc.get('partnerEn', ''),
                  'trackNoteEn': (sheet.get('trackNotes') or {}).get(req.track + 'En', '')},
        'expectedCount': len(engine.applicable_expected(sheet, req.track)),
        'dailyLeft': max(0, DAILY_CAP - n),
    }


def _normalize_events(sheet, track, raw, t):
    drug_keys = {d['key'] for d in sheet.get('drugs', []) if d.get('licence', 'both') in ('both', track)}
    moves = set(sheet.get('majorMoves', []))
    specials = {s['key'] for s in sheet.get('specialEvents', [])}
    valid_eids = {e['eid'] for e in sheet['expected']}
    out = []
    for e in raw or []:
        typ, key = e.get('type', ''), (e.get('key') or '').strip().lower()
        if typ == 'drug':
            if key not in drug_keys:
                continue
            name = f'drug:{key}'
        elif typ == 'move':
            if key not in moves:
                continue
            name = f'move:{key}'
        elif typ == 'special':
            if key not in specials:
                continue
            name = key
        elif typ == 'transport':
            if key not in ('rtc', 'non-rtc'):
                continue
            name = f'transport:{key}'
        elif typ == 'unclear':
            continue
        elif typ in engine.items():
            name = typ
        else:
            continue
        out.append({'t': t, 'name': name, 'eids': [x for x in (e.get('eids') or []) if x in valid_eids],
                    'quote': (e.get('quote') or '')[:300], 'components': [c.lower() for c in (e.get('components') or [])][:8]})
    return out


def _history_messages(log):
    """Rebuild the conversation. Candidate turns become user messages (with the
    engine note that preceded them); simulation lines become assistant text."""
    msgs = []
    buf_user, buf_asst = [], []
    for entry in log:
        role = entry.get('role')
        line = entry.get('text', '')
        if role == 'candidate':
            if buf_asst:
                msgs.append({'role': 'assistant', 'content': '\n'.join(buf_asst)}); buf_asst = []
            buf_user.append(f"[{fmt_t(entry.get('t', 0))}] Candidate: {line}")
        elif role == 'engine':
            buf_user.append(f"[ENGINE] {line}")
        else:
            if buf_user:
                msgs.append({'role': 'user', 'content': '\n'.join(buf_user)}); buf_user = []
            buf_asst.append(f"[{role.capitalize()}] {line}")
    if buf_asst:
        msgs.append({'role': 'assistant', 'content': '\n'.join(buf_asst)})
    if buf_user:
        msgs.append({'role': 'user', 'content': '\n'.join(buf_user)})
    # the API requires alternation starting with user; merge any accidental doubles
    merged = []
    for m in msgs:
        if merged and merged[-1]['role'] == m['role']:
            merged[-1]['content'] += '\n' + m['content']
        else:
            merged.append(m)
    if merged and merged[0]['role'] == 'assistant':
        merged.insert(0, {'role': 'user', 'content': '[ENGINE] Simulation started.'})
    return merged


VITAL_WORDS = {'blood-pressure': ['bp', 'blood pressure'], 'pulse': ['pulse', 'heart rate'], 'respirations': ['resp', 'breath'],
               'gcs': ['gcs'], 'pulse-oximetry': ['spo2', 'sat', 'oximet'], 'blood-glucose': ['bgl', 'glucose', 'sugar'],
               'temperature': ['temp'], 'pupils': ['pupil'], 'skin-vitals': ['skin']}


def _strip_vital_numbers(say, vital_events):
    """The engine speaks vitals. Drop model lines that leak a value for a vital just measured."""
    if not vital_events:
        return say
    out = []
    for s in say:
        txt = s['text']
        leaky = any(re.search(r'\d{2,3}(\s*/\s*\d{2,3})?', txt) and any(w in txt.lower() for w in VITAL_WORDS.get(v['name'], [])) for v in vital_events)
        if s['role'] == 'examiner' and leaky:
            continue
        out.append(s)
    return out


@app.post('/api/examiner/turn')
def turn(req: TurnReq):
    sheet = engine.load_sheet(req.scenarioId)
    track = req.track
    t = req.elapsedMs
    fired = set(req.fired)
    vset = engine.current_vitals_set(sheet, req.events, t, fired)
    due = engine.due_state_changes(sheet, req.events, t, fired)
    engine_lines = []
    note = [f'time {fmt_t(t)}', f'vitals set {vset["set"]} unlocked']
    for sc in due:
        note.append(f'STATE CHANGE "{sc["id"]}" is now in effect; deliver its examinerLineEn now: "{sc.get("examinerLineEn","")}"')
        fired.add(sc['id'])
    if t >= engine.EXAM_MS:
        note.append('TIME IS UP: say only "[Examiner] Time. The scenario is over. Please complete your patient care report." and record events for this final utterance.')
    if t >= 12 * 60000 and not any(e['name'].startswith('transport:') for e in req.events):
        note.append('No transport category recorded yet: if the candidate has not conveyed RTC/non-RTC by action, you may ask "What is your transport category and where are we in your timeline?"')
    system = prompts.build_system(sheet, track, vset, fired)
    history = _history_messages(req.log)
    user = f"[ENGINE] {' | '.join(note)}\n[{fmt_t(t)}] Candidate: {req.text}"
    messages = history + [{'role': 'user', 'content': user}]
    inp, ch, status = llm.tool_call(system, messages, prompts.turn_tool(sheet, track))
    if status != 'ok' or not inp:
        return {'say': [{'role': 'examiner', 'text': 'Please repeat that.'}], 'events': [], 'fired': sorted(fired),
                'engineLines': [], 'flags': [f'model-{status}'], 'channel': ch}
    raw_events = _normalize_events(sheet, track, inp.get('events'), t)
    raw_events += engine.keyword_events(req.text, sheet, t, raw_events + req.events)
    cand_lines = [{'t': e.get('t', 0), 'text': e.get('text', '')} for e in req.log if e.get('role') == 'candidate'] + [{'t': t, 'text': req.text}]
    events, vital_events = engine.merge_events(req.events, raw_events, cand_lines, t)
    say = _strip_vital_numbers([s for s in inp.get('say', []) if s.get('text')], vital_events)
    # engine speaks the vitals, only what was measured, from the unlocked set (re-evaluated with the new events)
    vset_now = engine.current_vitals_set(sheet, req.events + events, t, fired)
    for v in vital_events:
        line = engine.format_vital(vset_now, v['name'], v.get('components'))
        if line:
            engine_lines.append(line)
    return {'say': say, 'events': events, 'fired': sorted(fired), 'engineLines': engine_lines,
            'flags': [f for f in inp.get('flags', []) if f][:5], 'channel': ch}


@app.post('/api/examiner/finish')
def finish(req: FinishReq):
    sheet = engine.load_sheet(req.scenarioId)
    track = req.track
    end_ms = min(req.endMs, engine.EXAM_MS)
    # pass 1: engine-only form to know which items are already at their top weight
    pre = engine.score(sheet, track, req.events, end_ms)
    already_top = {r['itemId'] for r in pre['rows'] if r['weight'] >= engine.items().get(r['itemId'], {'weights': [r['weight']]})['weights'][0]}
    transcript = '\n'.join(f"[{fmt_t(e.get('t', 0))}] {e.get('role','').capitalize()}: {e.get('text','')}" for e in req.log)
    pcr_submitted = any((v or '').strip() for v in req.pcr.values()) if req.pcr else False
    user = ('TRANSCRIPT:\n' + transcript[-60000:] + '\n\nSUBMITTED PCR:\n' + json.dumps(req.pcr, ensure_ascii=False, indent=1)
            + '\n\nENGINE DEDUCTIONS ALREADY MADE (do not duplicate):\n' + json.dumps([{k: r[k] for k in ('itemId', 'weight', 'errorEn')} for r in pre['rows']], ensure_ascii=False)
            + '\n\nQUALITY_CATALOGUE:\n' + json.dumps(prompts.quality_catalogue(already_top), ensure_ascii=False))
    inp, ch, status = llm.tool_call(prompts.build_finish_system(sheet, track), [{'role': 'user', 'content': user}], prompts.finish_tool(),
                                    model=llm.FINISH_MODEL, max_tokens=4000)
    closing, quality = engine.finalize_closing(inp if status == 'ok' else None, sheet, req.log, pcr_submitted)
    form = engine.score(sheet, track, req.events, end_ms, closing=closing, quality=quality)
    # feedback
    fb_user = ('GRADING FORM:\n' + json.dumps({k: form[k] for k in ('score', 'pass', 'autofail', 'rows', 'vitalsSets', 'transport')}, ensure_ascii=False, indent=1)
               + '\n\nTRANSCRIPT (for wording the debrief):\n' + transcript[-30000:])
    fb, ch2, st2 = llm.tool_call(prompts.build_feedback_system(), [{'role': 'user', 'content': fb_user}], prompts.feedback_tool(),
                                 model=llm.FINISH_MODEL, max_tokens=3000)
    feedback = fb if (st2 == 'ok' and fb) else {'examinerFeedbackEn': 'Feedback unavailable.', 'coachDebriefEn': '', 'coachDebriefZh': ''}
    return {'form': form, 'closing': closing, 'feedback': feedback, 'channel': ch, 'finishStatus': status}
