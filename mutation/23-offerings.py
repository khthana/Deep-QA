# -*- coding: utf-8 -*-
"""
#23 การเปิดรายวิชาในภาคการศึกษา - the term being planned, and who may plan it.

Five mutants. Three break the backend seam and two break the browser one, and
the split is deliberate: what the routes answer is asked in
`backend/test/offerings.test.js`, and what only a browser can show - a
replacement box that has quietly become an additive one, a refusal that leaves
the screen showing something else - is asked in `e2e/tests/23a-offerings.spec.js`
and `23b-offerings-refusals.spec.js`.

    python mutation/23-offerings.py save
    python mutation/23-offerings.py <mutant>
    cd backend && node --test test/offerings.test.js
    # or, for the two browser ones:
    cd e2e && npx playwright test 23
    python mutation/23-offerings.py restore

`sectionglobal` is the one to read first. The third criterion is a fact about a
constraint - `(semester_course_id, section_number)` per Offering, not
`section_number` alone - and the inherited system had it globally unique, which
is what migration 0002's header comment says it corrects. The obvious mutant is
therefore on the migration, and it is the wrong one: the seed itself opens
section `1` under both 2568 and 2567, so a globally unique constraint fails
during seeding and every test in the file errors in `before()`. A mutant that
kills a whole file proves nothing about which assertion discriminates. So this
one reproduces the old rule at the route instead - a pre-check that refuses a
section number already used anywhere - and kills exactly the half of criterion
three that everybody forgets to write.
"""

from harness import main

FILES = {
    "routes": "backend/routes/offerings.js",
}

MUTANTS = {
    # The inherited constraint: a section number unique across the whole
    # system. Kills the half of criterion three that says the same number may
    # exist under two different subjects, and leaves the half everybody thinks
    # of - the same number twice under one Offering - still passing. A test
    # written for only the second half would call this schema correct.
    "sectionglobal": ("routes",
                      """      const { rows } = await pool.query(
        `INSERT INTO course_sections (semester_course_id, section_number)""",
                      """      const clash = await pool.query(
        `SELECT 1 FROM course_sections WHERE section_number = $1`,
        [number],
      );
      if (clash.rows[0]) {
        return res.status(409).json({ message: REFUSALS.duplicateSectionNumber });
      }

      const { rows } = await pool.query(
        `INSERT INTO course_sections (semester_course_id, section_number)"""),
    # Faculty and department administrators admitted, which is what every
    # screen from #14 to #18 does and what a reader will assume this one does
    # too. Kills the ninth criterion's tests at both seams; the committee's own
    # rows stay green, so nothing but those refusals notices.
    "wideopen": ("routes",
                 "const COMMITTEE = ['PROG_MANAGER'];",
                 "const COMMITTEE = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN'];"),
    # `teacherRefusal` made to answer `null` for every list, so nothing is
    # checked before the write. An unknown code then reaches the foreign key and
    # comes back as an unexpected error rather than as the fifth criterion's
    # sentence; a code that is real but suspended is simply *accepted*, which is
    # the quieter half. Kills both rows of the fifth criterion - the one the
    # ticket names as a test, and the suspended-account one written beside it.
    "nocheckteacher": ("routes",
                       "    if (userIds.length === 0) return null;",
                       "    if (userIds.length >= 0) return null;"),
    # The placement asked about after the insert rather than before it, which
    # is the trap #18's `catalogueRefusal` documents: the foreign key raises the
    # same 23503 a protected delete does, so the sixth criterion's refusal
    # becomes an unexpected error. Kills the sixth criterion's test.
    "nocheckplacement": ("routes",
                         "      const notPlaced = await placementRefusal(draft.values.program_id, draft.values.subject_id);\n      if (notPlaced) return res.status(400).json({ message: REFUSALS[notPlaced] });",
                         "      const notPlaced = null;\n      if (notPlaced) return res.status(400).json({ message: REFUSALS[notPlaced] });"),
    # The syllabus guard removed, so the removals go back to trusting that every
    # child of a section refuses through ON DELETE RESTRICT. Five of the six do.
    # `course_syllabus` cascades, so a section with a มคอ.3 and no enrolments
    # deletes cleanly and takes the plan with it - 204, no refusal, no record.
    # This is the mutant that says why that check is asked by name rather than
    # caught from the database.
    "nosyllabus": ("routes",
                   """          if (await hasSyllabus(client, [section.section_id])) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: REFUSALS.sectionInUse });
          }""",
                   """          if (false) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: REFUSALS.sectionInUse });
          }"""),
    # The catalogue tier dropped from `placementRefusal`, leaving only the
    # pairing. A subject retired in ข้อมูลรายวิชา but still live in the
    # curriculum is then openable from the address bar and re-openable by the
    # copy route every term, while the picker on the same screen hides it.
    "nocatalogue": ("routes",
                    "    return rows[0].catalogued ? null : 'subjectClosed';",
                    "    return null;"),
    # The length check dropped, so an eleventh character reaches the column and
    # raises 22001 - neither the 23505 the duplicate case catches nor the 23503
    # the removals catch - and an ordinary typing mistake comes back a 500.
    "nolength": ("routes",
                 "  if (!number || number.length > 10) return null;",
                 "  if (!number) return null;"),
    # The teacher assignment made additive rather than a replacement: the
    # existing rows are kept and the submitted ones added. Every request the
    # screen makes still succeeds and the server still answers 200, so nothing
    # at the HTTP surface that merely asserts a teacher *is* assigned notices.
    # What dies is the browser row that un-ticks somebody and expects them gone
    # - `23a`'s row 4, second half - and the backend row that assigns two and
    # then one. This is the mutant that says why the fourth criterion is worded
    # "and reassigned afterwards".
    "additive": ("routes",
                 "    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);\n    for (const userId of userIds) {",
                 "    for (const userId of userIds) {"),
}

main(FILES, MUTANTS)
