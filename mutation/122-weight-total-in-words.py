# -*- coding: utf-8 -*-
"""
#122 น้ำหนักรวมบอกด้วยสีอย่างเดียว.

Six mutants across two screens that draw a weight total against a hundred and
said whether it was acceptable by changing the colour of the number. The text
did not change, the structure did not change, and nothing announced. Somebody
who cannot separate the two shades - and red against green is the one most
likely not to arrive - read `รวม 120 / 100` exactly as they read
`รวม 80 / 100`. #38 settled this for the heatmap already: a person who cannot
see a shade still needs the fact.

**The two screens do not share a rule, and the ticket said they did.** Its
symptom section describes both as drawing `รวมน้ำหนัก {total}/100` and turning
red `เมื่อ total > 100`. That is true of the Activity editor. สัดส่วนคะแนน
draws `รวม {total} / 100` - no `น้ำหนัก` - and its condition was
`total === 100 ? green : red`, so the colour there never meant *over* at all:
it meant *not exactly a hundred*, and 80 was as red as 120. The two screens
enforce different rules (`= 100` against `<= 100`), so they get different
sentences, and `schemeonlycomplains` and `editorcopiesthescheme` are the two
mutants that exist because writing one sentence from the ticket's account
would have been wrong on one screen each way round.

**The number is not in the live region, and that is the point of the second
element.** A region holding `รวม {total} / 100` re-announces the running total
on every keystroke, which is how a polite region becomes something people turn
off. The sentence changes when the answer changes; the number sits beside it.

**`aria-live` rather than `role="status"`.** The roles this app announces with
belong to `Notice`, and specs across the store filter `getByRole('status')` by
the text they expect - `37a` was one saved form away from a strict-mode
violation before #111 fixed it. A validation hint that appears while typing is
the case #111's own §Note on scope set aside, so it announces without joining
the `status` role set that every unfiltered lookup would then find twice.

    python mutation/122-weight-total-in-words.py save
    python mutation/122-weight-total-in-words.py <mutant>
    python mutation/122-weight-total-in-words.py restore

Killing them:

    cd e2e && npx playwright test 122a

**Never sweep this file with `30-weighting-scheme.py` (holds
`pages/GradingWeights.js`) or `33-activity-editor.py` (holds
`components/activity/ActivityForm.js`).** Both collisions are new with this
ticket, and both are the ordinary kind: #122 owns an accessibility claim about
two screens somebody else owns, so its mutants live here and the ⚙ rows live
on their sheets, per the rule #97 wrote. Compare `FILES` and not subject
matter - #85's warning about two tickets on one screen cuts the other way here,
because these two really do share paths.

Row numbers below are `122a`'s two tests in the order they are written.
"""

from harness import main

FILES = {
    "scheme": "frontend/src/pages/GradingWeights.js",
    "form": "frontend/src/components/activity/ActivityForm.js",
}

MUTANTS = {
    # The state before the ticket, on สัดส่วนคะแนน: the region is there, the
    # colour is there, and it has nothing to say. Kills row 1 at its first
    # assertion. Nothing else in the store reads this line - `30a` finds the
    # total by `/^รวม \d+ \/ 100$/`, which is the *other* element and is why
    # the sentence was given its own rather than appended to that one.
    "schemesaysnothing": (
        "scheme",
        "                  {verdictOf(total)}\n",
        "                  {''}\n",
    ),
    # The ticket's own diagnosis, implemented: only *over* is worth saying.
    # On this screen that is wrong and the screen is the one that proves it -
    # BR-05 is an equality, so 90 is refused exactly as firmly as 110, and a
    # person who is told nothing at 90 has been told the total is fine.
    # Kills row 1 at the short state, and nothing at the other two.
    "schemeonlycomplains": (
        "scheme",
        "  if (total < 100) return 'ยังไม่ถึง 100 จึงยังบันทึกไม่ได้'\n",
        "  if (total < 100) return ''\n",
    ),
    # Announced, but by interrupting whatever the reader is in the middle of -
    # on every keystroke that changes which side of a hundred the draft is on.
    # The screen is pixel-identical with this applied, which is #111's
    # `everythingisanalert` in a second place: a politeness level is a claim
    # like any other and cannot be proved by looking. Kills row 1.
    "schemeinterrupts": (
        "scheme",
        '                  aria-live="polite"\n',
        '                  aria-live="assertive"\n',
    ),
    # The same silence on the Activity editor, where the rule is *at most* a
    # hundred. Kills row 2.
    "editorsaysnothing": (
        "form",
        "                {total > 100 ? 'เกิน 100 จึงยังบันทึกไม่ได้' : ''}\n",
        "                {''}\n",
    ),
    # The cross-screen mistake, and the reason the words are written out on
    # each screen instead of shared: #30's rule applied to a screen that does
    # not have it. A half-finished attribution is legal here - the form's own
    # docstring says so - and this tells somebody who has typed 10 that they
    # are over a hundred. Kills row 2 at its last block, and passes everything
    # up to it, which is what makes it worth having.
    "editorcopiesthescheme": (
        "form",
        "                {total > 100 ? 'เกิน 100 จึงยังบันทึกไม่ได้' : ''}\n",
        "                {total !== 100 ? 'เกิน 100 จึงยังบันทึกไม่ได้' : ''}\n",
    ),
    # And the editor's half of the politeness decision. Kept separate from
    # `schemeinterrupts` rather than written as one two-edit mutant so that
    # each row's claim can fail on its own: two rows dying together is a
    # reason to go back and read the rows (#119), not something to build in.
    "editorinterrupts": (
        "form",
        '                aria-live="polite"\n',
        '                aria-live="assertive"\n',
    ),
}

main(FILES, MUTANTS)
