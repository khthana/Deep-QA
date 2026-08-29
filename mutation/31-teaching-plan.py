# -*- coding: utf-8 -*-
"""
#31 แผนการสอน - the week-by-week plan of one Section.

Thirteen mutants. Two things set this sweep apart from its #28-#30
neighbours. First, the grain flips: the plan belongs to the Section, so
`graincrossed` - the mutant #28 and #30 could not have cleanly - exists here,
because `course_syllabus.section_id` is a real column whose filter can be
widened and watched to matter. Second, the delete guard is stricter than the
schema: `activities.course_syllabus_id` is SET NULL, so `guardoff` kills
cleanly with a 204 and a clean log, where #30's RESTRICT would have answered
a dirty 500 - the guard's existence gets its own mutant at last, alongside
`wrongweek` for its sentence.

Two mutants step outside the ticket's own files, each with the 23:firstrole
justification. `anysection` breaks `sectionOf` in enrolment.js, where the
question "is this Section mine" is decided and from where #31 imports it
(#104). `menudropssection` breaks the sidebar entry in Teacher.js, because
the way in is the menu and the menu is the shell's.

`noupdate` and `weekstuck` keep their dead parameter bound with a CASE that
is never true - 27:nodetail's lesson: a dropped binding is a 08P01 the error
handler turns into noise, and a mutant that crashes proves nothing about the
assertion it was written for.

What has no mutant: the smallint ceiling check. Disabling it turns 40000
into a 22003 and the log dirty, so row 8's status assert leans on the
backend suite's crafted-refusals loop; what the browser row proves - and
`saveswallows` backs - is the sentence reaching the person.

    python mutation/31-teaching-plan.py save
    python mutation/31-teaching-plan.py <mutant>
    python mutation/31-teaching-plan.py restore

Killing them:

    cd e2e && npx playwright test 31a
"""

from harness import main

FILES = {
    "route": "backend/routes/teachingPlan.js",
    "enrolment": "backend/routes/enrolment.js",
    "screen": "frontend/src/pages/TeachingPlan.js",
    "entry": "frontend/src/components/SidebarItem/Teacher.js",
}

