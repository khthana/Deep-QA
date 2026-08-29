# -*- coding: utf-8 -*-
"""
#32 กิจกรรมการเรียนรู้ - the assessed work of one Section, grouped by หมวด.

Fifteen mutants. The screen shows two grains at once, so two of them are grain
mutants pulling in opposite directions: `graincrossed` widens the Activities
to the whole Offering (they are the Section's), and `schemefromrows` narrows
the groups to whatever happens to be filed (they are the scheme's). The
second is the mutant that says why the categories come from the server at
all, and it is invisible to every row except the one written for it.

The delete guard is two guards over one statement, and only one of them has a
browser row. `markguardoff` kills cleanly with a 204 and a clean log, because
`activity_scores.activity_id` CASCADEs - the delete succeeds and takes a
cohort's marks with it, which is the whole reason the guard is in the DELETE
rather than before it. The evidence half has no mutant here: the seed plants
no evidence (a real one is a real PDF, #35's business), so nothing in the
browser can reach that branch. It is proved at the HTTP seam instead, and the
acceptance document says so.

Two mutants step outside the ticket's own files, each with the 23:firstrole
justification. `anysection` breaks `sectionOf` in enrolment.js, where the
question "is this Section mine" is decided and from where #32 imports it.
`menudropssection` breaks the sidebar entry in Teacher.js, because the way in
is the menu and the menu is the shell's.

    python mutation/32-activity-list.py save
    python mutation/32-activity-list.py <mutant>
    python mutation/32-activity-list.py restore

Killing them:

    cd e2e && npx playwright test 32a
"""

from harness import main

FILES = {
    "route": "backend/routes/activities.js",
    "enrolment": "backend/routes/enrolment.js",
    "screen": "frontend/src/pages/LearningActivities.js",
    "entry": "frontend/src/components/SidebarItem/Teacher.js",
}

