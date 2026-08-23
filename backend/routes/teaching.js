'use strict';

/**
 * The Teacher's own Sections - ticket #24.
 *
 * Every Teacher screen after this one works from one ตอนเรียน: its students,
 * its work groups, its activities, its scores. This file is where a Teacher
 * finds out which ones are theirs, and where the server decides whether a
 * `section_id` someone is holding is one of them.
 *
 * Four things are decisions rather than shape.
 *
 * *The term comes from the calendar.* `db/term.js` derives it from the date by
 * the faculty's own rule - มิ.ย.-ต.ค. is ภาคต้น, the rest is ภาคปลาย, and the
 * ปีการศึกษา turns over in June with it. The first criterion says "the current
 * year and semester" and nothing in the delivered system answered that; a
 * configured value would have been correct until the term turned, on a day
 * nobody is looking. `db/seed.js` reads the same function, which is what makes
 * a freshly seeded database a database whose dashboard has something on it.
 *
 * *Two gates, and they answer different questions.* `requireRole('TEACHER')`
 * decides whether these routes open at all, and it is the acting grant that is
 * read - an account holding both a committee grant and a teaching one is one or
 * the other at any moment, which is the seventh criterion and the reason
 * switching roles is worth anything. The teaching register then decides which
 * Sections are reachable, per ADR-0002 and re-read on every request. Neither
 * substitutes for the other. See ADR-0004.
 *
 * *A Section the caller does not teach is 404 and not 403.* The house answer
 * for a GET by id, all the way back to `departmentNotFound`: one sentence for
 * the row that does not exist and the row that is not yours, because two
 * sentences let a caller walk the id space and learn which ids are real. The
 * refusal is `sectionNotFound`, which #23 already wrote.
 *
 * *Nothing here reads `db/seed.js`.* The seed exports the term it filled and
 * the value is correct, which is exactly what makes reaching for it tempting: a
 * live route importing the fixture module would make development data a
 * dependency of production. `currentTerm()` is the shared thing, and it is all
 * that is shared.
 */

const express = require('express');

const { currentTerm } = require('../../db/term');
const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');

/**
 * The one role these routes open for.
 *
 * Spread at the call site the way `offerings.js` spreads its own - `requireRole`
 * is variadic, and passing the array itself would build a Set holding one array
 * and admit nobody.
 */
const TEACHING = ['TEACHER'];

/**
 * A Section as the dashboard shows it: which class it is, which subject it
 * belongs to, and how many students are in it.
 *
 * The Offering's own id and term travel with it because the screens below this
 * one need the Offering - ADR-0003 puts the CLO set and the weighting scheme
 * there - and a Section that made each of them ask for it again would be a
 * round trip per screen for a value that cannot change while the id does not.
 */
const RETURNED = `cs.section_id, cs.section_number,
                  sc.id AS semester_course_id, sc.program_id, sc.subject_id,
                  sc.academic_year, sc.semester,
                  s.subject_name_th, s.subject_name_en, s.credits,
                  (SELECT count(*)::int FROM student_course sct
                    WHERE sct.section_id = cs.section_id) AS student_count`;

const FROM = `FROM course_sections_teacher cst
              JOIN course_sections cs ON cs.section_id = cst.section_id
              JOIN semester_courses sc ON sc.id = cs.semester_course_id
              JOIN subjects s ON s.subject_id = sc.subject_id`;

function teachingRoutes(pool) {
  const router = express.Router();

  /**
   * The Sections this account teaches in a given term.
   *
   * The register is the whole of the WHERE clause. A Teacher's grant is scoped
   * at their department (see the seed's note on scopes), but the department is
   * not what decides this and must not be: a colleague's Section is in the same
   * department and is not theirs.
   */
  async function mine(userId, term) {
    const { rows } = await pool.query(
      `SELECT ${RETURNED} ${FROM}
        WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3
        ORDER BY sc.subject_id ASC, cs.section_number ASC`,
      [userId, term.academicYear, term.semester],
    );
    return rows;
  }

  /**
   * The Teacher's dashboard - the first and second criteria.
   *
   * The term travels back with the list, and it is not decoration: the second
   * criterion asks for an empty state that explains itself, and "you are not
   * teaching anything in ภาคต้น ปีการศึกษา 2569" is a different sentence from
   * "there is nothing here". The screen cannot compose the first without being
   * told which term the server looked in, and a screen that worked it out from
   * its own clock would disagree with the server for one day a year.
   */
  router.get('/teaching/sections', requireRole(...TEACHING), async (req, res, next) => {
    try {
      const term = currentTerm();
      return res.status(200).json({ term, sections: await mine(req.session.userId, term) });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One Section, put in context - the sixth criterion.
   *
   * Not restricted to the current term. The dashboard offers this term's
   * Sections, but a Teacher following a link to last year's Section is asking
   * for a Section they taught, and the register says so; refusing it here would
   * be the screen's listing rule enforced as an authorisation rule, which is
   * the confusion ADR-0002 exists to prevent.
   *
   * The id is matched against `\d+` before the query for `reachable`'s reason
   * in #23: `section_id` is an integer column and a non-numeric id would be a
   * 22P02 from PostgreSQL rather than the refusal the caller has earned.
   */
  router.get('/teaching/sections/:sectionId', requireRole(...TEACHING), async (req, res, next) => {
    try {
      const { sectionId } = req.params;
      if (!/^\d+$/.test(String(sectionId))) {
        return res.status(404).json({ message: REFUSALS.sectionNotFound });
      }

      const { rows } = await pool.query(
        `SELECT ${RETURNED} ${FROM} WHERE cs.section_id = $1 AND cst.user_id = $2`,
        [sectionId, req.session.userId],
      );
      if (!rows[0]) return res.status(404).json({ message: REFUSALS.sectionNotFound });

      return res.status(200).json({ section: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { teachingRoutes };