MUTANTS = {
    # The menu entry loses the section token, so the click lands on an address
    # with no Section in it and the GET the row waits for never comes. Kills
    # row 1 at the Promise.all.
    "menudropssection": ("entry",
                         "        path: '/teacher/teacherDashboard/%SECTION%/teachingPlan',",
                         "        path: '/teacher/teacherDashboard/teachingPlan',"),
    # The plan arrives newest-first instead of in calendar order. Kills row 1
    # at the headings read against `planWeeksFor`'s order.
    "orderbyid": ("route",
                  "        WHERE section_id = $1\n"
                  "        ORDER BY week_no ASC, id ASC`,",
                  "        WHERE section_id = $1\n"
                  "        ORDER BY id DESC`,"),
    # The Section filter stops filtering - $1 stays bound, the OR is always
    # true, and every Section's plan of every year arrives as one list. The
    # widening #28 could not have: here the column exists, so the mutant can.
    # Kills rows 1 and 2 at the headings that should be this Section's three.
    "graincrossed": ("route",
                     "        WHERE section_id = $1\n"
                     "        ORDER BY week_no ASC, id ASC`,",
                     "        WHERE section_id = $1 OR $1 IS NOT NULL\n"
                     "        ORDER BY week_no ASC, id ASC`,"),
    # The edit answers 200 and keeps the old title - the CASE keeps $4 bound
    # and never true. Kills row 2 at the marker that never appears on the
    # editing screen itself.
    "noupdate": ("route",
                 "              SET week_no = $3, title = $4, description = $5, remark = $6, updated_at = now()",
                 "              SET week_no = $3, title = CASE WHEN $4 = '' THEN $4 ELSE title END, description = $5, remark = $6, updated_at = now()"),
    # The typed week number is ignored and every new topic lands on week 1 -
    # $2 stays bound. Kills row 3 at the [1, 2, 3, 4] that reads [1, 1, 2, 3].
    "weekstuck": ("route",
                  "         VALUES ($1, $2, $3, $4, $5, $6)",
                  "         VALUES ($1, CASE WHEN $2 < 0 THEN $2 ELSE 1 END, $3, $4, $5, $6)"),
    # A successful save no longer re-reads the plan, so the added card never
    # appears. Kills row 3 at the poll after the POST; rows 2 and 4 die with
    # it, being the same reload around other writes.
    "savenoreload": ("screen",
                     "      setEditing(null)\n"
                     "      await load()\n"
                     "      setNotice({ error: false, message: 'บันทึกแผนการสอนแล้ว' })",
                     "      setEditing(null)\n"
                     "      setNotice({ error: false, message: 'บันทึกแผนการสอนแล้ว' })"),
    # The delete takes every topic wearing the same week number, not the one
    # row the person named - the CLO screens' renumbering instinct sneaking
    # into a place where the number is not a key. Kills row 4 where the seeded
    # week 2 vanishes alongside the temporary one.
    #
    # Bound to the DELETE's first two lines together: `WHERE id = $1 AND
    # section_id = $2` alone appears in the PUT as well, and the harness
    # refuses an ambiguous mutant rather than editing the first match.
    "wrongrow": ("route",
                 "`DELETE FROM course_syllabus\n"
                 "            WHERE id = $1 AND section_id = $2\n",
                 "`DELETE FROM course_syllabus\n"
                 "            WHERE week_no = (SELECT week_no FROM course_syllabus WHERE id = $1)\n"
                 "              AND section_id = $2\n"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 5 at the DELETE
    # that should never have been sent.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The in-use guard stops looking, and the delete of a referenced week
    # answers 204 - which the SET NULL foreign key permits, silently orphaning
    # สอบกลางภาค from its week. This is the mutant #30 could not have cleanly;
    # here the schema does not catch the fall, which is the point of the
    # guard. Kills row 6 at the 400 that answers 204, log clean.
    #
    # It breaks the `NOT EXISTS` inside the DELETE rather than an `if` before
    # it, because the guard moved into the statement when the review found the
    # gap between asking and deleting. `$1 IS NULL OR TRUE` keeps the parameter
    # bound while always passing - 27:nodetail's lesson, one clause along.
    "guardoff": ("route",
                 "              AND NOT EXISTS (SELECT 1 FROM activities WHERE course_syllabus_id = $1)`,",
                 "              AND ($1 IS NULL OR TRUE)`,"),
    # The refusal still refuses but names week 0 whatever week was asked.
    # Kills row 6 at the banner built from refusals.js with the real 1 in it.
    "wrongweek": ("route",
                  "        if (rows[0]) return res.status(400).json({ message: REFUSALS.weekInUse(week.week_no) });",
                  "        if (rows[0]) return res.status(400).json({ message: REFUSALS.weekInUse(0) });"),
    # The teaching register leaves the WHERE clause of `sectionOf` - in
    # enrolment.js, where #31 imports it from (#104). Kills row 7 at the 404
    # that answers 200.
    "anysection": ("enrolment",
                   "      WHERE cs.section_id = $1 AND cst.user_id = $2`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 7 at
    # the banner that never appears.
    "swallowrefusal": ("screen",
                       "      setData(null)\n"
                       "      if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      setData(null)"),
    # The screen swallows the refusal a failed save carries. Kills row 8 at
    # the banner with the server's own sentence in it.
    "saveswallows": ("screen",
                     "    } catch (error) {\n"
                     "      if (!error.expired) setNotice({ error: true, message: error.message })\n"
                     "    } finally {\n"
                     "      setBusy(false)",
                     "    } catch (error) {\n"
                     "    } finally {\n"
                     "      setBusy(false)"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
