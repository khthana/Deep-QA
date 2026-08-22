'use strict';

/**
 * Offerings and Sections — ticket #23.
 *
 * รายวิชาที่เปิดสอน: which of a หลักสูตร's subjects actually run in a given
 * ปีการศึกษา and ภาคการศึกษา, split into ตอนเรียน, each given to one or more
 * ผู้สอน. CONTEXT.md keeps the Offering and the Section apart and so does this
 * file: the Offering is the subject-in-a-term, the Section is a class within
 * it, and everything on the Teacher side of the system hangs off the second.
 *
 * Five things are different enough from #18 to be worth naming, because each is
 * a place where copying it would have been wrong.
 *
 * *One role, and this is the only screen with one.* The ticket's ninth
 * criterion says the Curriculum Committee alone, Faculty Admin included in the
 * refusal. #79 already moved the faculty out of #18; this goes one further and
 * moves the department administrator out too. Opening a subject for a term is a
 * teaching decision, and the committee is who makes it.
 *
 * *The reach is still one clause, for #18's reason.* A `PROG_MANAGER`'s
 * `scope_id` *is* a `program_id`, so `coveredScopes` answers `['0501']` and
 * `program_id = ANY(reach)` is the whole of it. With one role admitted the
 * array is always exactly one long today, and the clause is written as though
 * it were not, so that admitting a second role later is a change to
 * `COMMITTEE` and to nothing else.
 *
 * *Nothing here can be switched off.* #15 through #18 answer a removal that
 * something references with 200 and `deactivated: true`. Neither
 * `semester_courses` nor `course_sections` has an `is_active` column, and that
 * is deliberate rather than an omission: an Offering is a record of a term that
 * ran, a term that has enrolled students cannot be made not to have run, and a
 * disabled Offering would be a row the marks still hang off but the screens no
 * longer show. So the eighth criterion is a refusal - 409, and the row stays
 * exactly as it was.
 *
 * *A teacher is checked against the register explicitly, not through the
 * foreign key.* An assignment writes a set of rows at once, so a 23503 from
 * `course_sections_teacher` says that one of them was wrong without saying
 * which - and the fifth criterion needs a screen that can point at the person.
 * Which register: `users`, with no requirement that they hold TEACHER. The
 * ticket and docs/06 both say "already registered as a user", and a section is
 * sometimes taught by somebody whose grant is another role.
 *
 * *Copying a term is the only bulk write on this screen, and it reports three
 * outcomes rather than a count.* See the note on the route.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate, isReferenced } = require('../lib/fields');
const { pageOf } = require('../lib/paging');
const { reachablePrograms, programInReach } = require('../lib/reach');

/**
 * The role that decides what runs this term.
 *
 * One name, and the only one-name list in the routes. See the note at the top
 * of the file for why the two administrators above the committee are absent.
 */
const COMMITTEE = ['PROG_MANAGER'];

/** `semester` on `semester_courses`, exactly: ภาคต้น ภาคปลาย ภาคฤดูร้อน. */
const SEMESTERS = [1, 2, 3];

/**
 * What an Offering is, as this file reads it out: the term and its key, with
 * the catalogue entry and the placement read alongside - the screen lists
 * subject names, credits and whether each is บังคับ or เลือก, and a list of
 * codes alone would send it back for each one.
 */
const RETURNED = `sc.id, sc.program_id, sc.subject_id, sc.academic_year, sc.semester,
                  s.subject_name_th, s.subject_name_en, s.credits, ps.subject_type,
                  (SELECT count(*)::int FROM course_sections cs
                    WHERE cs.semester_course_id = sc.id) AS section_count`;

const FROM = `FROM semester_courses sc
              JOIN subjects s ON s.subject_id = sc.subject_id
              JOIN program_subjects ps
                ON ps.program_id = sc.program_id AND ps.subject_id = sc.subject_id`;

/**
 * One Offering's worth of fields, from the form that opens a subject.
 *
 * All four are required and none is editable afterwards: moving an Offering to
 * another term is closing one and opening another, because the sections, the
 * enrolments and every mark beneath it belong to the term it was in.
 */
