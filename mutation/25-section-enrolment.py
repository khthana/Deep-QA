# -*- coding: utf-8 -*-
"""
#25 รายชื่อนักศึกษาของรายวิชา - the class list of one ตอนเรียน.

Fourteen mutants. Most of them break the server, because most of what #25 asks
for is a rule rather than a picture - but four break the screen instead, and
those are the ones worth reading first: they are how the rows prove they are
about what a person sees rather than about what the API answered. `silentadd`
in particular leaves every status code correct and only stops the sentence
reaching the page, which is precisely the failure a row asserting on the
response would not notice.

Two of them are about the grain, and they are the pair this ticket exists
inside. `anysection` drops the teaching register from the WHERE clause, so a
colleague's class list opens; `offeringgrain` keeps the register and widens the
list to the Offering, so both ตอนเรียน's students appear on one screen. Those
are two different ways of showing somebody students who are not theirs, and
`27-course-outcomes.py` has no equivalent of the second, because a CLO really
does belong to the Offering. This is the file where that difference bites.

    python mutation/25-section-enrolment.py save
    python mutation/25-section-enrolment.py <mutant>
    python mutation/25-section-enrolment.py restore

Killing them:

    cd e2e && npx playwright test 25a
"""

from harness import main

FILES = {
    "route": "backend/routes/enrolment.js",
    "screen": "frontend/src/pages/SubjectStudents.js",
}

