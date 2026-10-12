# Writing a simulation sheet — instructions for the authoring agent

You are writing ONE OR MORE simulation sheets for the AI Examiner of a BC EMR/PCP licensing-exam
practice site. Read `SHEET-SCHEMA.md` first; this file adds the hard-won rules from the first sheets.

## Red line: save as you go
After each top-level field group, write the whole JSON file back to disk. The file must be valid
JSON at every moment (a session limit can kill you mid-sheet; the next run resumes from disk).
Finish one sheet completely (including its verifier PASS) before starting the next.

## Inputs (read once, share across your sheets)
1. `examiner-server/SHEET-SCHEMA.md` — field definitions
2. `examiner-server/AUTHORING.md` — this file
3. `examiner-server/sheets/md-02.json` — a finished, verified medical sheet (pattern to follow)
4. `examiner-server/sheets/tr-04.json` — a finished, verified trauma sheet
5. `data/practical/rubric.json` — ONLY to copy `errorEn` strings verbatim (look up itemId + weight in errorsByWeight)

Per sheet:
- `python examiner-server/tools/build_skeleton.py <id>` → `examiner-server/sheets/<id>.skeleton.json`
  It already contains `expected` (with weights — never change them), structured `vitalsSets`, the dispatch,
  `_phaseScripts` (the examiner script for each phase — your main source), `_handoffModelEn`,
  `_criticalPitfallsEn`, `pcrFacts`, `trackNotes`.
- Copy it to `examiner-server/sheets/<id>.json`, fill it, delete every `_` field at the end.

## Content rules
- English only. Patient lines in the first person, short, in character (affect/speech from the sheet).
- Every fact comes from the scenario file or the BC guidelines (`D:\Claude\bcexam-sources\bc-exam-guidelines.txt`).
  Where the script is silent, give a plain NEGATIVE ("No, nothing like that"). Never invent a positive finding,
  a number, a drug, or a history item.
- `firstLookEn` is only what can be seen and heard from the doorway — NO patient dialogue in it (the chief complaint
  must be asked for; a gasping patient is "too short of breath to say more than a word or two", not a quote).
- `primary.circulationEn` must contain vitals set 1's pulse rate and `primary.breathingEn` its resp rate.
- `primary.rbsEn` says what the RBS reveals and that skin is given automatically during the RBS.
- `expected[].triggers`: 4–6 phrases a candidate would actually say. Prefer multi-word phrases
  ("check his pupils", "four quadrants") over single generic words ("back", "skin").
  **The engine credits the action itself when the candidate says a trigger** (so a model miss is never a false
  deduction). Therefore every trigger must be something said only while DOING or verbalizing that action:
  - never a finding the examiner gives back ("BP is 90 over 60"), never a phrase that also fits a different
    expected action of the same item (two `breathing` actions → "count respirations" vs "auscultate the chest");
  - never a bare word that is said all the time ("pain", "leg", "oxygen" alone); "apply oxygen", "non-rebreather" are fine;
  - triggers of `primary` actions only count before the first full vitals set; vital-sign items are never trigger-credited.
- `licence`: "pcp" for every `fe` item and every action that starts with "PCP:"; otherwise "both".
- `drugs`: every drug a candidate at either level might give or must withhold in this call, with `namesEn`
  aliases, `doseEn` and `licence` (EMR drugs: oral glucose, ASA, nitroglycerin (assist), Entonox, epinephrine
  auto-injector, naloxone, salbutamol (assist) — check the guidelines; PCP adds IV/IM/SQ per protocol).
- `majorMoves`: the physical moves of this call (e.g. "log-roll", "lift-to-cot", "load", "stair-chair").
  Always include "load" (or "lift-to-cot") — packaging time is measured from it.
- `examinerPrompts.missedInjuryEn`: one neutral question for a trauma patient whose injury the candidate missed;
  `locNotDepictedEn` / `breathingNotDepictedEn` only when the patient has decreased LOC / abnormal breathing that
  an actor cannot show.

## Protocol rules — the part that decides whether the tool is trusted
The engine already deducts for every expected action that never happened, for vitals timing, for packaging time,
for reassessment after moves, for the transport category, for notification/hand-off/PCR, and for Appendix A pain
management. **Do not write rules for any of those.** Write rules only for scenario-specific errors:
wrong order, wrong drug/dose, a contraindication ignored, an unsafe act.

1. **A 100% rule must be impossible to trigger by a competent candidate.** A false auto-fail destroys trust in the
   whole product; a missed deduction costs one point of realism. When in doubt use 25 or 15.
2. Use 100 only for the scenario's `_criticalPitfallsEn` and the official auto-fail list (c-spine, airway, breathing,
   circulation, RBS, protocol contraindications/indications/baseline vitals, life/limb acts).
3. **Never make a 100% rule depend on the model reporting a GOOD act** (e.g. `before_each drug:x requires
   "screened-something"`). The model sometimes misses good acts. Either:
   - test the absence of a BAD act the model can see (`absent "nitro-without-bp-check"`), or
   - rely on events the model reports reliably: rubric items, `drug:*`, `move:*`, `vitals-set-N-complete`,
   - or add a `keywordEvents` entry so the engine itself detects the good act from the candidate's words:
     `"keywordEvents": [{"event": "pde5-screened", "regex": "\\b(viagra|levitra|cialis|pde5|erectile)\\b"}]`
4. `present` rules on a drug are fine when the drug is clearly indicated for that licence level (set `licence`).
   For a drug only one level may give, add the opposite-level guard (`absent drug:x`, `licence: "emr"`, 100,
   "Initiated protocol without proper indications…") — see tr-04's `emr-no-txa`.
5. Do not use `within_after` for reassessment-type checks (the engine already does ABC-I after moves; a dose near the
   end of the call would false-fire).
6. `deduct.errorEn` must be copied verbatim from rubric.json for that itemId at that weight. The verifier checks it.
7. Withholding a drug is a common "correct" action ("Entonox is withheld because of shock"). Make sure the rule for the
   withheld drug is `absent drug:<key>` — and remember the model must not record "I'm NOT giving X" as `drug:X`
   (that is the examiner prompt's job; just don't add a rule that would fire on the word alone).

## Done means
- `python examiner-server/tools/verify_sheet.py <id>` → PASS, and every WARN explained in your report.
- Every `_criticalPitfallsEn` line is covered by a rule or by an engine check (say which in the report).
- No `_` fields, no Chinese, no numbers that are not in the scenario or the guidelines.

## Report (short)
Per sheet: counts (expected / rules / drugs / specials / stateChanges), verifier result, untraced numbers explained,
pitfall → rule mapping, and anything you were unsure about. Do not git. Do not touch any other file.
