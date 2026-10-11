# -*- coding: utf-8 -*-
"""Drive a scripted candidate through the live API to check the model loop end to end.

Usage: python examiner-server/tools/e2e_candidate.py md-02[:clean] pcp [base_url]
  md-02        deliberately flawed run (late packaging, no FE/exam, PCR contradicts the hand-off)
  md-02:clean  regression baseline: a competent PCP run that must score >= 85 with no auto-fail
Prints every exchange, the events the server recorded, and the final grading form.
Spends real model calls (one per turn + two at finish).
"""
import io, json, sys, time, urllib.request

key, track = sys.argv[1], sys.argv[2]
sid = key.split(':')[0]
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


SCRIPTS['md-02:clean'] = [
    (0.3, "Scene assessment: townhouse, scene is safe, no hazards other than 14 narrow stairs for egress. Medical call, chest pain, one patient. Gloves and eye protection on. Partner, bring the stair chair and the cot to the bottom of the stairs so we can carry him down."),
    (0.8, "Approaching the patient. On first look he's grey and diaphoretic with a clenched fist over his sternum, a Levine sign. Sir, I'm Alex, a paramedic. What's going on today?"),
    (1.2, "He's alert and oriented, A on AVPU. No c-spine concern, this is a medical presentation. Airway is open, he's talking. Breathing: I'm assessing rate, depth and effort. Radial pulse for rate, strength and regularity."),
    (1.8, "Modified rapid body survey for a medical patient: head, chest, abdomen, pelvis, legs, arms and back. What does his skin look like?"),
    (2.2, "Pulse oximeter on, checking it matches his radial pulse. If he's 94 or higher I'm not putting him on oxygen, I'll titrate to keep him at or above 94. Sir, stay sitting in whatever position is most comfortable, don't move, we'll do everything for you."),
    (2.8, "Sir, any allergy to aspirin? Any stomach ulcers or bleeding? Can you swallow? Have you taken any aspirin today? Okay, I'm giving you ASA 160 milligrams, two chewable tablets, chew and swallow them."),
    (3.2, "This is cardiac chest pain, he's unstable and RTC, I want him ready to load within 15 minutes. Partner, bring the stair chair up and prep the egress while I run the chest pain protocol. He is not walking."),
    (3.6, "Sir, when did this start and what were you doing? Does anything make it better or worse? What does it feel like? Does it go anywhere? Have you had this before? On a scale of 0 to 10, how bad is it right now? Has it been constant?"),
    (4.4, "Any medical history like heart problems, high blood pressure, diabetes or cholesterol? Do you smoke? What medications do you take? Have you taken Viagra or Levitra in the last 24 hours, or Cialis in the last 48 hours? Any allergies to medications? When did you last eat or drink?"),
    (5.0, "Baseline vital signs. Blood pressure by auscultation on the left arm. Radial pulse rate, strength and rhythm. Respirations rate, depth and character. GCS eyes, verbal, motor. Pupils size, equality and reactivity. Skin colour, temperature and moisture by touch."),
    (6.0, "His systolic is above 110 and his heart rate is between 50 and 150, no PDE5 inhibitors, no nitrate allergy. Starting the cardiac chest pain protocol. I'm priming the nitro spray, then giving one spray, 0.4 milligrams sublingual, under the tongue, time noted. Maximum three doses in 30 minutes, every 3 to 5 minutes, and if we go to Entonox it has to be at least 5 minutes after the last nitro. If his systolic drops below 110 I'll withhold the nitro."),
    (7.0, "Reassessing: airway still open, breathing unchanged, radial pulse present. Sir, how's the pain now out of 10?"),
    (8.0, "Moving him onto the stair chair now and carrying him down the stairs with my partner. At the bottom: reassessing airway, breathing, circulation and his pain."),
    (9.0, "Transferring him from the stair chair onto the cot, straps secured. Reassessing airway, breathing, circulation after the move."),
    (10.0, "Second set of vitals before the next dose: blood pressure by auscultation, pulse rate strength and rhythm, respirations rate depth and character, SpO2."),
    (10.4, "Systolic is still above 110, heart rate between 50 and 150. Second nitro spray, 0.4 milligrams sublingual, time noted. That's dose two of a maximum of three."),
    (11.0, "Loading him into the ambulance now. Reassessing airway, breathing, circulation and the pain score after loading."),
    (11.5, "PCP: establishing IV access with normal saline running at TKO. If he gets nauseated I'll consider dimenhydrinate per protocol."),
    (12.0, "Radio to the receiving hospital: this is unit 4 en route code 3 with a 62-year-old male, chief complaint central chest pressure that woke him at 0615, radiating to the left jaw and arm, 8 out of 10. Vitals BP 148 over 92, pulse 96, resps 22, SpO2 96 percent room air. Given ASA 160 and two nitro sprays. Exam: no JVD, pain not reproducible. Possible acute coronary syndrome, please activate the cath lab, ETA 12 minutes."),
    (13.0, "Functional enquiry. In general, how have you been feeling lately, any recent illness or fevers? Any fainting, dizziness or headache? Any shortness of breath, cough, or trouble lying flat? Any palpitations, racing heart or swollen ankles? Any nausea, vomiting or indigestion? Any problems urinating? Any rashes or skin changes? Any recent injury to your chest, does it hurt when I press here? Are you diabetic, any thyroid problems? Any changes in vision, hearing, or a sore throat?"),
    (14.5, "Head-to-toe. Head and neck: checking for JVD and tracheal position. Chest: palpating to see if the pain is reproducible, auscultating six sites front and back, comparing both sides. Abdomen: four quadrants. Back. Lower extremities: pedal edema and pedal pulses. Upper extremities: comparing both radial pulses."),
    (15.5, "Third set of vitals en route: blood pressure, pulse rate strength and rhythm, respirations rate depth and character, SpO2. Sir, what's the pain out of 10 now?"),
    (20.0, "Fourth set of vitals: blood pressure, pulse rate strength and rhythm, respirations rate and depth, SpO2. Reassessing airway, breathing, circulation and the IV site."),
    (21.0, "Hand-off at the hospital: this is a 62-year-old male, chief complaint central chest pressure that woke him at 0615, heavy and band-like, radiating to the left jaw and arm, 8 out of 10 at onset, with nausea and diaphoresis, and two exertional episodes earlier this week. History of hypertension and high cholesterol, ex-smoker. Medications amlodipine 5 and rosuvastatin 10, no PDE5 inhibitors. No known allergies. Initial vitals BP 148 over 92, pulse 96 regular, resps 22, SpO2 96 percent on room air. Latest vitals BP 122 over 78, pulse 88 regular, resps 18, SpO2 97 percent. Treatment: ASA 160 milligrams chewed at about 3 minutes, nitroglycerin 0.4 milligrams sublingual twice at 6 and 10 minutes, IV saline TKO. Exam: no JVD, chest clear in six sites, pain not reproducible on palpation."),
]
PCR['md-02:clean'] = {
    'cc': 'Central chest pressure at rest radiating to the left jaw and left arm',
    'hxcc': 'Woke at 0615 with heavy band-like central chest pressure, 8/10, constant, radiating to left jaw and arm, with nausea and diaphoresis; two milder exertional episodes earlier this week; not reproducible on palpation',
    'pmhx': 'Hypertension, dyslipidemia, ex-smoker (quit 3 years ago, 30 pack-years), father died of MI at 58',
    'meds': 'Amlodipine 5 mg, rosuvastatin 10 mg; no PDE5 inhibitors',
    'allergies': 'No known allergies',
    'vitals': '05:00 BP 148/92 P 96 reg R 22 SpO2 96% RA GCS 15 PERL skin pale cool diaphoretic; 10:00 BP 122/78 P 88 R 18 SpO2 97% RA; further sets 15:30 and 20:00 recorded',
    'treatments': 'ASA 160 mg PO chewed at 02:48; nitroglycerin 0.4 mg SL at 06:00 and 10:24 (SBP >110 and HR 50-150 confirmed before each); IV NS TKO 11:30; no oxygen required (SpO2 >= 94%); stair chair, cot, RTC',
    'findings': 'Levine sign; no JVD, trachea midline; chest clear in 6 sites, pain not reproducible; abdomen soft; no pedal edema, pulses equal bilaterally',
    'narrative': 'Carried down the stairs by stair chair, not permitted to walk. Possible ACS, receiving hospital notified en route with cath lab request. Hand-off given to the ED team.',
}

