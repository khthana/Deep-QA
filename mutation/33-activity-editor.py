# -*- coding: utf-8 -*-
"""
#33 กิจกรรมการเรียนรู้ - writing the work, and attributing it to outcomes.

Fourteen mutants. The ticket's centre of gravity is the attribution rather than
the fields, so most of these break the CLO rows in a different way: the rows
are not written, not loaded, not replaced, offered twice, or offered from the
wrong year. The fields have two mutants between them, and both are there
because a form that quietly sends a constant is the failure a person cannot
see - the screen looks right, and the row it writes is not what they typed.

Two mutants die at the HTTP seam rather than in the browser, each for its own
reason, and the acceptance document says so:

- `marksguardoff` removes the guard that refuses to drop a CLO a cohort has
  been marked under. The seed's Activities are the only marked ones, and no
  browser row edits them - editing a marked Activity's attribution is exactly
  what the guard exists to refuse, so a row that did it would be asserting
  the refusal it is testing. `backend/test/activity-editor.test.js` writes it.
- `markfromweight` makes each row's share of the mark the weight itself
  (60 marks of a 20-mark piece of work). Nothing on the screen draws that
  column - the form computes its own preview from what is typed - so the only
  place it shows is the answer the route sends back.

    python mutation/33-activity-editor.py save
    python mutation/33-activity-editor.py <mutant>
    python mutation/33-activity-editor.py restore

Killing them:

    cd e2e && npx playwright test 33a
"""

from harness import main

FILES = {
    "route": "backend/routes/activities.js",
    "screen": "frontend/src/pages/LearningActivities.js",
    "form": "frontend/src/components/activity/ActivityForm.js",
}