function readOffering(source) {
  const values = {
    program_id: blankToNull(source.program_id),
    subject_id: blankToNull(source.subject_id),
    academic_year: blankToNull(source.academic_year),
    semester: Number(source.semester),
  };

  if (!values.program_id || !values.subject_id) {
    return { ok: false, reason: 'invalidOffering' };
  }
  // Four digits, Buddhist era, as every other year in the system is written.
  // Not range-checked: a curriculum committee planning three years ahead is
  // doing its job, and a year nobody wants is a row they can remove.
  if (!/^\d{4}$/.test(values.academic_year ?? '')) {
    return { ok: false, reason: 'invalidOffering' };
  }
  if (!SEMESTERS.includes(values.semester)) {
    return { ok: false, reason: 'invalidOffering' };
  }

  return { ok: true, values };
}

/** A term, as the copy route reads its two ends. */
/**
 * A section number off a request body, or `null` if it is not one.
 *
 * The length is checked here rather than left to the column. `section_number`
 * is `varchar(10)`, and an eleventh character raises 22001 - which is neither
 * the 23505 the duplicate case catches nor the 23503 the removals catch, so it
 * fell through to the generic handler as a 500 for what is an ordinary typing
 * mistake. The form caps it at ten too, but that cap is a courtesy to the
 * person typing and not a rule: this is the rule.
 */
function readSectionNumber(body) {
  const number = blankToNull((body ?? {}).section_number);
  if (!number || number.length > 10) return null;
  return number;
}

function readTerm(year, semester) {
  const value = { academic_year: blankToNull(year), semester: Number(semester) };
  if (!/^\d{4}$/.test(value.academic_year ?? '')) return null;
  if (!SEMESTERS.includes(value.semester)) return null;
  return value;
}