start = post('/api/examiner/start', {'scenarioId': sid, 'track': track})
print('BRIEF:', start['scenario']['titleEn'], '| dailyLeft', start['dailyLeft'])
log, events, fired = [{'t': 0, 'role': 'examiner', 'text': 'You may begin.'}], [], []
t0 = time.time()
for minute, text in SCRIPTS[key]:
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
print(f'\n{len(SCRIPTS[key])} turns in {time.time()-t0:.0f}s; {len(events)} events')
fin = post('/api/examiner/finish', {'scenarioId': sid, 'track': track, 'endMs': int(SCRIPTS[key][-1][0] * 60000) + 60000, 'log': log, 'events': events, 'pcr': PCR.get(key, {})})
f = fin['form']
print('\nSCORE', f['score'], 'PASS' if f['pass'] else 'FAIL', 'autofail' if f['autofail'] else '', '| finishStatus', fin['finishStatus'])
for row in f['rows']:
    print(f"  -{row['weight']:3d} {row['itemId']:24s} {row['errorEn'][:70]} | {row['evidence'].get('quote','')[:60]} [{row['source']}]")
print('closing:', json.dumps(fin['closing']))
print('\nFEEDBACK:', fin['feedback']['examinerFeedbackEn'][:600])
print('\nCOACH ZH:', fin['feedback']['coachDebriefZh'][:400])
if key.endswith(':clean'):
    ok = (not f['autofail']) and f['score'] >= 85
    print('\nBASELINE', 'PASS' if ok else 'FAIL', f"(score {f['score']}, needs >= 85 and no auto-fail)")
    sys.exit(0 if ok else 1)
