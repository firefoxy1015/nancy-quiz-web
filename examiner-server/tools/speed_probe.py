# -*- coding: utf-8 -*-
"""Time one realistic examiner turn across model/effort settings on the configured channel.

Usage (CCVIBE_API_KEY in env): python examiner-server/tools/speed_probe.py
Replays the first 10 turns of the md-02 clean script as history, then times the 11th.
"""
import io, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import anthropic, engine, prompts, main

sheet = engine.load_sheet('md-02')
track = 'pcp'
lines = [
    (0.3, "Scene is safe, medical call, one patient, stairs are the egress problem. Gloves and eye protection on."),
    (1.2, "He's alert, A on AVPU. Airway open. Breathing rate, depth and effort. Radial pulse rate, strength, regularity."),
    (1.8, "Modified rapid body survey. What does his skin look like?"),
    (2.8, "Any allergy to aspirin, ulcers, can you swallow? Giving ASA 160 milligrams chewed."),
    (3.6, "When did this start, what were you doing, what makes it better or worse, what does it feel like, does it go anywhere, 0 to 10?"),
    (5.0, "Baseline vitals: BP by auscultation, pulse rate strength rhythm, respirations rate depth character, GCS, pupils, skin."),
]
log = [{'t': 0, 'role': 'examiner', 'text': 'You may begin.'}]
for m, txt in lines:
    log.append({'t': int(m * 60000), 'role': 'candidate', 'text': txt})
    log.append({'t': int(m * 60000), 'role': 'examiner', 'text': 'Noted.'})
utt = "His systolic is above 110, heart rate between 50 and 150, no Viagra or Cialis. Priming the nitro spray, one spray 0.4 milligrams sublingual. Max three doses in 30 minutes."
vset = engine.current_vitals_set(sheet, [], 6 * 60000, set())
system = prompts.build_system(sheet, track, vset, set())
msgs = main._history_messages(log) + [{'role': 'user', 'content': f"[ENGINE] time 06:00 | vitals set 1 unlocked\n[06:00] Candidate: {utt}"}]
tool = prompts.turn_tool(sheet, track)
client = anthropic.Anthropic(api_key=os.environ['CCVIBE_API_KEY'], base_url=os.environ.get('CCVIBE_BASE_URL', 'https://cc-vibe.com'), timeout=180.0, max_retries=0)

for model, effort in [('claude-opus-5-5', None), ('claude-opus-5-5', 'low'), ('claude-sonnet-5-5', None), ('claude-sonnet-5-5', 'low')]:
    kw = dict(model=model, max_tokens=2000, system=system, messages=msgs, tools=[tool])
    if effort:
        kw['output_config'] = {'effort': effort}
    t0 = time.time()
    try:
        r = client.messages.create(**kw)
        dt = time.time() - t0
        tu = [b for b in r.content if b.type == 'tool_use']
        ev = [e['type'] + (':' + e['key'] if e.get('key') else '') for e in (tu[0].input.get('events', []) if tu else [])]
        print(f"{model:18s} effort={effort or 'default':7s} {dt:5.1f}s  out={r.usage.output_tokens:4d} tool={'yes' if tu else 'NO '} events={ev}")
    except Exception as e:
        print(f"{model:18s} effort={effort or 'default':7s} ERROR {type(e).__name__}: {str(e)[:120]}")
