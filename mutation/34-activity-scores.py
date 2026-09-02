# -*- coding: utf-8 -*-
"""
#34 คะแนนกิจกรรมการเรียนรู้ - a grid under two toggles.

Fifteen mutants. The ticket is one storage shape and two ways of typing into it,
so most of these break the translation between the two: a whole-Activity mark
that is not divided, a group mark that reaches one member, a ceiling that stops
being a ceiling, an upsert that stops being one.

Six are about the screen rather than the routes. Two are there because they are
failures that read as an empty screen rather than as a wrong one: a grid that
opens blank over marks that exist invites a teacher to save a class of nulls,
and a grid whose columns are the Offering's outcomes rather than this Activity's
invites a mark against work that was never assessed.

Three of the rest are each a defect the /code-review of this ticket found, and
each restores what the screen did before it was fixed. They are grouped because
they are one mistake in three places: a blank cell means *not marked*, and a
screen that draws a cell blank for a reason of its own — a group whose members
disagree, a student marked on only some outcomes — then submits it as though a
teacher had cleared it, erasing the very marks the blank was reporting.

The last one is not from a review at all. `totalkeepsfloattail` came from
hand-walking the acceptance sheet, which is the only place it could have come
from: it needs a mark whose stored shares do not add cleanly in binary, and
every number the other seams type divides and re-adds exactly. On the seed's own
marks the screen read 88.66999999999999, in a box, as somebody's mark.

Row 10 of `34a` has no mutant here on purpose. What it asserts - a ตอนเรียน that
is not this account's is refused before the grid is drawn - is refused by #32's
list route, which this screen reads first, and mutating that would be mutating
#32. The criterion is proved at the HTTP surface instead, where
`activity-scores.test.js` asks this file's own routes directly.

    python mutation/34-activity-scores.py save
    python mutation/34-activity-scores.py <mutant>
    python mutation/34-activity-scores.py restore

Killing them:

    cd e2e && npx playwright test 34a
"""

from harness import main

FILES = {
    "route": "backend/routes/activityScores.js",
    "screen": "frontend/src/pages/ActivityScores.js",
}

