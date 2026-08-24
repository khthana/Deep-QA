# -*- coding: utf-8 -*-
"""
#22 เกณฑ์การให้คะแนนของ Rubric — the mutants that proved `22a-rubric-criteria.spec.js`.

Fourteen, one per claim of the ⚙ rows of `docs/acceptance/22-rubric-criteria.md`
rather than one per row: three of those rows make two claims that break
independently, and a row backed by a mutant for only half of what it says is
half proved.

Four of these are worth reading before trusting the rows they back.

**No mutant here changes the text of a statement that binds parameters.** That
is the trap #21 lost most of a session to, twice: a `LIMIT` that stopped naming
`$3`/`$4`, and an assignment silenced as `rubric_name_th = rubric_name_th`,
which leaves `$3` referenced nowhere while six values are still passed.
PostgreSQL answers 42P18 or 08P01, the route answers 500, and *every* row dies —
starting with the first, which says nothing about what the mutant claimed. So
`editnotsaved` here mutates the value bound into `$3`, not the statement that
binds it: the PUT still answers 200 and the name simply does not change. When a
mutant is added to this file, the cheap check is to run it against
`backend/test/rubric-criteria.test.js`, which asserts status codes directly — a
500 there means the mutant is a crash and proves nothing.

`countoffbyone` is the only mutant in this file that breaks a file belonging to
#21. It has to: the row it proves is the one place the two tickets meet, where
#21's list states how many criteria a rubric holds and that number is a subquery
over the table #22 writes. It is not the same mutation as #21's `countnotshown`,
which hides a number the server sent correctly; this one makes the server send
the wrong number. Read the note beside it for why it is off by one rather than
wrong outright.

`cascadenotcounted` is the same mutation as #21's `criterianotcounted`, applied
here for a different row. #21 proves that a rubric deleted with seeded criteria
reports how many went; #22's last row proves it against criteria this file
wrote through the form a moment earlier. Two rows, one line of code, and both
are worth having — the seed's count is a constant a test could have been
written around, and this one is not.

`tiebreakreversed` reverses the tiebreak rather than deleting it, for the reason
#21's file gives at length: PostgreSQL may return tied rows in any order and on
this data returns them in insertion order, so a deleted tiebreak would pass and
prove nothing.

`22a-rubric-criteria.spec.js` runs `serial`, so the first row to die stops every
row after it and each mutant reports one failure whatever it broke. **Read the
name of the test that died, never the count.**

    python mutation/22-rubric-criteria.py save
    python mutation/22-rubric-criteria.py nameorder
    cd e2e && npx playwright test 22a        # expect exactly the named failure
    python mutation/22-rubric-criteria.py restore
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import main  # noqa: E402

FILES = {
    "route": "backend/routes/rubricCriteria.js",
    "page": "frontend/src/pages/RubricCriteria.js",
    "rubrics": "backend/routes/rubrics.js",
}

MUTANTS = {
    # Row 1, first half — the way in leads to *that* rubric. The screen still
    # opens and still lists the right criteria; it stops saying which rubric it
    # is of, which is the whole of what distinguishes arriving here from
    # arriving anywhere.
    "headingnotnamed": (
        "page",
        "                เกณฑ์การให้คะแนนของ Rubric {data.rubric?.rubric_code}",
        "                เกณฑ์การให้คะแนนของ Rubric",
    ),
    # Row 1, second half — a rubric with nothing in it says so. The empty table
    # is still empty; what goes is the sentence that tells a person the screen
    # has finished loading and found nothing, rather than still looking.
    "emptynotsaid": (
        "page",
        "                      ยังไม่มีเกณฑ์การให้คะแนนใน Rubric นี้",
        "                      —",
    ),
    # Row 2, first half — the weight is on the row. The criterion is still
    # written down with the weight the person typed and the API still returns
    # it; the table stops drawing it.
    "weightnotshown": (
        "page",
        "                      <td className=\"px-4 py-3 text-slate-500\">{criterion.weight}</td>",
        "                      <td className=\"px-4 py-3 text-slate-500\" />",
    ),
    # Row 2, second half — all four bands are on the row. Only the top one is
    # drawn, which is exactly the half-written rubric the ticket's third
    # criterion exists to prevent, made by the screen instead of by the writer.
    "bandsnotshown": (
        "page",
        "                      {BANDS.map(band => (\n                        <td key={band.key} className=\"min-w-48 px-4 py-3 text-slate-600\">",
        "                      {BANDS.slice(0, 1).map(band => (\n                        <td key={band.key} className=\"min-w-48 px-4 py-3 text-slate-600\">",
    ),
    # Row 3, first half — the list is in the stated order, not in the order of
    # the names. Both parameters of this statement are still spent: it binds
    # only `$1`, and the ORDER BY names no parameter at all, so this is a
    # change of behaviour and not a bind error.
    "nameorder": (
        "route",
        "          ORDER BY d.display_order ASC, d.id ASC",
        "          ORDER BY d.criteria_name_th ASC",
    ),
    # Row 3, second half — two criteria claiming one place are drawn in a
    # settled order. Reversed rather than removed: see the note at the top.
    "tiebreakreversed": (
        "route",
        "          ORDER BY d.display_order ASC, d.id ASC",
        "          ORDER BY d.display_order ASC, d.id DESC",
    ),
    # Row 4 — the edit is saved. The value bound into `$3` is the old name
    # rather than the new one, so `$3` is still referenced and still spent, the
    # PUT still answers 200, and the name simply does not change. Silencing the
    # assignment instead would answer 42P18 and kill row 1 with a 500.
    "editnotsaved": (
        "route",
        "            draft.values.criteria_name_th,\n            draft.values.criteria_name_en,",
        "            existing.criteria_name_th,\n            draft.values.criteria_name_en,",
    ),
    # Row 5 — the rubric list counts what this screen wrote. #21's subquery is
    # still about the rubric it is on and is still wrong, by one.
    #
    # An off-by-one and not `WHERE d.rubric_id = d.rubric_id`, which was the
    # first form of this mutant: counting the whole table gives an *empty*
    # rubric a non-zero count, and row 1 reads that very link to assert a rubric
    # with nothing in it says so - so the mutant killed row 1 and said nothing
    # about row 5. Off by one, an empty rubric still reports nothing positive
    # (`count > 0` is false at -1), row 1 passes, and the first row to notice is
    # the one that reads the number itself. Row 2's count is #22's own `total`
    # and comes from the other route entirely.
    "countoffbyone": (
        "rubrics",
        "                  (SELECT count(*)::int FROM rubric_details d WHERE d.rubric_id = r.id)",
        "                  (SELECT count(*)::int - 1 FROM rubric_details d WHERE d.rubric_id = r.id)",
    ),
    # Row 2, third claim - the paragraph under the heading says how many
    # criteria this rubric holds, and row 6 says the number goes down by one
    # after a removal. Every other mutant of this row breaks a cell of the
    # table; nothing here touched `total`, so the sentence was a claim riding
    # on evidence about something else. Zero and not `rows.length + 1`: an
    # empty rubric still reads `0`, so row 1, which is about a rubric with
    # nothing in it, stays alive and the first row to notice is the one that
    # reads the number after writing a criterion.
    "countnotsaid": (
        "route",
        "      return res.status(200).json({ rubric: parent, criteria: rows, total: rows.length });",
        "      return res.status(200).json({ rubric: parent, criteria: rows, total: 0 });",
    ),
    # Row 6, first half — removal asks first, and answering no changes nothing.
    # Written this way round on purpose, as #21's is: a mutant that skipped the
    # dialog entirely would kill the removal half of the row as well, and then
    # neither half would be evidence about confirmation specifically.
    "hardcancel": (
        "page",
        "        onConfirm={confirmRemoval}\n        onCancel={() => {\n          setNotice(null)\n          setRemoving(null)\n        }}",
        "        onConfirm={confirmRemoval}\n        onCancel={confirmRemoval}",
    ),
    # Row 6, second half — the banner names the criterion that went. The
    # deletion still happens and still answers 200; what it stops carrying is
    # the name, so the screen falls back to the sentence that names nothing.
    "removalnotnamed": (
        "route",
        "          criteria_name_th: existing.criteria_name_th,",
        "          criteria_name_th: null,",
    ),
    # Row 7 — a rubric this account may not open is refused in words. The
    # server still refuses; the screen stops treating the refusal as the state
    # of the screen and draws its empty table instead, which reads as "this
    # rubric has no criteria" over a rubric the person was never allowed to ask
    # about.
    "refusalasemptytable": (
        "page",
        "      setRefusal(error.message)",
        "      setRefusal(null)",
    ),
    # Row 8 — the accounts this screen is not for are refused it. The faculty
    # administrator is put back, which is what the ticket's own sixth criterion
    # would have allowed and what #79 reversed.
    "facultyadmin": (
        "route",
        "  router.get('/rubrics/:rubricId/criteria', requireRole(...MAINTAINERS), async (req, res, next) => {",
        "  router.get('/rubrics/:rubricId/criteria', requireRole(...MAINTAINERS, 'FACULTY_ADMIN'), async (req, res, next) => {",
    ),
    # Row 9 — the rubric goes and takes these criteria with it, and the banner
    # says how many. The same line #21's `criterianotcounted` breaks, proving a
    # different row: there against the seed's count, here against criteria
    # written through the form minutes earlier.
    "cascadenotcounted": (
        "rubrics",
        "          criteria_removed: counted.rows[0].total,",
        "          criteria_removed: 0,",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