MUTANTS = {
    # The offset goes, so every page is the first ten. Kills row 1 at the
    # disjointness of the two pages - and *only* there, because the pager's own
    # line is computed from `total` and would still count up.
    #
    # `$3::int * 0` and not `0`, which was the first draft: dropping the
    # placeholder leaves the call passing three parameters to a statement
    # wanting two, and postgres answers the *list* with a 500. Every row that
    # opens the screen then fails, including the one that only downloads a
    # template, and eleven dead rows say nothing about which of them is the row
    # about the offset. The cast is there for the same reason - a parameter
    # whose only use is arithmetic against a literal has no type to infer.
    "nooffset": ("route",
                 "            LIMIT $2 OFFSET $3`,",
                 "            LIMIT $2 OFFSET $3::int * 0`,"),
    # The count becomes the page rather than the class. Kills the second row 1,
    # at `total > 10`, which is the assertion that says the number under the
    # heading is the whole class and not what is on the screen.
    #
    # It kills four more that read the count to say a number moved (`before + 1`,
    # `enrolled - 1`, `+ SPARE_CODES.length`) and one that reads `pages > 1`. All
    # five are the same wrong number, so the row this one is evidence for is
    # still the one above: a count capped at the page.
    "pagecount": ("route",
                  "'SELECT count(*)::int AS total FROM student_course WHERE section_id = $1',",
                  "'SELECT least(count(*), 10)::int AS total FROM student_course WHERE section_id = $1',"),
    # The teaching register leaves the WHERE clause, so any Section resolves for
    # anybody signed in. Kills the first row 9 at the 404 - the class list of a
    # colleague's ตอนเรียน opens, and ADR-0002 is gone with it.
    #
    # `$2::text` and not a bare `$2`, which was the first draft: postgres cannot
    # infer a type for a parameter whose only use is `IS NOT NULL`, so every
    # call to `sectionOf` answered 500 and all twelve rows died - including the
    # eleven that have nothing to do with whose ตอนเรียน it is. `::text` and not
    # `::int`, which was the second: a user id here is `teach01`, and the cast
    # that looked right for a key is the one the third tier of ADR-0001 is about.
    #
    # Rewritten 2026-08-29: #104 hoisted `sectionOf` to module level so #31
    # could import it, and the query lost two spaces of indentation with the
    # move - same MISS, same cause, as `27:anyclo` when `offeringOf` was
    # hoisted. Re-proved against 25a after the rewrite.
    "anysection": ("route",
                   "      WHERE cs.section_id = $1 AND cst.user_id = $2`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # Authorisation intact, grain widened: the list is drawn from the Offering
    # the way `clos.js` resolves one, so both ตอนเรียน of this รายวิชา show all
    # 113. Kills the second row 9 at the disjointness of the two class lists,
    # and nothing else.
    #
    # It was written expecting row 1 to die at `total < 113` as well, and it does
    # not: the count is its own query and its WHERE has no alias, so this widens
    # the *rows* while leaving the *number* the ตอนเรียน's. The screen reads 57
    # over a list of 113 - which is why `total < 113` is not evidence about the
    # grain, and `pagecount` is the mutant that row rests on.
    "offeringgrain": ("route",
                      "            WHERE sc.section_id = $1\n",
                      "            WHERE sc.section_id IN (SELECT section_id FROM course_sections\n"
                      "                                     WHERE semester_course_id = (SELECT semester_course_id\n"
                      "                                       FROM course_sections WHERE section_id = $1))\n"),
    # The register is not asked, so an unknown code reaches the INSERT and the
    # foreign key answers instead - a 23503 that nobody catches, which is a 500
    # and เกิดข้อผิดพลาดในระบบ. Kills row 3 at the 404, and that is the whole
    # point of the row: the person is told where to add them. It kills row 8 too,
    # because the import's `verify` calls the same function - `importnoverify`
    # below is the one that separates the two paths.
    "noregister": ("route",
                   "    return rows[0] ? null : 'studentNotInRegister';",
                   "    return rows[0] ? null : null;"),
    # The same hole, on the import path only. Kills row 8: the unknown row is
    # not reported, the transaction dies on the foreign key, and the answer is
    # a 500 rather than a report naming line 3.
    "importnoverify": ("route",
                       "          verify: (values) => refuseEnrolment(values),",
                       "          verify: () => null,"),
    # The duplicate key stops being a sentence and becomes a 500. Kills row 4 at
    # the 409 - the enrolment is still refused by the database either way, which
    # is exactly why the row is about the *answer* and not about the count.
    "noduplicate": ("route",
                    "          if (isDuplicate(error)) {\n            return res.status(409).json({ message: REFUSALS.duplicateEnrolment });\n          }",
                    "          if (false) {\n            return res.status(409).json({ message: REFUSALS.duplicateEnrolment });\n          }"),
    # The DELETE matches nothing, and the route still answers 204. Kills the
    # first row 5 at `not.toContain(code)` - the banner says the student was
    # taken out, the dialog closes, and the row is redrawn by the reload. This
    # is the mutant that separates "the screen agreed to remove somebody" from
    # "somebody was removed", and `cancelremoves` above cannot do it: that one
    # removes too much rather than too little.
    "silentremove": ("route",
                     "'DELETE FROM student_course WHERE student_id = $1 AND section_id = $2'",
                     "'DELETE FROM student_course WHERE student_id = $1 AND section_id = $2 AND false'"),
    # The marks guard goes. Nothing in the schema refuses the DELETE, so the
    # removal succeeds and `activity_scores` is left naming somebody who is not
    # in the class. Kills the second row 5 at the 409.
    "marksignored": ("route",
                     "        if (marked) return res.status(409).json({ message: REFUSALS.enrolmentHasScores });",
                     "        if (false) return res.status(409).json({ message: REFUSALS.enrolmentHasScores });"),
    # The template carries the register's columns. Kills row 6 at the header,
    # which is what makes the downloaded file the one the import will accept -
    # a person who filled in four columns would be told they had the wrong file.
    "registertemplate": ("route",
                         "const IMPORT_COLUMNS = ['student_id'];",
                         "const IMPORT_COLUMNS = ['student_id', 'first_name_th', 'last_name_th', 'program_id'];"),
    # The screen swallows the refusal: the request is still made, still answered
    # 404, and nothing appears. Kills row 3 at the visible sentence while every
    # status code in that row stays correct - which is what the row is for. Row 4
    # dies with it: both refusals arrive down the same `catch`, so one swallow
    # silences both, and the two rows are one piece of evidence and not two.
    "silentadd": ("screen",
                  "    } catch (error) {\n      if (!error.expired) setNotice({ error: true, message: error.message })\n    } finally {\n      setBusy(false)\n    }\n  }\n\n  const remove = async () => {",
                  "    } catch (error) {\n      if (error.expired) setNotice({ error: true, message: error.message })\n    } finally {\n      setBusy(false)\n    }\n  }\n\n  const remove = async () => {"),
    # ยกเลิก removes. The dialog still opens and still has two buttons, so
    # nothing about the screen looks different - the wrong one is wired. Kills
    # the first row 5 at the empty list of DELETEs sent while the dialog was up,
    # and nowhere else, because the student does end up removed either way.
    #
    # This is why that row watches the network rather than asserting the row is
    # still drawn: a cancel wired to the removal leaves the row on screen for
    # the length of a round trip, and `toHaveCount(1)` matches on its first poll.
    # The page is not reset, so the reload is a reload of whichever page the
    # person was on. Kills the second row 2 - the banner still names the
    # student, the count still moves, and the table still draws ten people who
    # are not them. Nothing else, because every other row enrols from page 1,
    # where `reload` and `load` do the same thing.
    "addstaysonpage": ("screen",
                       "      await reload()",
                       "      await load()"),
    # The same hole on the import path, which reaches the same reload through a
    # different prop. Kills the second row 7 only. Two mutants and not one
    # because the two paths are two edits, and a single mutant covering both
    # would let either of them be repaired alone without a row noticing.
    "importstaysonpage": ("screen",
                          "            onImported={reload}",
                          "            onImported={load}"),
    "cancelremoves": ("screen",
                      "        onCancel={() => setRemoving(null)}",
                      "        onCancel={remove}"),
}

main(FILES, MUTANTS)
