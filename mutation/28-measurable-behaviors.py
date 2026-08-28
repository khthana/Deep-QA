# -*- coding: utf-8 -*-
"""
#28 พฤติกรรมที่วัดผลได้ตาม CLO - what is inside one CLO.

Thirteen mutants. The pair worth reading first are `removeslast` and
`silentdelete`: both leave every status code correct and differ only in what
actually happened to the rows - one removes the wrong one, the other removes
nothing - which is exactly the difference between "the screen agreed" and "it
happened" that a row asserting on the response would never see.

One mutant steps outside the ticket's files. `anysection` breaks `offeringOf`
in `backend/routes/clos.js`, because that is where the teaching register's
join lives - #28 imports the question rather than asking it again, so the only
honest way to break "a Section that is somebody else's is refused" is to break
it where it is decided. `23:firstrole` set the precedent, and the acceptance
document carries the reason.

The row this file has no mutant for is the shared list (row 2). A behaviour
carries a `clo_id` and nothing else - no Section, no owner - so there is no
column a mutant could filter by to give two ตอนเรียน two copies. The closest
lie, `ORDER BY random()`, flakes on a two-row list rather than proves
anything. That gap is recorded in the acceptance document rather than papered
over, as #25 recorded `noinsert`.

    python mutation/28-measurable-behaviors.py save
    python mutation/28-measurable-behaviors.py <mutant>
    python mutation/28-measurable-behaviors.py restore

Killing them:

    cd e2e && npx playwright test 28a
"""

from harness import main

FILES = {
    "route": "backend/routes/behaviors.js",
    "clos": "backend/routes/clos.js",
    "screen": "frontend/src/pages/MeasurableBehaviors.js",
    "entry": "frontend/src/pages/CourseOutcomes.js",
}

MUTANTS = {
    # The card link loses the CLO id, so it points at a path no route matches
    # and the screen it lands on never asks the server for behaviours. Kills
    # row 1 at the Promise.all waiting for the GET that will not come - the
    # link's mechanics, which 24a's token row does not cover for this label.
    "linkdropsclo": ("entry",
                     "courseOutcomes/${clo.clo_id}/behaviors",
                     "courseOutcomes/behaviors"),
    # The list arrives newest-first instead of numbered. Kills row 1 at
    # `numbersOnScreen [1, 2]` - the seed's pair comes back [2, 1] - and row 4
    # dies with it for the same wrong order. Row 2 survives, which is the
    # point of reading the kill list: both screens draw the same wrong order,
    # so "one list" was never what this mutant broke.
    # Bound to listOf's SELECT whole, because the renumbering loop's SELECT
    # ends in the same ORDER BY - the first draft matched both and the harness
    # refused it, which is the harness doing its job.
    "orderbyid": ("route",
                  "        `SELECT ${RETURNED} FROM subject_clo_measurable_behavior\n"
                  "          WHERE clo_id = $1 ORDER BY behavior_no ASC`,",
                  "        `SELECT ${RETURNED} FROM subject_clo_measurable_behavior\n"
                  "          WHERE clo_id = $1 ORDER BY id DESC`,"),
    # The edit answers 200 and writes nothing - COALESCE keeps the old detail
    # because the column is NOT NULL, and every parameter stays bound, which is
    # what 27's `nodetail` taught: a mutant that breaks the statement kills
    # every row with a 500 and proves nothing. Kills row 3 where the page
    # reads its own edit back.
    "noupdate": ("route",
                 "              SET behavior_detail = $3, learning_activity = $4, cognitive_level = $5,",
                 "              SET behavior_detail = COALESCE(behavior_detail, $3), learning_activity = $4, cognitive_level = $5,"),
    # The next number skips one. Kills row 4 at `behaviorCard(3)` - the row the
    # server just numbered 4 is not the row the screen was told to expect.
    "nextnumber": ("route",
                   "             SELECT $1, COALESCE(MAX(behavior_no), 0) + 1, $2, $3, $4",
                   "             SELECT $1, COALESCE(MAX(behavior_no), 0) + 2, $2, $3, $4"),
    # A successful save no longer reloads the list. Kills row 4 at the card
    # that never appears; row 3 dies with it, because an edit that is not
    # redrawn is the same failure wearing a different verb.
    "savenoreload": ("screen",
                     "      setEditing(null)\n      await load()",
                     "      setEditing(null)"),
    # The card shows the enum value instead of the Thai label. Kills row 4 at
    # `getByText('ประเมินค่า')` - the wire value is correct, and what a person
    # reads is not.
    "taglabelraw": ("screen",
                    "{cognitiveLevelName(behavior.cognitive_level)}",
                    "{behavior.cognitive_level}"),
    # The renumbering loop is disarmed, so a removal leaves a gap. Kills row 5
    # at the poll expecting [1, 2, 3] and getting [1, 2, 4].
    "norenumber": ("route",
                   "            if (row.behavior_no !== index + 1) {",
                   "            if (false) {"),
    # The DELETE ignores which row was asked for and takes the last one. Every
    # number is right afterwards - the renumbering has nothing to close - so
    # the only assertion that can see it is the one about substance: what was
    # ข้อ 4 must now be ข้อ 3 still saying what it said. Kills row 5 there and
    # only there; row 4 removes the last row anyway and passes.
    "removeslast": ("route",
                    "            `DELETE FROM subject_clo_measurable_behavior WHERE id = $1 AND clo_id = $2`,",
                    "            `DELETE FROM subject_clo_measurable_behavior WHERE clo_id = $2 AND $1::int > 0"
                    " AND behavior_no = (SELECT MAX(behavior_no) FROM subject_clo_measurable_behavior WHERE clo_id = $2)`,"),
    # The DELETE matches nothing and the route still answers 204. Kills row 4
    # at the cleanup poll - the list that was supposed to shrink back reads
    # [1, 2, 3] - and row 5 at its first poll for the same reason. The shape of
    # a removal that did not remove, which a row reading only the status calls
    # a pass.
    "silentdelete": ("route",
                     "            `DELETE FROM subject_clo_measurable_behavior WHERE id = $1 AND clo_id = $2`,",
                     "            `DELETE FROM subject_clo_measurable_behavior WHERE id = $1 AND clo_id = $2 AND false`,"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 6 at
    # `toEqual([])` - the list of DELETEs sent while cancelling, which is the
    # only honest way to assert a cancel, for `removeClo`'s reason.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The teaching register leaves the WHERE clause of `offeringOf` - in
    # clos.js, where #28 imports it from - so anybody's ตอนเรียน resolves.
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
