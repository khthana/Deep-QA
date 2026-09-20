# -*- coding: utf-8 -*-
"""
#145 ร้อยละของ BR-17 ที่จอพิมพ์เอง - the share two screens typed instead of read.

Four mutants. `OUTCOME_PASS_PERCENT` in `backend/lib/attainment.js` is what
`outcomePassed` applies, and its own comment says it is exported **to be
printed** so that no screen keeps a second copy. #40's report reads it off
`rule.pass_percent`; ผลลัพธ์การเรียนรู้รายวิชา (#36) and รายละเอียดผลการเรียนรู้
(#38) typed the sixty into their own sentences until this ticket.

At the shipped value a typed sixty and the rule's sixty read the same, so no
row could tell them apart - the same shape as #110 one rule over. The first
three therefore move the rule to 55, which is what makes the difference visible
at all. The fourth is about the other number in #36's sentence, so it moves the
line that number is read from instead.

- `percentmoves` moves only the rule. It is the control: the two rows about the
  sentences must **stand**, because after the fix the sentences follow the rule
  wherever it goes. What it kills instead are the rows that pin sixty by number
  - at the HTTP seam, and one browser row whose situation is built at exactly
  sixty per cent.
- `resultspercentistyped` moves the rule and puts #36's literal back. Kills
  *the note under the table states the rule it was handed, not one of its own*
  in `e2e/tests/36a-section-results.spec.js`.
- `detailspercentistyped` moves the rule and puts #38's literal back. Kills
  *the sentence over the attention list states the share it was handed* in
  `e2e/tests/38a-learning-details.spec.js`.
- `resultspassscoreistyped` is the same defect one number over. #36's note
  states three numbers and its row claims all three; the pass score has been
  read from `band_floors[1]` since the screen was written, so nothing in the
  store could break that clause - `passmoves` and `floorisliteral` in
  `38-learning-details.py` move the line, and the answer and the screen move
  with it. This types the score and moves the line, so the copy is visible.
  The control for it is `38:passmoves`, which moves the line alone: that row
  must stand under it.

**ไฟล์ที่ใช้ร่วมกับใบอื่น** `backend/lib/attainment.js` กับ
`frontend/src/pages/LearningDetails.js` อยู่ใน `38-learning-details.py` ด้วย และ
`frontend/src/pages/SectionResults.js` อยู่ใน `36-section-results.py` - อย่ากวาด
พร้อมกัน และ `save` ก่อนเริ่มทุกครั้ง (README บอกไว้ว่าทำไม)

    python mutation/145-pass-percent-printed.py save
    python mutation/145-pass-percent-printed.py <mutant>
    python mutation/145-pass-percent-printed.py restore
"""

from harness import main

FILES = {
    "attainment": "backend/lib/attainment.js",
    "results": "frontend/src/pages/SectionResults.js",
    "details": "frontend/src/pages/LearningDetails.js",
}

# The rule, moved off the value every assertion in the store was written at.
# Anchored on the constant and not on the comment above it (#123), and 55
# rather than a nudge because sixty per cent exactly has to change side: that
# is the boundary `docs/04` TC-EVAL-004 is about.
RULE_MOVES = ("attainment",
              "const OUTCOME_PASS_PERCENT = 60;",
              "const OUTCOME_PASS_PERCENT = 55;")

MUTANTS = {
    "percentmoves": RULE_MOVES,
    # #145's defect on #36's screen: the share typed into the note while the
    # pass score beside it is read from `band_floors`. Both halves of the
    # sentence go back to one literal each, which is how the file stood.
    "resultspercentistyped": [
        RULE_MOVES,
        ("results",
         "            ข้อหนึ่งถือว่าผ่านเมื่อมีนักศึกษาผ่านเกณฑ์ข้อนั้นมากกว่าร้อยละ{' '}\n"
         "            {data.pass_percent} (ร้อยละ {data.pass_percent} พอดียังไม่ผ่าน)\n",
         "            ข้อหนึ่งถือว่าผ่านเมื่อมีนักศึกษาผ่านเกณฑ์ข้อนั้นมากกว่าร้อยละ 60\n"
         "            (ร้อยละ 60 พอดียังไม่ผ่าน)\n"),
    ],
    # The third number in #36's note, and the reason its row is one row and
    # not two: *the sentence states the rule it was handed* is a claim about
    # the whole sentence. The pass score is `PASS` itself since #110, so a
    # mutant that only moves the line proves nothing here - the screen follows
    # it. This puts the score back as the literal it would be if somebody had
    # typed it, and moves the line to 3.2 so that literal is wrong.
    "resultspassscoreistyped": [
        ("attainment",
         "const PASS = 3;",
         "const PASS = 3.2;"),
        ("results",
         "            และนักศึกษาหนึ่งคนถือว่าผ่านข้อหนึ่งที่{' '}\n"
         "            {data.band_floors[1].toFixed(1)} คะแนนขึ้นไป\n",
         "            และนักศึกษาหนึ่งคนถือว่าผ่านข้อหนึ่งที่ 3.0 คะแนนขึ้นไป\n"),
    ],
    # The same on #38's screen, whose sentence is one number and one line.
    "detailspercentistyped": [
        RULE_MOVES,
        ("details",
         "                  ข้อที่มีสัดส่วนนักศึกษาผ่านเกณฑ์ไม่เกิน {data.pass_percent}%\n"
         "                  ตามเกณฑ์การประเมิน\n",
         "                  ข้อที่มีสัดส่วนนักศึกษาผ่านเกณฑ์ไม่เกิน 60% ตามเกณฑ์การประเมิน\n"),
    ],
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