function offeringRoutes(pool) {
  const router = express.Router();

  /**
   * The programme this request may write into.
   *
   * Named by the body or reached through the path and checked against the reach
   * derived from the acting grant, which is the shape ADR-0002 permits:
   * authority is never read from a request, a target named by one is verified.
   */
  async function programRefusal(req, programId) {
    if (!programId) return 'invalidOffering';
    const program = await programInReach(pool, req.auth.acting.scope_id, programId);
    return program ? null : 'offeringNotYours';
  }

  /**
   * Whether this subject is in this programme and still offered — the sixth
   * criterion, and the trap this route has to step around.
   *
   * A subject that has not been placed would fail the insert with a foreign key
   * violation on `(program_id, subject_id)`, which is `isReferenced`'s 23503 -
   * the same code the *delete* below gets when children exist. The two cannot
   * be told apart from the error, and the criterion asks for a message that
   * says what is wrong, so the question is asked explicitly here.
   *
   * A code the catalogue has never heard of answers the same key as one that
   * was simply never placed. From this screen they are one mistake with one
   * remedy - put it in the curriculum first - and a separate answer for the
   * second would turn the form into a way of reading the catalogue.
   */
  async function placementRefusal(programId, subjectId) {
    if (!subjectId) return 'invalidOffering';
    const { rows } = await pool.query(
      `SELECT ps.is_active AS placed, s.is_active AS catalogued
         FROM program_subjects ps
         JOIN subjects s ON s.subject_id = ps.subject_id
        WHERE ps.program_id = $1 AND ps.subject_id = $2`,
      [programId, subjectId],
    );
    if (!rows[0]) return 'subjectNotInProgram';
    if (!rows[0].placed) return 'subjectNotOffered';
    // And the tier above it. `routes/subjects.js` retires a referenced entry by
    // switching `subjects.is_active` off and leaving the pairing alone, so a
    // subject can be live in the curriculum and closed in the catalogue at the
    // same time. The picker on this screen already filters on both; without
    // this line the address bar and the copy route would still open one.
    return rows[0].catalogued ? null : 'subjectClosed';
  }

  /**
   * Whether a weekly plan hangs off any of these sections.
   *
   * Asked rather than left to the database, and that is the whole point. Every
   * other child of a section refuses through `ON DELETE RESTRICT`, so the
   * removal below could be written as "try it and catch 23503" - which is what
   * it was. `course_syllabus.section_id` is `ON DELETE CASCADE`, alone among
   * them, because a plan is written *about* a section and has no life without
   * one. That is right for the row and wrong for the removal: a section with no
   * enrolments and a มคอ.3 filled in would delete cleanly and take a teacher's
   * term of work with it, with a 204 and no record.
   *
   * So the protection cannot be a whitelist by omission. It is asked here by
   * name, and the next table added with `CASCADE` has to be added here too.
   */
  async function hasSyllabus(executor, sectionIds) {
    if (sectionIds.length === 0) return false;
    const { rows } = await executor.query(
      `SELECT 1 FROM course_syllabus WHERE section_id = ANY($1::int[]) LIMIT 1`,
      [sectionIds],
    );
    return Boolean(rows[0]);
  }

  /**
   * Whether every one of these codes is somebody the system knows — the fifth
   * criterion.
   *
   * Answers on the first bad one and names nothing, so the assignment box
   * cannot be used to find out who is in the register. A suspended account is
   * a separate answer because the code is right and what to do about it is
   * different.
   */
  async function teacherRefusal(userIds) {
    if (userIds.length === 0) return null;
    const { rows } = await pool.query(
      `SELECT user_id, status FROM users WHERE user_id = ANY($1::text[])`,
      [userIds],
    );
    const known = new Map(rows.map((row) => [row.user_id, row.status]));
    for (const userId of userIds) {
      if (!known.has(userId)) return 'teacherNotRegistered';
      if (known.get(userId) !== 'active') return 'teacherNotActive';
    }
    return null;
  }

  /**
   * The Offering, if this grant reaches its programme.
   *
   * The same reach the list filters on, so an Offering the list did not show
   * cannot be opened by asking for it directly - and out of scope answers the
   * same 404 as never-made, which is the ninth criterion enforced at the server
   * rather than in a menu.
   */
  async function reachable(req, id) {
    if (!/^\d+$/.test(String(id))) return null;
    const reach = await coveredScopes(pool, req.auth.acting.scope_id);
    const { rows } = await pool.query(
      `SELECT ${RETURNED} ${FROM}
        WHERE sc.id = $1 AND ($2::text[] IS NULL OR sc.program_id = ANY($2))`,
      [id, reach],
    );
    return rows[0] ?? null;
  }

  /** The Offering as the screen wants it, read back after a write. */
  async function loadOffering(executor, id) {
    const { rows } = await executor.query(`SELECT ${RETURNED} ${FROM} WHERE sc.id = $1`, [id]);
    return rows[0];
  }

  /**
   * The sections of one Offering, each with the people teaching it and how many
   * students are enrolled.
   *
   * The count is what the screen puts behind its confirmation dialog: the
   * eighth criterion's refusal is the server's, and a screen that only learns
   * about it from a 409 cannot warn anybody first.
   */
  async function loadSections(executor, offeringId) {
    const { rows } = await executor.query(
      `SELECT cs.section_id, cs.section_number,
              (SELECT count(*)::int FROM student_course en
                WHERE en.section_id = cs.section_id) AS student_count,
              coalesce((
                SELECT json_agg(json_build_object(
                         'user_id', u.user_id,
                         'title_th', u.title_th,
                         'first_name_th', u.first_name_th,
                         'last_name_th', u.last_name_th,
                         'email', u.email) ORDER BY u.user_id)
                  FROM course_sections_teacher cst
                  JOIN users u ON u.user_id = cst.user_id
                 WHERE cst.section_id = cs.section_id), '[]'::json) AS teachers
         FROM course_sections cs
        WHERE cs.semester_course_id = $1
        ORDER BY cs.section_number ASC`,
      [offeringId],
    );
    return rows;
  }

  /** One section, read back after a write, in the same shape the list uses. */
  async function loadSection(executor, offeringId, sectionId) {
    const sections = await loadSections(executor, offeringId);
    return sections.find((section) => String(section.section_id) === String(sectionId));
  }

  /**
   * The section named by the path, if it belongs to the Offering also named by
   * it and that Offering is in reach.
   *
   * Both halves, so a section id guessed against another Offering is a 404
   * rather than an edit of a class somebody else runs.
   */
  async function reachableSection(req, offeringId, sectionId) {
    const offering = await reachable(req, offeringId);
    if (!offering) return { offering: null, section: null };
    if (!/^\d+$/.test(String(sectionId))) return { offering, section: null };
    const { rows } = await pool.query(
      `SELECT section_id, section_number FROM course_sections
        WHERE section_id = $1 AND semester_course_id = $2`,
      [sectionId, offering.id],
    );
    return { offering, section: rows[0] ?? null };
  }

  /** Replacing the set of people teaching one section, inside a transaction. */
  async function writeTeachers(executor, sectionId, userIds) {
    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);
    for (const userId of userIds) {
      await executor.query(
        `INSERT INTO course_sections_teacher (section_id, user_id) VALUES ($1, $2)
         ON CONFLICT (section_id, user_id) DO NOTHING`,
        [sectionId, userId],
      );
    }
  }

  /**
   * The list — the screen's main view.
   *
   * Ten to a page with the total, narrowed by `?program_id=`, `?academic_year=`
   * and `?semester=`, which is what the screen's three pickers send. Each
   * filter applies *inside* the reach rather than instead of it: a caller
   * naming a programme they do not hold gets an empty page, not somebody
   * else's teaching plan.
   *
   * Newest term first, because the term being worked on is almost always the
   * one about to run.
   */
  router.get('/offerings', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);
      const program = blankToNull(req.query.program_id) ?? null;
      const year = blankToNull(req.query.academic_year) ?? null;
      const semester = SEMESTERS.includes(Number(req.query.semester))
        ? Number(req.query.semester)
        : null;

      const where = `WHERE ($1::text[] IS NULL OR sc.program_id = ANY($1))
                       AND ($2::text IS NULL OR sc.program_id = $2)
                       AND ($3::text IS NULL OR sc.academic_year = $3)
                       AND ($4::int IS NULL OR sc.semester = $4)`;

      const counted = await pool.query(`SELECT count(*)::int AS total ${FROM} ${where}`, [
        reach,
        program,
        year,
        semester,
      ]);
      const { rows } = await pool.query(
        `SELECT ${RETURNED} ${FROM} ${where}
          ORDER BY sc.academic_year DESC, sc.semester DESC, sc.subject_id ASC
          LIMIT $5 OFFSET $6`,
        [reach, program, year, semester, perPage, offset],
      );

      return res.status(200).json({
        offerings: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The programmes this caller reaches — the list's filter and the form's
   * picker, drawn from here rather than from `/api/programs`, which belongs to
   * the two administrators (#15) and would refuse the committee member this
   * screen is entirely for.
   */
  router.get('/offerings/programs', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const programs = await reachablePrograms(pool, req.auth.acting.scope_id);
      return res.status(200).json({ programs });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The subjects that may be opened — the sixth criterion, drawn as a picker.
   *
   * Only what #18 placed into the programme, and only what is still switched
   * on, so the refusal `placementRefusal` gives is the server's answer to a
   * request the screen would not have sent. Narrowed by the programme, which
   * is checked: this is a read of somebody's curriculum.
   */
  router.get('/offerings/subjects', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const program = blankToNull(req.query.program_id);
      const notYours = await programRefusal(req, program);
      if (notYours === 'invalidOffering') {
        return res.status(400).json({ message: REFUSALS.invalidOffering });
      }
      if (notYours) return res.status(403).json({ message: REFUSALS[notYours] });

      const { rows } = await pool.query(
        `SELECT ps.subject_id, ps.subject_type,
                s.subject_name_th, s.subject_name_en, s.credits
           FROM program_subjects ps
           JOIN subjects s ON s.subject_id = ps.subject_id
          WHERE ps.program_id = $1 AND ps.is_active AND s.is_active
          ORDER BY ps.subject_id ASC`,
        [program],
      );
      return res.status(200).json({ subjects: rows });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The people who may be given a section — the picker behind the fifth
   * criterion, narrowed by `?q=` on the code, either name or the address.
   *
   * Every active account, not only those holding TEACHER: see the note at the
   * top of the file. Not narrowed by reach either, for #18's catalogue reason -
   * a section is often taught by somebody from another department, and a picker
   * narrowed to the programme's own could not express a real timetable. What is
   * scoped is the write, which is checked against the Offering.
   */
  router.get('/offerings/teachers', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const q = blankToNull(req.query.q) ?? null;
      const { rows } = await pool.query(
        `SELECT user_id, title_th, first_name_th, last_name_th, email, department_id
           FROM users
          WHERE status = 'active'
            AND ($1::text IS NULL
                 OR user_id ILIKE '%' || $1 || '%'
                 OR email ILIKE '%' || $1 || '%'
                 OR coalesce(first_name_th, '') ILIKE '%' || $1 || '%'
                 OR coalesce(last_name_th, '') ILIKE '%' || $1 || '%')
          ORDER BY user_id ASC
          LIMIT 200`,
        [q],
      );
      return res.status(200).json({ teachers: rows });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Copying a whole term — the seventh criterion.
   *
   * Declared before `/offerings/:id` because Express matches in order.
   *
   * What it reports is three outcomes rather than a count, because all three
   * happen on a real copy and a single number would hide two of them. A subject
   * already open in the target term is *skipped*, not an error: copying twice
   * has to be safe, or the person who is not sure whether they already pressed
   * it has no way to find out. A subject that has since been taken out of the
   * curriculum is skipped for a different reason and has to be named, because
   * that is the one the person has to do something about.
   *
   * Sections come across with their numbers, and the people teaching them come
   * with the sections. The ticket says "the Offerings and Sections", and a
   * teacher is strictly a third thing - but "an entire semester's arrangement"
   * is what the sentence above it asks for, and a copy that leaves every
   * section unstaffed saves the smaller half of the work. A teacher who has
   * left since, or whose account has been suspended, is dropped and named in
   * the report rather than failing the copy: their leaving is not a reason the
   * other eleven subjects should not be opened.
   *
   * The whole copy is one transaction. A copy that stopped half way would leave
   * a term nobody could tell from one that had been built by hand.
   */
  router.post('/offerings/copy', requireRole(...COMMITTEE), async (req, res, next) => {
    const body = req.body ?? {};
    try {
      const program = blankToNull(body.program_id);
      const notYours = await programRefusal(req, program);
      if (notYours === 'invalidOffering') {
        return res.status(400).json({ message: REFUSALS.invalidOffering });
      }
      if (notYours) return res.status(403).json({ message: REFUSALS[notYours] });

      const from = readTerm(body.from_academic_year, body.from_semester);
      const to = readTerm(body.academic_year, body.semester);
      if (!from || !to) return res.status(400).json({ message: REFUSALS.invalidOffering });
      if (from.academic_year === to.academic_year && from.semester === to.semester) {
        return res.status(400).json({ message: REFUSALS.invalidOffering });
      }

      const source = await pool.query(
        `SELECT sc.id, sc.subject_id FROM semester_courses sc
          WHERE sc.program_id = $1 AND sc.academic_year = $2 AND sc.semester = $3
          ORDER BY sc.subject_id ASC`,
        [program, from.academic_year, from.semester],
      );

      const report = {
        created: [],
        skipped_existing: [],
        skipped_unplaced: [],
        skipped_closed: [],
        dropped_teachers: [],
        sections: 0,
      };

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const row of source.rows) {
          // Asked per subject rather than joined into the query above, so that
          // the reasons for skipping stay separate reasons. `placementRefusal`
          // answers two of them since the catalogue tier was added, and they
          // are not the same news: one is fixed on รายวิชาในหลักสูตร, the other
          // on ข้อมูลรายวิชา. Folding both into `skipped_unplaced` would put a
          // subject the curriculum still holds under a heading that says it
          // does not.
          const refusal = await placementRefusal(program, row.subject_id);
          if (refusal === 'subjectClosed') {
            report.skipped_closed.push(row.subject_id);
            continue;
          }
          if (refusal) {
            report.skipped_unplaced.push(row.subject_id);
            continue;
          }

          const existing = await client.query(
            `SELECT id FROM semester_courses
              WHERE program_id = $1 AND subject_id = $2
                AND academic_year = $3 AND semester = $4`,
            [program, row.subject_id, to.academic_year, to.semester],
          );
          if (existing.rows[0]) {
            report.skipped_existing.push(row.subject_id);
            continue;
          }

          const made = await client.query(
            `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [program, row.subject_id, to.academic_year, to.semester],
          );
          const offeringId = made.rows[0].id;

          const sections = await client.query(
            `SELECT section_id, section_number FROM course_sections
              WHERE semester_course_id = $1 ORDER BY section_number ASC`,
            [row.id],
          );
          for (const section of sections.rows) {
            const copied = await client.query(
              `INSERT INTO course_sections (semester_course_id, section_number)
               VALUES ($1, $2) RETURNING section_id`,
              [offeringId, section.section_number],
            );
            report.sections += 1;

            const staff = await client.query(
              `SELECT cst.user_id FROM course_sections_teacher cst
                 JOIN users u ON u.user_id = cst.user_id
                WHERE cst.section_id = $1 AND u.status = 'active'
                ORDER BY cst.user_id ASC`,
              [section.section_id],
            );
            const gone = await client.query(
              `SELECT cst.user_id FROM course_sections_teacher cst
                 JOIN users u ON u.user_id = cst.user_id
                WHERE cst.section_id = $1 AND u.status <> 'active'`,
              [section.section_id],
            );
            for (const missing of gone.rows) {
              report.dropped_teachers.push({
                subject_id: row.subject_id,
                section_number: section.section_number,
                user_id: missing.user_id,
              });
            }

            await writeTeachers(client, copied.rows[0].section_id, staff.rows.map((s) => s.user_id));
          }

          report.created.push(await loadOffering(client, offeringId));
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        // Two presses at once. `skipped_existing` above is a read followed by a
        // write, so two requests can both find the target term empty and both
        // try to make it; the loser meets the unique index on
        // `(program_id, subject_id, academic_year, semester)`. The whole copy
        // rolls back either way, and the honest answer is the one the single
        // opening gives - this term already has it - rather than a 500 for
        // pressing a button twice, which this route's own premise says has to
        // be safe.
        if (isDuplicate(error)) {
          return res.status(409).json({ message: REFUSALS.duplicateOffering });
        }
        throw error;
      } finally {
        client.release();
      }

      return res.status(200).json(report);
    } catch (error) {
      return next(error);
    }
  });

  /** One Offering with its sections, for the detail view. */
  router.get('/offerings/:id', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const offering = await reachable(req, req.params.id);
      if (!offering) return res.status(404).json({ message: REFUSALS.offeringNotFound });
      return res
        .status(200)
        .json({ offering: { ...offering, sections: await loadSections(pool, offering.id) } });
    } catch (error) {
      return next(error);
    }
  });

  /** Opening a subject for a term — the first criterion. */
  router.post('/offerings', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const body = req.body ?? {};

      // The programme first, and 403. Answering the term or the placement ahead
      // of it would tell a caller who holds nothing here what a well-formed
      // request looks like and which subjects a curriculum contains.
      const notYours = await programRefusal(req, blankToNull(body.program_id));
      if (notYours && notYours !== 'invalidOffering') {
        return res.status(403).json({ message: REFUSALS[notYours] });
      }

      const draft = readOffering(body);
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const notPlaced = await placementRefusal(draft.values.program_id, draft.values.subject_id);
      if (notPlaced) return res.status(400).json({ message: REFUSALS[notPlaced] });

      const { rows } = await pool.query(
        `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          draft.values.program_id,
          draft.values.subject_id,
          draft.values.academic_year,
          draft.values.semester,
        ],
      );

      return res.status(201).json({ offering: await loadOffering(pool, rows[0].id) });
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: REFUSALS.duplicateOffering });
      return next(error);
    }
  });

  /**
   * Closing one — the eighth criterion's server half.
   *
   * The teaching assignments go with it: they are this screen's own doing and
   * mean nothing without the section. Everything else that points at a section
   * - an enrolment, a group, an activity, a mark - is somebody else's record,
   * and the database refuses through ON DELETE RESTRICT on the five tables that
   * hold them, so a sixth added later is covered on the day it is added.
   *
   * Asking the person to confirm first is the same criterion's other half and
   * is the screen's job: there is nothing for a server to confirm against, and
   * a request that arrived is a request that was meant.
   */
  router.delete('/offerings/:id', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const offering = await reachable(req, req.params.id);
      if (!offering) return res.status(404).json({ message: REFUSALS.offeringNotFound });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const owned = await client.query(
          `SELECT section_id FROM course_sections WHERE semester_course_id = $1`,
          [offering.id],
        );
        if (await hasSyllabus(client, owned.rows.map((row) => row.section_id))) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: REFUSALS.offeringInUse });
        }

        await client.query(
          `DELETE FROM course_sections_teacher
            WHERE section_id IN (SELECT section_id FROM course_sections
                                  WHERE semester_course_id = $1)`,
          [offering.id],
        );
        await client.query(`DELETE FROM course_sections WHERE semester_course_id = $1`, [
          offering.id,
        ]);
        await client.query(`DELETE FROM semester_courses WHERE id = $1`, [offering.id]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        if (isReferenced(error)) {
          return res.status(409).json({ message: REFUSALS.offeringInUse });
        }
        throw error;
      } finally {
        client.release();
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  /** Splitting an Offering into sections — the second criterion. */
  router.post('/offerings/:id/sections', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const offering = await reachable(req, req.params.id);
      if (!offering) return res.status(404).json({ message: REFUSALS.offeringNotFound });

      const number = readSectionNumber(req.body);
      if (!number) return res.status(400).json({ message: REFUSALS.invalidSection });

      const { rows } = await pool.query(
        `INSERT INTO course_sections (semester_course_id, section_number)
         VALUES ($1, $2) RETURNING section_id`,
        [offering.id, number],
      );

      return res
        .status(201)
        .json({ section: await loadSection(pool, offering.id, rows[0].section_id) });
    } catch (error) {
      // The third criterion, answered by the database: the constraint is
      // `(semester_course_id, section_number)`, so ตอนเรียน 1 exists once under
      // this Offering and freely under every other one.
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateSectionNumber });
      }
      return next(error);
    }
  });

  /** Renaming one. A section number is a label, and a mistyped label is fixed. */
  router.put('/offerings/:id/sections/:sectionId', requireRole(...COMMITTEE), async (req, res, next) => {
    try {
      const { offering, section } = await reachableSection(req, req.params.id, req.params.sectionId);
      if (!offering) return res.status(404).json({ message: REFUSALS.offeringNotFound });
      if (!section) return res.status(404).json({ message: REFUSALS.sectionNotFound });

      const number = readSectionNumber(req.body);
      if (!number) return res.status(400).json({ message: REFUSALS.invalidSection });

      await pool.query(
        `UPDATE course_sections SET section_number = $2, updated_at = now()
          WHERE section_id = $1`,
        [section.section_id, number],
      );

      return res
        .status(200)
        .json({ section: await loadSection(pool, offering.id, section.section_id) });
    } catch (error) {
      if (isDuplicate(error)) {
        return res.status(409).json({ message: REFUSALS.duplicateSectionNumber });
      }
      return next(error);
    }
  });

  /** Removing one, on the same terms as removing the Offering above it. */
  router.delete(
    '/offerings/:id/sections/:sectionId',
    requireRole(...COMMITTEE),
    async (req, res, next) => {
      try {
        const { offering, section } = await reachableSection(
          req,
          req.params.id,
          req.params.sectionId,
        );
        if (!offering) return res.status(404).json({ message: REFUSALS.offeringNotFound });
        if (!section) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          if (await hasSyllabus(client, [section.section_id])) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: REFUSALS.sectionInUse });
          }

          await client.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [
            section.section_id,
          ]);
          await client.query(`DELETE FROM course_sections WHERE section_id = $1`, [
            section.section_id,
          ]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          if (isReferenced(error)) {
            return res.status(409).json({ message: REFUSALS.sectionInUse });
          }
          throw error;
        } finally {
          client.release();
        }

        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Who teaches a section — the fourth and fifth criteria.
   *
   * A replacement rather than an addition: the fourth criterion asks that
   * teachers be *reassigned*, and a box that can only add cannot take somebody
   * off a class they no longer teach. An empty list is allowed and means
   * nobody yet, which is what an Offering looks like while the timetable is
   * still being argued about.
   *
   * Every code is checked before anything is written, so one bad code writes
   * nothing - a half-applied replacement would silently drop the people who
   * were already there.
   */
  router.put(
    '/offerings/:id/sections/:sectionId/teachers',
    requireRole(...COMMITTEE),
    async (req, res, next) => {
      try {
        const { offering, section } = await reachableSection(
          req,
          req.params.id,
          req.params.sectionId,
        );
        if (!offering) return res.status(404).json({ message: REFUSALS.offeringNotFound });
        if (!section) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const submitted = (req.body ?? {}).user_ids;
        if (!Array.isArray(submitted)) {
          return res.status(400).json({ message: REFUSALS.invalidSection });
        }
        const userIds = [...new Set(submitted.map((id) => blankToNull(id)).filter(Boolean))];

        const refusal = await teacherRefusal(userIds);
        if (refusal) return res.status(400).json({ message: REFUSALS[refusal] });

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await writeTeachers(client, section.section_id, userIds);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        return res
          .status(200)
          .json({ section: await loadSection(pool, offering.id, section.section_id) });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { offeringRoutes };
