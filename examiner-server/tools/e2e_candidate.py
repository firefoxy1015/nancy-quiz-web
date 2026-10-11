# -*- coding: utf-8 -*-
"""Drive a scripted candidate through the live API to check the model loop end to end.

Usage: python examiner-server/tools/e2e_candidate.py md-02 pcp [base_url]
Prints every exchange, the events the server recorded, and the final grading form.
Spends real model calls (one per turn + two at finish).
"""
import io, json, sys, time, urllib.request

sid, track = sys.argv[1], sys.argv[2]
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://127.0.0.1:8787'
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def post(path, body):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(), headers={'content-type': 'application/json', 'X-Device': 'e2e-script'}, method='POST')
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


SCRIPTS = {
    'md-02': [
        (0.3, "Scene assessment: the townhouse looks safe, it's a medical call, one patient, 14 narrow stairs are going to be our egress problem. Gloves and eye protection on. Partner, bring the stair chair and the cot to the bottom of the stairs."),
        (1.0, "Approaching the patient. Sir, my name is Alex, I'm a paramedic. Can you tell me your name and what's going on today?"),
        (1.6, "He's alert and oriented, so A on AVPU. Airway is open, he's talking in short sentences. Breathing — I'm looking at rate, depth and effort. Checking his radial pulse for rate, strength and regularity. No c-spine concerns, medical presentation."),
        (2.6, "Modified rapid body survey for a medical patient — chest, abdomen, pelvis, legs, arms, back. What does his skin look like?"),
        (3.2, "SpO2 on the finger please. If it's 94 or above I'm not putting him on oxygen. I'm keeping him sitting in a position of comfort, no exertion at all."),
        (4.0, "Okay sir, I want you to chew these — that's ASA 160 milligrams, two baby aspirin, chewed and swallowed. Before that: any allergy to aspirin? Any stomach ulcers or bleeding? Can you swallow okay? Have you taken any aspirin already today?"),
        (5.0, "This is a cardiac chest pain, he's unstable, we're RTC. Partner, get the stair chair up here, we're carrying him down, he is not walking."),
        (5.8, "Sir, when did this start? What were you doing? Does anything make it better or worse? What does it feel like? Does it go anywhere? Had this before? On a scale of 0 to 10, how bad is it? Has it been constant?"),
        (7.0, "Any medical history — heart problems, high blood pressure, diabetes, cholesterol? Smoker? What medications do you take? Any Viagra, Levitra or Cialis in the last couple of days? Any allergies? When did you last eat or drink?"),
        (8.2, "Baseline vitals. Blood pressure, I'm auscultating on the left arm. Pulse rate, strength and rhythm. Respirations rate, depth and character. GCS: eyes 4, verbal 5, motor 6, 15. Pupils. Skin."),
        (9.5, "BP is above 110, heart rate is between 50 and 150, no PDE5 inhibitors, no allergy to nitro. I'm priming the nitro spray and giving one spray, 0.4 milligrams sublingual. Sir, lift your tongue. Time of dose noted."),
        (12.0, "Reassessing: airway open, breathing unchanged, radial pulse present. How's the pain now, 0 to 10? Rechecking blood pressure before the next dose."),
        (13.5, "Second nitro spray 0.4 milligrams sublingual, time noted. We're moving him on the stair chair down to the cot now — partner, you take the foot end."),
        (16.0, "He's on the cot, straps secured, loading into the ambulance. Reassessing airway, breathing, circulation and his pain after the move."),
        (18.0, "Radio to the hospital: this is unit 4 en route code 3 with a 62-year-old male, cardiac chest pain, onset at rest around 0615, central pressure radiating to the jaw and left arm, vitals BP 148 over 92, pulse 96, resps 22, SpO2 96 percent, given ASA 160 and two nitro, pain improving, ETA 12 minutes, possible STEMI."),
        (20.0, "Second full set of vitals en route: blood pressure, pulse rate strength and rhythm, respirations rate and depth, SpO2."),
        (24.0, "Hand-off at the hospital: 62-year-old male, chief complaint central chest pressure that woke him at 0615, heavy band-like, radiating to left jaw and arm, 8 out of 10 at onset now 3, nausea and diaphoresis, two exertional episodes this week. History of hypertension and dyslipidemia, ex-smoker. Meds amlodipine and rosuvastatin, no PDE5 inhibitors. Allergies none known. Initial vitals BP 148/92, pulse 96 regular, resps 22, SpO2 96 room air; latest BP 122/78, pulse 88, resps 18, SpO2 97. Treatment: ASA 160 chewed, nitro 0.4 times two, pain-free. Exam: no JVD, chest clear, pain not reproducible."),
    ],
}
PCR = {
    'md-02': {'cc': 'Central chest pressure at rest radiating to left jaw and arm', 'hxcc': 'Woke 0615, heavy band-like 8/10, nausea, diaphoresis, two exertional episodes this week',
              'pmhx': 'Hypertension, dyslipidemia, ex-smoker', 'meds': 'Amlodipine 5 mg, rosuvastatin 10 mg', 'allergies': 'NKA',
              'vitals': '08:12 BP 148/92 P96 R22 SpO2 96% GCS15; 20:00 BP 122/78 P88 R18 SpO2 97%',
              'treatments': 'ASA 160 mg PO chewed 04:00; nitro 0.4 mg SL 09:30 and 13:30; O2 not required', 'findings': 'No JVD, chest clear, pain not reproducible', 'narrative': 'Carried down stairs by stair chair, RTC to cath lab hospital, notified en route.'},
}

start = post('/api/examiner/start', {'scenarioId': sid, 'track': track})
print('BRIEF:', start['scenario']['titleEn'], '| dailyLeft', start['dailyLeft'])
log, events, fired = [{'t': 0, 'role': 'examiner', 'text': 'You may begin.'}], [], []
t0 = time.time()
for minute, text in SCRIPTS[sid]:
    t = int(minute * 60000)
    print(f'\n[{minute:5.1f}] CANDIDATE: {text}')
    r = post('/api/examiner/turn', {'scenarioId': sid, 'track': track, 'elapsedMs': t, 'text': text, 'log': log, 'events': events, 'fired': fired})
    log.append({'t': t, 'role': 'candidate', 'text': text})
    for s in r['say']:
        print(f'        {s["role"].upper():9s} {s["text"]}'); log.append({'t': t, 'role': s['role'], 'text': s['text']})
    for l in r['engineLines']:
        print(f'        ENGINE    {l}'); log.append({'t': t, 'role': 'examiner', 'text': l})
    print('        events:', [(e['name'], e['eids'], e['components']) for e in r['events']])
    if r.get('flags'): print('        flags:', r['flags'])
    events += r['events']; fired = r['fired']
print(f'\n{len(SCRIPTS[sid])} turns in {time.time()-t0:.0f}s; {len(events)} events')
fin = post('/api/examiner/finish', {'scenarioId': sid, 'track': track, 'endMs': 25 * 60000, 'log': log, 'events': events, 'pcr': PCR.get(sid, {})})
f = fin['form']
print('\nSCORE', f['score'], 'PASS' if f['pass'] else 'FAIL', 'autofail' if f['autofail'] else '', '| finishStatus', fin['finishStatus'])
for row in f['rows']:
    print(f"  -{row['weight']:3d} {row['itemId']:24s} {row['errorEn'][:70]} | {row['evidence'].get('quote','')[:60]} [{row['source']}]")
print('closing:', json.dumps(fin['closing']))
print('\nFEEDBACK:', fin['feedback']['examinerFeedbackEn'][:600])
print('\nCOACH ZH:', fin['feedback']['coachDebriefZh'][:400])
