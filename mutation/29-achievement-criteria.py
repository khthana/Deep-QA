# -*- coding: utf-8 -*-
"""
#29 เกณฑ์การบรรลุผลตาม CLO - what counts as having done it well.

Fourteen mutants - #28's thirteen one table over, minus `taglabelraw` (the
band is stored as the Thai word, so there is no label table to break) plus
two of this screen's own: `banddropped`, which is the same lie told the way
this card can tell it - the heading forgets its band - and
`requiredescription`, which turns the one optional field into a gate. The
pair worth reading first are still `removeslast` and `silentdelete`: both
leave every status code correct and differ only in what actually happened to
the rows.

One mutant steps outside the ticket's files. `anysection` breaks `offeringOf`
in `backend/routes/clos.js`, because that is where the teaching register's
join lives - #29 imports the question rather than asking it again, so the
only honest way to break "a Section that is somebody else's is refused" is to
break it where it is decided. `23:firstrole` set the precedent, and the
acceptance document carries the reason.

The row this file has no mutant for is the shared list (row 2). A criterion
carries a `clo_id` and nothing else - no Section, no owner - so there is no
column a mutant could filter by to give two ตอนเรียน two copies. That gap is
recorded in the acceptance document rather than papered over, as #28 recorded
the same one.

    python mutation/29-achievement-criteria.py save
    python mutation/29-achievement-criteria.py <mutant>
    python mutation/29-achievement-criteria.py restore

Killing them:

    cd e2e && npx playwright test 29a
"""

from harness import main

FILES = {
    "route": "backend/routes/achievementCriteria.js",
    "clos": "backend/routes/clos.js",
    "screen": "frontend/src/pages/AchievementCriteria.js",
    "entry": "frontend/src/pages/CourseOutcomes.js",
}

MUTANTS = {
    # The card link loses the CLO id, so it points at a path no route matches
    # and the screen it lands on never asks the server for criteria. Kills
    # row 1 at the Promise.all waiting for the GET that will not come.
    "linkdropsclo": ("entry",
                     "courseOutcomes/${clo.clo_id}/criteria",
                     "courseOutcomes/criteria"),
    # The list arrives newest-first instead of numbered. Kills row 1 at
    # `numbersOnScreen [1, 2, 3, 4]` - the seed's set comes back reversed.
    # Bound to listOf's SELECT whole, 28:orderbyid's lesson: the renumbering
    # loop's SELECT ends in the same ORDER BY.
    "orderbyid": ("route",
                  "        `SELECT ${RETURNED} FROM subject_clo_achievement_criteria\n"
                  "          WHERE clo_id = $1 ORDER BY criteria_no ASC`,",
                  "        `SELECT ${RETURNED} FROM subject_clo_achievement_criteria\n"
                  "          WHERE clo_id = $1 ORDER BY id DESC`,"),
    # The edit answers 200 and keeps the old detail - COALESCE holds because
    # the column is NOT NULL, and every parameter stays bound, 27:nodetail's
    # lesson. Kills row 3 where the page reads its own edit back.
    "noupdate": ("route",
                 "              SET achievement_level = $3, criteria_detail = $4, criteria_description = $5,",
                 "              SET achievement_level = $3, criteria_detail = COALESCE(criteria_detail, $4), criteria_description = $5,"),
    # The next number skips one. Kills row 4 at `criterionCard(5)` - the row
    # the server just numbered 6 is not the row the screen was told to expect.
    "nextnumber": ("route",
                   "             SELECT $1, COALESCE(MAX(criteria_no), 0) + 1, $2, $3, $4",
                   "             SELECT $1, COALESCE(MAX(criteria_no), 0) + 2, $2, $3, $4"),
    # A successful save no longer reloads the list. Kills row 4 at the card
    # that never appears; row 3 dies with it, because an edit that is not
    # redrawn is the same failure wearing a different verb.
    "savenoreload": ("screen",
                     "      setEditing(null)\n      await load()",
                     "      setEditing(null)"),
    # The card's heading forgets its band - the wire value is correct, and
    # what a person reads is not. Kills row 1 at `bandsOnScreen` and row 4 at
    # the heading that should say ต้องปรับปรุง.
    "banddropped": ("screen",
                    "                      ข้อ {criterion.criteria_no} ·{' '}\n"
                    "                      {criterion.achievement_level}",
                    "                      ข้อ {criterion.criteria_no} ·{' '}\n"
                    "                      {''}"),
    # The description stops being optional - the route refuses a save that
    # leaves the box alone. Kills row 4 at the 201 that answers 400, which is
    # the second criterion's "optional" failing the only way a browser sees.
    "requiredescription": ("route",
                           "  if (!values.criteria_detail) return { ok: false, reason: 'invalidAchievement' };",
                           "  if (!values.criteria_detail || !values.criteria_description) return { ok: false, reason: 'invalidAchievement' };"),
    # The renumbering loop is disarmed, so a removal leaves a gap. Kills row 5
    # at the poll expecting [1, 2, 3, 4, 5] and getting [1, 2, 3, 4, 6].
    "norenumber": ("route",
                   "            if (row.criteria_no !== index + 1) {",
                   "            if (false) {"),
    # The DELETE ignores which row was asked for and takes the last one. Every
    # number is right afterwards - the renumbering has nothing to close - so
    # the only assertion that can see it is the one about substance: what was
    # ข้อ 6 must now be ข้อ 5 still saying what it said. Kills row 5 there and
    # only there; row 4 removes the last row anyway and passes.
    "removeslast": ("route",
                    "            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2`,",
                    "            `DELETE FROM subject_clo_achievement_criteria WHERE clo_id = $2 AND $1::int > 0"
                    " AND criteria_no = (SELECT MAX(criteria_no) FROM subject_clo_achievement_criteria WHERE clo_id = $2)`,"),
    # The DELETE matches nothing and the route still answers 204. Kills row 4
    # at the cleanup poll - the list that was supposed to shrink back reads
    # [1, 2, 3, 4, 5] - and row 5 at its first poll for the same reason.
    "silentdelete": ("route",
                     "            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2`,",
                     "            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2 AND false`,"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 6 at
    # `toEqual([])` - the list of DELETEs sent while cancelling, which is the
    # only honest way to assert a cancel, for `removeClo`'s reason.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The teaching register leaves the WHERE clause of `offeringOf` - in
    # clos.js, where #29 imports it from - so anybody's ตอนเรียน resolves.
    # Kills row 7 at the 404 that answers 200. `$2::text IS NOT NULL` keeps the
    # parameter bound and typed, 25:anysection's lesson.
    "anysection": ("clos",
                   "      WHERE cs.section_id = $1 AND cst.user_id = $2`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 7 at the
    # banner that never appears; row 8 dies with it, being the same swallow
    # with a different sentence inside.
    "swallowrefusal": ("screen",
                       "      setData(null)\n      if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      setData(null)"),
    # The unknown-CLO refusal answers with the wrong sentence - the Section's
    # instead of the CLO's. Kills row 8 at `getByText(cloNotFound)` and leaves
    # row 7 standing, which is what separates the two rows' claims.
    "wrongsentence": ("route",
                      "      res.status(404).json({ message: REFUSALS.cloNotFound });",
                      "      res.status(404).json({ message: REFUSALS.sectionNotFound });"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