MUTANTS = {
    # The save writes the Activity and none of its attribution: every piece of
    # work would arrive counting towards nothing, which is the one outcome
    # this ticket exists to prevent. Kills row 1 at the card's own line.
    "noattribution": ("route",
                      "      for (const [index, row] of values.clo_rows.entries()) {",
                      "      for (const [index, row] of [].entries()) {"),
    # The editor opens empty on an existing row. Because a save replaces the
    # rows whole, the next save through this form would take the attribution
    # with it - the quiet version of `noattribution`, one screen up.
    "emptyeditor": ("form",
                    "  clo_rows: (activity.clo_rows ?? []).map(row => ({",
                    "  clo_rows: [].map(row => ({"),
    # The picker stops hiding the CLOs other rows hold, so the same one can be
    # added twice from the screen. The server still refuses it (that is the
    # backend suite's row); what dies here is the fifth criterion's screen
    # half. Kills row 3.
    "duplicateoffered": ("form",
                         "                      .filter(clo => clo.clo_id === Number(row.clo_id) || !taken(draft.clo_rows, index, clo.clo_id))\n",
                         ""),
    # Saving an existing Activity posts a new one: the seventh criterion's
    # failure, and the one a person would find weeks later with two of
    # everything. Kills row 6 at the count that must not grow.
    "alwaysnew": ("screen",
                  "      if (editing === 'new') await createActivity(sectionId, draft)\n"
                  "      else await updateActivity(sectionId, editing.id, draft)",
                  "      await createActivity(sectionId, draft)"),
    # The weight total stops being checked, so a set claiming more of the mark
    # than there is saves cleanly. Kills row 5 at the 400 that answers 200.
    "weightsunchecked": ("route",
                         "    if (total > 100) return REFUSALS.activityCloWeights(total);",
                         "    if (total > 1000) return REFUSALS.activityCloWeights(total);"),
    # The refusal never reaches the page: the save fails, the banner does not
    # appear, and the person is left looking at a form that did nothing.
    # Kills row 5 at the sentence.
    "swallowrefusal": ("screen",
                       "      if (!error.expired) setNotice({ error: true, message: error.message })\n"
                       "    } finally {\n"
                       "      setBusy(false)\n"
                       "    }\n"
                       "  }\n"
                       "\n"
                       "  const remove = async () => {",
                       "    } finally {\n"
                       "      setBusy(false)\n"
                       "    }\n"
                       "  }\n"
                       "\n"
                       "  const remove = async () => {"),
    # The CLO picker offers every year's outcomes, not this Offering's. The
    # foreign key would admit them and #27's own screen would not show them,
    # so this is the fourth criterion with nothing but the WHERE behind it.
    # Kills row 4 at the option count - counted against the seed's nine, which
    # is the only count a route cannot move (see `weeksofanysection`).
    "cloofanyyear": ("route",
                     "                                 AND sc.academic_year = c.academic_year\n",
                     ""),
    # The week picker offers every Section's plan. #31's grain, borrowed by
    # this screen and broken here. Kills row 4 at the week count.
    #
    # This one **survived the first sweep**, and is why the sweep is worth
    # running: row 4 compared the screen with `answered.weeks.length` - the
    # same query, asked twice - so widening the WHERE grew both sides together
    # and the assertion saw nothing. It counts against `planWeeksFor` now.
    "weeksofanysection": ("route",
                          "      `SELECT id, week_no, title FROM course_syllabus\n"
                          "        WHERE section_id = $1\n",
                          "      `SELECT id, week_no, title FROM course_syllabus\n"
                          "        WHERE section_id = $1 OR $1 IS NOT NULL\n"),
    # Every piece of work is written as งานเดี่ยว whatever the picker says -
    # the second criterion inverted, and invisible on the form itself. Kills
    # row 1 at the card that should read งานกลุ่ม.
    "onetypesent": ("form",
                    "            activity_type: draft.activity_type,",
                    "            activity_type: 'individual',"),
    # The dates are not loaded back into the form, so every edit of a dated
    # Activity clears its dates. Kills row 2, which is the only place the
    # loaded values are read.
    "nodateload": ("form",
                   "const dateField = value => (value ? String(value).slice(0, 10) : '')",
                   "const dateField = value => (value ? '' : '')"),
    # The two halves of "rows can be added and removed", one mutant each,
    # because the acceptance row claims both and one mutant would only prove
    # the half it broke.
    #
    # `norowadded`: the add button computes the new row and appends nothing.
    # Kills row 1, which is where a second row is typed at all.
    "norowadded": ("form",
                   "      clo_rows: [...current.clo_rows, { clo_id: String(unusedClo(clos, current.clo_rows) ?? ''), weight: '' }],",
                   "      clo_rows: [...current.clo_rows],"),
    # `norowdropped`: the remove button keeps every row. Kills row 6, where a
    # row is taken off and the card must stop naming its CLO.
    "norowdropped": ("form",
                     "      clo_rows: current.clo_rows.filter((row, at) => at !== index),",
                     "      clo_rows: current.clo_rows.filter((row, at) => at !== -1),"),
    # The guard that refuses to drop a CLO a cohort has been marked under.
    #
    # **Killed at the HTTP seam, not in the browser.** The only marked
    # Activities are the seed's, and editing one's attribution from a browser
    # row would be asserting the very refusal under test - see the note at the
    # top of this file:
    #
    #     cd backend && npx node --test test/activity-editor.test.js
    "marksguardoff": ("route",
                      "        if (leaving) {",
                      "        if (leaving && false) {"),
    # Each CLO's share of the mark becomes the weight itself: 60 marks of a
    # 20-mark piece of work, which #34 would then enter marks against.
    #
    # **Killed at the HTTP seam too.** The form draws its own preview from
    # what is typed rather than from the stored column, so the browser never
    # reads this number.
    "markfromweight": ("route",
                       "           VALUES ($1, $2, $3, $4, $5, ROUND($6::numeric * $7::numeric / 100, 2))",
                       "           VALUES ($1, $2, $3, $4, $5, ROUND($7::numeric * $6::numeric / $6::numeric, 2))"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