MUTANTS = {
    # The whole-Activity mark is written to every outcome instead of divided
    # between them, so a student marked 61 out of 100 holds 183. The screen
    # still shows what was typed until it is reloaded, which is what makes this
    # the shape worth catching: the number is right on the way in and wrong
    # everywhere it is read afterwards. Kills row 3.
    "markwholeoneveryclo": ("route",
                            "  return rows.map((row, index) => ({ row, score: shares[index] }));",
                            "  return rows.map((row) => ({ row, score }));"),
    # The division loses its remainder, so a mark whose weights do not divide
    # evenly reads back a hundredth short of what was typed. Kills row 3 at the
    # total rather than at the shape.
    "driftuncorrected": ("route",
                         "  shares[0] = round2(shares[0] + drift);",
                         "  shares[0] = round2(shares[0]);"),
    # A group's mark reaches the first member only. The card still shows the
    # number - the group agrees with itself about one member - and the other
    # nine students carry whatever they had before. Kills row 4.
    "grouptofirstmember": ("route",
                           "      for (const studentId of students) {",
                           "      for (const studentId of students.slice(0, 1)) {"),
    # The Activity's full mark stops being a ceiling, so 101 out of 100 is
    # recorded and every later attainment figure is drawn from it.
    #
    # Kills row 5 and row 9 both, and did not always: until the review of this
    # ticket there were two of these, one in the screen's path and one in the
    # file's, and the second had quietly missed a check the first had. They are
    # one reader now, so this is one mutant, and the row it kills at each seam
    # is the row that seam owns.
    "noactivityceiling": ("route",
                          "  if (read.score !== null && read.score > Number(activity.score_number)) {\n"
                          "    return { ok: false, message: REFUSALS.markOverActivity(Number(activity.score_number)) };",
                          "  if (false && read.score !== null && read.score > Number(activity.score_number)) {\n"
                          "    return { ok: false, message: REFUSALS.markOverActivity(Number(activity.score_number)) };"),
    # One outcome's share stops being a ceiling, which is the version of the
    # same failure nobody sees on the screen: the Activity's total is still
    # under a hundred and one CLO holds more than it was ever worth. Kills
    # row 6.
    "nocloceiling": ("route",
                     "    if (read.score !== null && read.score > Number(row.score)) {\n"
                     "      return { ok: false, message: REFUSALS.markOverClo(row.clo_number, Number(row.score)) };",
                     "    if (false && read.score !== null && read.score > Number(row.score)) {\n"
                     "      return { ok: false, message: REFUSALS.markOverClo(row.clo_number, Number(row.score)) };"),
    # The upsert stops updating, so the first mark a student is given is the
    # only one they can ever have and every correction is silently dropped.
    # The row count does not move, which is what makes it invisible to a test
    # that only counts. Kills row 7.
    "insertnotupsert": ("route",
                        "         DO UPDATE SET score = EXCLUDED.score, updated_at = now()`,",
                        "         DO NOTHING`,"),
    # The four whole-file checks still run and still answer, and the answer is
    # thrown away: the file is applied anyway. The person is told ไฟล์ไม่ตรง and
    # the marks change underneath the sentence, which is the failure the ticket
    # asks about in so many words - *a rejected file writes nothing*. Kills
    # row 8 at the assertion that the marks did not move.
    "refusedfilestillwrites": ("route",
                               "          if (checked.message) {\n"
                               "            return sendImport(res, { ok: false, message: checked.message }, 'marks');",
                               "          if (false && checked.message) {\n"
                               "            return sendImport(res, { ok: false, message: checked.message }, 'marks');"),
    # The opposite failure, and the one that looks like success: every row is
    # read, checked and counted, and none of it is written. The panel reports
    # นำเข้าสำเร็จ 57 รายการ over a class whose marks never changed.
    # Kills row 8 at the assertion that the marks did move.
    "importwritesnothing": ("route",
                            "            insert: async (client, draft) => {\n"
                            "              await record(",
                            "            insert: async (client, draft) => {\n"
                            "              if (draft === null) await record("),
    # A file that is not the whole class is accepted as far as the per-student
    # checks, so the refusal a person reads is about a missing code rather than
    # about a file that is a different class. Kills row 8 at the sentence.
    "importcountunchecked": ("route",
                             "    if (records.length !== roll.length) {",
                             "    if (false && records.length !== roll.length) {"),
    # The grid opens empty over marks that are there. Nothing refuses, nothing
    # looks broken, and the first save writes a class of nulls over a term's
    # marking. Kills row 1.
    "gridopensempty": ("screen",
                       "  const recorded = useMemo(() => {\n"
                       "    if (!data) return {}",
                       "  const recorded = useMemo(() => {\n"
                       "    if (data) return {}"),
    # The grid's columns become every outcome of the Offering rather than the
    # ones this Activity assesses, so a teacher is offered a cell for work that
    # was never set - and the mark they type into it has no ceiling, because
    # the Activity divides nothing to that outcome. Kills row 2.
    "columnsareeveryclo": ("route",
                           "        WHERE m.activity_id = $1\n"
                           "        ORDER BY m.sequence_order ASC, m.id ASC`,",
                           "        WHERE m.activity_id = $1 OR true\n"
                           "        ORDER BY m.sequence_order ASC, m.id ASC`,"),
    # The group toggle goes back to defaulting on every load rather than once
    # per Activity. Every save answers with a fresh Activity object, so a group
    # Activity being marked person by person snaps back to รายกลุ่ม the moment
    # the teacher presses บันทึกคะแนน - the grid changes shape under somebody
    # who is halfway through reading it. Kills row 11.
    "entryresetsonsave": ("screen",
                          "    if (!activity || defaulted.current === String(activity.id)) return",
                          "    if (!activity) return"),
    # The save goes back to submitting every row on the grid rather than the
    # ones that changed. Nothing refuses and the notice says บันทึกแล้ว; what
    # is gone is every group whose members disagreed, because that row is drawn
    # blank on purpose and a blank is written as a null to each of them.
    # Kills row 12.
    "savesendseveryrow": ("screen",
                          "        .filter(row => changed(draft[row.key], recorded[row.key]))",
                          "        .filter(row => changed(draft[row.key], recorded[row.key]) || true)"),
    # The total stops being rounded on the way out, so a mark whose shares do
    # not add cleanly in binary is shown as 88.66999999999999 in a box a
    # teacher is invited to type into. The stored numbers are exact and the
    # arithmetic that displays them is not - which is why every test that types
    # a number and reads it back stayed green: 61 and 12.5 divide and re-add
    # perfectly. Found by hand-walking the sheet, on the seed's own marks.
    # Kills row 14.
    "totalkeepsfloattail": ("screen",
                            "      return asText(round2(values.reduce((sum, value) => sum + Number(value), 0)))",
                            "      return asText(values.reduce((sum, value) => sum + Number(value), 0))"),
    # A student marked on only some outcomes gets a whole-Activity cell again,
    # holding the sum of the marks that happen to be there. It is lower than
    # the work that was marked and nobody typed it, and the next save divides
    # it back across the outcomes that were deliberately left alone.
    # Kills row 13.
    "partialreadsastotal": ("screen",
                            "      if (values.some(value => value === null)) return ''",
                            "      if (values.every(value => value === null)) return ''"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