MUTANTS = {
    # The menu entry loses the section token, so the click lands on an address
    # with no Section in it and the GET the row waits for never comes. Kills
    # row 1 at the Promise.all.
    "menudropssection": ("entry",
                         "        path: '/teacher/teacherDashboard/%SECTION%/learningActivities',",
                         "        path: '/teacher/teacherDashboard/learningActivities',"),
    # The scheme arrives in id order rather than in the order it was written.
    # Kills row 1 and row 3 at the headings, which are asserted against
    # SCORE_RATIOS' own order.
    "schemeorder": ("route",
                    "        ORDER BY r.sequence_order ASC, r.score_ratio_id ASC`,",
                    "        ORDER BY r.score_ratio_id DESC`,"),
    # The groups stop coming from the scheme and start coming from whatever is
    # filed: an empty หมวด would silently vanish from the screen.
    #
    # **This one survives the whole browser suite, and that is the finding.**
    # The seed fills all three หมวด in both years, so filtering out the empty
    # ones removes nothing and every row still passes. Nothing here is wrong;
    # what is missing is a category with no work in it, which a browser cannot
    # make until it can add one - #30's screen can, and the acceptance sheet
    # keeps that as a hand-walked row rather than pretending this is covered.
    # Kept in the file because the day the seed grows an empty category, this
    # is the mutant that will start earning its place.
    "schemefromrows": ("screen",
                       "  const groups = categories.map(category => ({",
                       "  const groups = categories.filter(category =>\n"
                       "    activities.some(one => one.score_ratio_id === category.score_ratio_id)\n"
                       "  ).map(category => ({"),
    # The Section filter stops filtering - $1 stays bound, the OR is always
    # true - so every Section's work of every year arrives as one list. Kills
    # rows 1 and 4 at the lists that should be this ตอนเรียน's alone.
    "graincrossed": ("route",
                     "        WHERE a.section_id = $1\n",
                     "        WHERE a.section_id = $1 OR $1 IS NOT NULL\n"),
    # Work is drawn under the wrong heading: the screen groups by the position
    # of the category rather than by its id, so a list whose categories are
    # not in filing order lands under neighbours. Kills row 2.
    "wrongbucket": ("screen",
                    "    activities: activities.filter(one => one.score_ratio_id === category.score_ratio_id),",
                    "    activities: activities.filter((one, at) => at % categories.length === 0),"),
    # Within a category the rows come back newest-first, so the list
    # reshuffles against the order the work was made in. Kills row 2 at the
    # seeded โครงงาน order.
    "orderbyid": ("route",
                  "        ORDER BY r.sequence_order ASC NULLS LAST, a.id ASC`,",
                  "        ORDER BY r.sequence_order ASC NULLS LAST, a.id DESC`,"),
    # The marks guard leaves the DELETE, so deleting a marked Activity
    # succeeds - and the CASCADE takes the cohort's marks with it, silently
    # and with a clean log. This is the mutant the guard exists for. Kills
    # row 7 at the 400 that answers 204.
    "markguardoff": ("route",
                     "              AND NOT EXISTS (SELECT 1 FROM activity_scores s WHERE s.activity_id = $1)\n",
                     "              AND ($1 IS NULL OR TRUE)\n"),
    # The refusal still refuses but the sentence loses the server's count -
    # it says one, whatever was recorded.
    #
    # **Killed at the HTTP seam, not in the browser.** 32a's row 7 builds its
    # expectation from the sentence the server just sent, so a wrong count
    # matches it - the row's claim is that the sentence *reaches the page*,
    # which is a different claim and the one it is allowed to make. The count
    # itself is `backend/test/activities.test.js`, which reads the marks from
    # the database and asserts the sentence against that:
    #
    #     cd backend && npx node --test test/activities.test.js
    #
    # This is the same shape as 27:anyclo, which also dies in a backend suite.
    "wrongcount": ("route",
                   "      return { status: 400, message: REFUSALS.activityHasMarks(marked[0].marks) };",
                   "      return { status: 400, message: REFUSALS.activityHasMarks(1) };"),
    # The delete takes every Activity of the Section, not the one named.
    # Kills row 5 at the list that should have lost exactly one row.
    #
    # `$1::int` and not a bare `$1`, which was the first draft: postgres
    # cannot infer a type for a parameter whose only use is `IS NOT NULL`, so
    # every delete answered 42P08 - a 500, a dirty log, and a "kill" that was
    # really the mutant failing to compile. 25:anysection learned this in the
    # same words one file over.
    "wrongrow": ("route",
                 "`DELETE FROM activities\n"
                 "            WHERE id = $1 AND section_id = $2\n",
                 "`DELETE FROM activities\n"
                 "            WHERE section_id = $2 AND ($1::int IS NOT NULL)\n"),
    # Every date on the screen becomes the dash that means "not set", so a
    # Teacher's announcement and deadline are drawn as absent. Kills row 9 at
    # the one Activity the seed dates - which is the whole reason it is
    # dated. Nothing else on the screen changes.
    "nodates": ("screen",
                "const dateOf = value =>\n  value\n    ? new Date(value).toLocaleDateString('th-TH', {",
                "const dateOf = value =>\n  false\n    ? new Date(value).toLocaleDateString('th-TH', {"),
    # Every Activity reads as งานเดี่ยว, whatever the enum says - the label
    # stops being a reading of the value and becomes a constant. Kills row 9
    # at the โครงงาน, which is group work.
    "onetype": ("screen",
                "const typeName = type => (type === 'group' ? 'งานกลุ่ม' : 'งานเดี่ยว')",
                "const typeName = type => (type === 'nothing' ? 'งานกลุ่ม' : 'งานเดี่ยว')"),
    # The full mark is drawn as the dash that means "not set". Kills row 9 at
    # the 20 and the 100 - the numbers a person plans their marking around.
    "nomark": ("screen",
               "  const mark = Number(score)\n  return Number.isFinite(mark) ? String(mark) : '—'",
               "  const mark = Number(score)\n  return Number.isFinite(mark) ? '—' : '—'"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 6 at the DELETE
    # that should never have been sent.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The teaching register leaves the WHERE clause of `sectionOf` - in
    # enrolment.js, where #32 imports it from (#104). Kills row 8 at the 404
    # that answers 200.
    "anysection": ("enrolment",
                   "      WHERE cs.section_id = $1 AND cst.user_id = $2`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 8 at
    # the banner that never appears.
    "swallowrefusal": ("screen",
                       "      setData(null)\n"
                       "      if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      setData(null)"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
