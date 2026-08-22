# -*- coding: utf-8 -*-
"""
#23 การเปิดรายวิชาในภาคการศึกษา - the term being planned, and who may plan it.

Mutants for both seams, and the split is deliberate: what the routes answer is asked in
`backend/test/offerings.test.js`, and what only a browser can show - a
replacement box that has quietly become an additive one, a refusal that leaves
the screen showing something else - is asked in `e2e/tests/23a-offerings.spec.js`
and `23b-offerings-refusals.spec.js`.

    python mutation/23-offerings.py save
    python mutation/23-offerings.py <mutant>
    cd backend && node --test test/offerings.test.js
    # or, for the eleven browser ones:
    cd e2e && npx playwright test 23

`nolanding` and `noconfirm` mutate CRA source. Do not apply either while an e2e run
is in flight or the dev frontend is up: the running server compiles what is on disk
at that moment, and a mutant applied mid-run is a result about nothing. The e2e stack
boots its own frontend per run (`reuseExistingServer: false`), so apply first, then
run.
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
    "acting": "backend/auth/authorise.js",
    "page": "frontend/src/pages/Offerings.js",
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
                 "const COMMITTEE = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN', 'FULL_ADMIN', 'TEACHER'];"),
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
    # The section create made idempotent: a number already used under this
    # Offering updates the row it collides with and answers 201. Every count on
    # the screen stays right - there is still one ตอนเรียน 1 - so a test that
    # only counts the cards is happy. What is lost is the refusal itself, and
    # with it the person's chance to learn that the number is taken.
    "dupupsert": ("routes",
                  """        `INSERT INTO course_sections (semester_course_id, section_number)
         VALUES ($1, $2) RETURNING section_id`,
        [offering.id, number],""",
                  """        `INSERT INTO course_sections (semester_course_id, section_number)
         VALUES ($1, $2)
         ON CONFLICT (semester_course_id, section_number)
         DO UPDATE SET section_number = EXCLUDED.section_number
         RETURNING section_id`,
        [offering.id, number],"""),
    # The replacement half of `writeTeachers` kept and the writing half dropped,
    # so an assignment clears the section and puts nobody back. The request
    # still answers 200 with a section in it, which is why this is a browser
    # row: the screen is the only place the empty card is visible.
    "noassign": ("routes",
                 """    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);
    for (const userId of userIds) {""",
                 """    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);
    for (const userId of []) {"""),
    # The copy reproduces the Offerings and not the ตอนเรียน under them. The
    # report still says how many subjects were opened, and the term looks
    # copied from the list - it is one screen further in that the term turns
    # out to have nothing anybody can be enrolled in.
    "nocopysections": ("routes",
                       "          for (const section of sections.rows) {",
                       "          for (const section of []) {"),
    # The second and third outcomes of a copy collapsed into one: subjects
    # already open are still skipped, and no longer named. Pressing คัดลอก twice
    # then reports nothing at all the second time, which reads as a copy that
    # did nothing rather than a copy that found the work already done.
    "nocopyreport": ("routes",
                     """            report.skipped_existing.push(row.subject_id);
            continue;""",
                     """            continue;"""),
    # The 23503 catch on the Offering removal dropped, so the eighth
    # criterion's refusal becomes an unexpected error. The row is still there
    # afterwards - the database saw to that - but what the person is told is the
    # generic failure sentence, not the reason, and nothing on the screen says
    # the term is protected rather than broken.
    "norestrictcatch": ("routes",
                        """        if (isReferenced(error)) {
          return res.status(409).json({ message: REFUSALS.offeringInUse });""",
                        """        if (false) {
          return res.status(409).json({ message: REFUSALS.offeringInUse });"""),
    # The reach clause dropped from the list, leaving the three filters the
    # screen sends. Every account still has to be a committee member to get
    # here, so `wideopen`'s rows stay green; what breaks is the other half of
    # the ninth criterion - a committee member seeing a term that belongs to
    # somebody else's หลักสูตร.
    "anyprogram": ("routes",
                   """      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);""",
                   """      const reach = null;
      const { page, perPage, offset } = pageOf(req);"""),
    # The acting grant of an account that has never chosen taken as the least
    # senior rather than the most senior. Every single-role account is
    # unaffected, which is what makes this the mutant for the multi-role row:
    # the committee member who also teaches arrives as a teacher and is refused
    # by their own screen.
    "firstrole": ("acting",
                  "  ) ?? roles[0];",
                  "  ) ?? roles[roles.length - 1];"),
    # The create leaves the person on the list instead of opening the new
    # Offering's sections. The Offering is made either way and the banner still
    # says so, so nothing at the HTTP surface notices; what is lost is the
    # first criterion's second half, that an Offering with no ตอนเรียน is not
    # yet anything a teacher can reach and the next step is always to add one.
    "nolanding": ("page",
                  """      await load()
      await refresh(offering.id)""",
                  "      await load()"),
    # The confirmation dropped from the section removal: the button on the card
    # deletes. This is the mutant for the half of the eighth criterion that is
    # about being asked - a screen that removes on the first press passes every
    # test that only checks the section is gone afterwards.
    "noconfirm": ("page",
                  """          onRemoveSection={section => {
            setNotice(null)
            setRemoving({ kind: 'section', section })
          }}""",
                  """          onRemoveSection={section => {
            setNotice(null)
            onSection(() => deleteSection(viewing.id, section.section_id))
          }}"""),
}

main(FILES, MUTANTS)
