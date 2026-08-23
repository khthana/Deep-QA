# -*- coding: utf-8 -*-
"""
#24 หน้าหลักผู้สอน - the ตอนเรียน a Teacher teaches, and the one they have open.

Mutants for both seams. What the routes answer is asked in
`backend/test/teaching.test.js`; what only a browser can show - a term that has
quietly stopped being named, a menu entry pointing at a placeholder, a Section
that survived a reload for the wrong reason - is asked in
`e2e/tests/24a-teacher-dashboard.spec.js`.

    python mutation/24-teacher-dashboard.py save
    python mutation/24-teacher-dashboard.py <mutant>
    cd backend && node --test test/teaching.test.js
    # or, for the browser ones:
    cd e2e && npx playwright test 24a
    python mutation/24-teacher-dashboard.py restore

`notoken`, `termlessempty`, `rememberedsection`, `staydashboard` and
`nosectionnumber` mutate CRA source. Do not apply one while a run is in flight
or a dev frontend is up: the running server compiles what is on disk at that
moment, and a mutant applied mid-run is a result about nothing. The e2e stack
boots its own frontend per run (`reuseExistingServer: false`), so apply first,
then run.

## The two that are worth reading first

`notoken` is the one this file was written for. ADR-0004 replaced `%SUBJECT%`,
read out of `localStorage`, with a `section_id` taken from the address, and the
single line that does the replacing had no assertion anywhere: a token that was
never substituted navigates to a path *containing the token*, which routes to
NotBuiltYet - on the screen, indistinguishable from a screen that has genuinely
not been built yet. Every other row in the file passed with that line broken.
The row added to kill it is the only one that clicks a menu entry.

`staydashboard` deliberately kills three rows at once and is kept anyway. Rows
3, "the menu entry", and 5 are three consequences of one claim - the address is
the carrier - so a mutant that removes the id from the address ought to take all
three, and one that took only one would mean two of them were passing for some
other reason. What discriminates *between* them is elsewhere: `notoken` for the
menu, `rememberedsection` for the reload.
"""

from harness import main

FILES = {
    "routes": "backend/routes/teaching.js",
    "sidebar": "frontend/src/components/SidebarItem.js",
    "dashboard": "frontend/src/pages/TeacherDashboard.js",
    "section": "frontend/src/pages/TeacherSection.js",
}

