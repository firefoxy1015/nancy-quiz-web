# Simulation Sheet schema (`examiner-server/sheets/<scenarioId>.json`)

A sheet is everything the examiner bot is allowed to know and say about one scenario.
The LLM only ever sees the sheet; anything not in the sheet is answered with
"No further information available" and flagged. The engine (not the LLM) scores.

All prose is **English only** (the real exam is in English). Facts must come from the
scenario file (`data/practical/*.json`) or the BC guidelines — never invent numbers.

```jsonc
{
  "id": "md-02",
  "titleEn": "Cardiac Chest Pain - ASA and Nitroglycerin",
  "type": "medical",                 // medical | trauma
  "priority": "rtc",                 // rtc | non-rtc  (the correct transport category)
  "sourceScenario": "data/practical/scenarios.json#md-02",

  "patient": {
    "name": "Robert Hale", "age": 62, "sex": "male",
    "affectEn": "anxious, grey, sweating, clenched fist on sternum",
    "speechEn": "short sentences because of the pain; cooperative"
  },

  "scene": {
    "settingEn": "upstairs bedroom of a townhouse; 14 narrow stairs are the only egress",
    "hazardsEn": ["stair egress"],
    "bystanders": [{ "who": "wife", "knowsEn": "woke 0615 with chest pain; no nitro in house; she called 911" }],
    "partnerEn": "one PCP/EMR partner, follows your delegation only",
    "equipmentEn": ["oxygen kit with NRB and nasal cannula", "BP cuff and stethoscope", "pulse oximeter", "glucometer", "ASA", "nitroglycerin spray", "Entonox", "stair chair", "cot", "blankets"]
  },

  "dispatchEn": "0640 hrs. Code 3 ...",               // read aloud before the clock starts
  "dispatchUpdateEn": "conscious, sweating ...",       // optional, read with the dispatch
  "arrivalEn": "Wife meets you at the door ...",       // given when the candidate says they arrive / enter
  "firstLookEn": "grey, diaphoretic, clenched fist over sternum", // given on approach, before touching

  "primary": {                       // given ONLY when the candidate assesses that element
    "locEn": "Alert. Oriented x3.",
    "airwayEn": "Open and clear, speaking in short sentences.",
    "breathingEn": "22, slightly laboured, equal chest rise.",
    "circulationEn": "Radial 96, regular, normal strength.",
    "rbsEn": "No injuries. Skin pale, cool, diaphoretic (skin is given automatically during the RBS).",
    "skinEn": "pale, cool, diaphoretic"
  },

  "history": {                       // each answered ONLY when asked; patient voice
    "ccEn": "Pressure in the middle of my chest, like a weight.",
    "opqrst": { "oEn": "...", "pEn": "...", "qEn": "...", "rEn": "...", "sEn": "...", "tEn": "..." },
    "painScoreEn": "8 out of 10",
    "sample": { "sEn": "...", "aEn": "...", "mEn": "...", "pEn": "...", "lEn": "...", "eEn": "..." },
    "fe": { "generalEn": "...", "cnsEn": "...", "respiratoryEn": "...", "cardiovascularEn": "...", "giGuEn": "...", "integumentaryEn": "...", "musculoskeletalEn": "...", "endocrineEn": "...", "eentEn": "..." }
  },

  "findings": {                      // given ONLY when the candidate examines that region
    "headNeckEn": "...", "chestLungsEn": "...", "abdomenEn": "...", "backEn": "...",
    "lowerExtremitiesEn": "...", "upperExtremitiesEn": "..."
  },

  "vitalsSets": [                    // only the CURRENTLY UNLOCKED set is shown to the LLM
    {
      "set": 1,
      "unlock": { "always": true },
      "gcs": { "total": 15, "e": 4, "v": 5, "m": 6 },
      "bp": "148/92",
      "pulse": { "rate": 96, "rhythm": "regular", "strength": "normal" },
      "resp": { "rate": 22, "depth": "normal", "character": "slightly laboured" },
      "skin": "pale, cool, diaphoretic",
      "pupils": "equal and reactive",
      "spo2": "96% on room air",
      "bgl": null,                   // null = not indicated / not available
      "temp": null
    },
    {
      "set": 2,
      "unlock": { "anyOf": [ { "afterEvent": "drug:nitroglycerin", "count": 2 }, { "elapsedMs": 900000 } ] },
      "...": "..."
    }
  ],

  "stateChanges": [                  // engine fires these; LLM is told via an [ENGINE] note
    { "id": "no-oxygen", "when": { "elapsedMs": 600000, "missingEvent": "oxygen" },
      "examinerLineEn": "The patient is now visibly more short of breath.", "vitalsPatch": { "spo2": "91% on room air" } }
  ],

  "expected": [                      // copied from the scenario by build_skeleton.py; authors add triggers
    { "itemId": "loc-avpu", "phase": "primary", "weight": 15, "licence": "both",
      "actionEn": "Assess LOC / AVPU: Alert",
      "triggers": ["AVPU", "alert and oriented", "responds to my voice", "level of consciousness"] }
  ],

  "specialEvents": [                 // scenario-specific things the LLM can report that are not rubric items
    { "key": "patient-walks", "descriptionEn": "candidate lets the patient walk / exert himself" },
    { "key": "tourniquet-release", "descriptionEn": "candidate loosens or releases the tourniquet" }
  ],

  "drugs": [                         // what the candidate may give; names the LLM must recognise
    { "key": "asa", "namesEn": ["ASA", "aspirin", "acetylsalicylic acid"], "doseEn": "160 mg PO chewed", "licence": "both" },
    { "key": "nitroglycerin", "namesEn": ["nitro", "nitroglycerin", "NTG"], "doseEn": "0.4 mg SL", "licence": "both" }
  ],

  "majorMoves": ["stair-chair", "lift-to-cot", "load"],   // move:<key> events; ABC-I must be reassessed after each

  "protocolRules": [                 // engine checks; errorEn must be an EXACT string from rubric.json for that item+weight
    { "id": "nitro-after-baseline", "check": "ordered", "first": "vitals-set-1-complete", "then": "drug:nitroglycerin",
      "deduct": { "itemId": "protocols", "weight": 100, "errorEn": "Does not complete baseline vital signs prior to initiating the protocol" } },
    { "id": "asa-given", "check": "present", "event": "drug:asa", "licence": "both",
      "deduct": { "itemId": "protocols", "weight": 100, "errorEn": "Fails to administer a medication indicated by the protocol detrimental to patient care" } },
    { "id": "nitro-max-3", "check": "max_count", "event": "drug:nitroglycerin", "max": 3,
      "deduct": { "itemId": "protocols", "weight": 100, "errorEn": "Performs the protocol with gross incompetence and/or with two or more errors" } },
    { "id": "bp-before-each-nitro", "check": "before_each", "event": "drug:nitroglycerin", "requires": "blood-pressure", "withinMs": 300000,
      "deduct": { "itemId": "protocols", "weight": 100, "errorEn": "Does not rule out all the contraindications, detrimental to patient care" } },
    { "id": "no-walking", "check": "absent", "event": "patient-walks",
      "deduct": { "itemId": "overall-patient-care", "weight": 100, "errorEn": "Performs an act that may jeopardize the life/limb of the patient that is not already captured in the major performance criteria (e.g. performing chest compressions on a patient with a pulse)" } }
  ],

  "painManagement": { "applies": true, "indicatedForPcp": true, "realignmentEvent": "skill-fracture-mgmt" },  // Appendix A logic; omit if N/A

  "notificationFacts": {             // the 7 official elements, as the facts the engine checks against
    "ageSex": "62-year-old male", "cc": "central chest pressure", "moi": null,
    "hxcc": "woke at 0615, 8/10, radiates to left jaw and arm", "vitals": "BP 148/92, pulse 96, resp 22, SpO2 96%",
    "treatments": "ASA 160 mg, nitroglycerin x2", "findings": "not reproducible on palpation, no JVD"
  },
  "handoffFacts": { "...the 10 official elements...": "" },
  "pcrFacts": { "cc": "", "hxcc": "", "pmhx": "", "meds": "", "allergies": "", "vitals": "", "treatments": "", "findings": "" },

  "examinerPrompts": {               // lines the examiner MUST volunteer per the manual
    "locNotDepictedEn": null,        // only for patients with decreased LOC
    "breathingNotDepictedEn": null,
    "missedInjuryEn": null           // e.g. "You exposed the right arm earlier - what did you see?"
  },

  "trackNotes": { "emrEn": "...", "pcpEn": "..." },
  "sourcePages": "scenario md-02; BC guidelines p.47 (Cardiac Chest Pain), p.72 (nitro cautions)"
}
```

## Rules for authors

1. **Every fact traceable.** Numbers must appear in the scenario JSON or the guidelines text. The verifier audits them.
2. **Triggers are recognition hints**, 3–6 short phrases a candidate might actually say for that item. They are not shown to candidates.
3. **Vitals sets are structured** (rate/rhythm/strength as separate fields) so the engine can answer "rate only".
4. **`errorEn` in `protocolRules` must match rubric.json verbatim** for that `itemId` and `weight` — the verifier checks it.
5. Keep `expected` as generated; add `triggers`, fix obvious phase tags, never change weights.
6. `unlock` conditions may use: `always`, `elapsedMs`, `afterEvent` (+ optional `count`), `anyOf`, `allOf`.
7. Primary-survey values must agree with vitals set 1 (same pulse/resp numbers).