MUTANTS = {
    # The dashboard stops being about a term. The parameters are kept so the
    # query still takes three - a mutant that changed the shape of the call
    # would fail for a reason that is not the claim. teacher.one@ teaches
    # ตอนเรียน 1 of the same subject in this year and the year before, so the
    # list goes from one row to two: that pair is the whole discriminator, and
    # a seed that happened to give every teacher one Section would make this
    # mutant invisible.
    "anyterm": ("routes",
                "WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3",
                "WHERE cst.user_id = $1 AND ($2 IS NOT NULL) AND ($3 IS NOT NULL)"),
    # The teaching register dropped from the by-id read: any Section resolves
    # for anybody signed in as a Teacher. The department gate is still there and
    # still says yes, which is the point - a colleague's Section is in the same
    # department, so scope is not what protects it (ADR-0002).
    "anysection": ("routes",
                   "WHERE cs.section_id = $1 AND cst.user_id = $2",
                   "WHERE cs.section_id = $1 AND ($2 IS NOT NULL)"),
    # The role gate removed from the dashboard. Every single-role Teacher is
    # unaffected, which is what makes this the mutant for the seventh criterion:
    # the account holding both grants reaches a Teacher screen while it is still
    # acting as the committee, and switching roles stops being worth anything.
    "norolegate": ("routes",
                   "router.get('/teaching/sections', requireRole(...TEACHING), async",
                   "router.get('/teaching/sections', async"),
    # The by-id read restricted to the current term - the dashboard's listing
    # rule enforced as an authorisation rule. A Teacher following a link to a
    # Section they taught last year is refused a Section that is theirs.
    "currenttermonly": [
        ("routes",
         "`SELECT ${RETURNED} ${FROM} WHERE cs.section_id = $1 AND cst.user_id = $2`,",
         "`SELECT ${RETURNED} ${FROM} WHERE cs.section_id = $1 AND cst.user_id = $2"
         " AND sc.academic_year = $3`,"),
        ("routes",
         "        [sectionId, req.session.userId],",
         "        [sectionId, req.session.userId, currentTerm().academicYear],"),
    ],
    # The enrolment count climbing a join it should not: counted over the
    # Offering rather than over the Section. Both numbers are plausible on a
    # card and only one of them is the class in front of the lecturer - 113 for
    # a room of 57.
    "countjoin": ("routes",
                  """                  (SELECT count(*)::int FROM student_course sct
                    WHERE sct.section_id = cs.section_id) AS student_count""",
                  """                  (SELECT count(*)::int FROM student_course sct
                    JOIN course_sections cs2 ON cs2.section_id = sct.section_id
                    WHERE cs2.semester_course_id = sc.id) AS student_count"""),
    # The numeric guard removed, so a non-numeric id reaches PostgreSQL and
    # comes back 22P02 through the error handler instead of the refusal the
    # caller has earned. #23 paid for this once already.
    "nonumericguard": ("routes",
                       "      if (!/^\\d+$/.test(String(sectionId))) {",
                       "      if (false) {"),
    # The substitution that ADR-0004 is about, made a no-op. Every
    # Section-specific entry then points at a path with `%SECTION%` still in it,
    # which routes to NotBuiltYet - a screen that looks exactly like the ones
    # that are genuinely not built yet, which is why nothing noticed this until
    # a row clicked one.
    "notoken": ("sidebar",
                "                          subPath = sub.path.replace(SECTION_TOKEN, section)",
                "                          subPath = sub.path"),
    # The empty state stops naming the term. "You have no ตอนเรียน" and "you
    # have no ตอนเรียน in ภาคต้น 2569" are different pieces of news to somebody
    # who taught two of them last term, and the screen still reads perfectly
    # well without the term - which is how a sentence like this rots.
    "termlessempty": ("dashboard",
                      "            ยังไม่มีตอนเรียนที่ได้รับมอบหมายใน{termLabel}",
                      "            ยังไม่มีตอนเรียนที่ได้รับมอบหมาย"),
    # The inherited behaviour restored: the chosen Section written down as well
    # as put in the address. Nothing reads it, so every row about *navigation*
    # still passes - which is the point. A remembered Section that agrees with
    # the URL is invisible until the day it disagrees, and #77 and #81 are what
    # that day looks like.
    "rememberedsection": ("dashboard",
                          """                onClick={() =>
                  navigate(`/teacher/teacherDashboard/${section.section_id}`)
                }""",
                          """                onClick={() => {
                  localStorage.setItem('section', String(section.section_id))
                  navigate(`/teacher/teacherDashboard/${section.section_id}`)
                }}"""),
    # The id kept out of the address altogether. Kills the three rows that are
    # about the address, on purpose - see the header. Read it as the check that
    # rows 3, the menu row and 5 are all genuinely reading the URL, not as a
    # discriminator between them.
    "staydashboard": ("dashboard",
                      "                  navigate(`/teacher/teacherDashboard/${section.section_id}`)",
                      "                  navigate(`/teacher/teacherDashboard`)"),
    # The open Section stops saying which ตอนเรียน it is. The address is still
    # right and the subject is still named, so a row that read only the URL
    # would call this screen correct - and a lecturer teaching two ตอนเรียน of
    # one subject would have no way to tell which one is in front of them.
    "nosectionnumber": ("section",
                        "            ตอนเรียน {section.section_number} · {semesterLabel(section.semester)}{' '}",
                        "            {semesterLabel(section.semester)}{' '}"),
}

main(FILES, MUTANTS)
