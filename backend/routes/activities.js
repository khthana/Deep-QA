'use strict';

/**
 * Ticket #32: กิจกรรมการเรียนรู้ — the assessed work of one ตอนเรียน.
 *
 * *Two grains in one answer, and neither borrows the other's.* An Activity is
 * the Section's (`activities.section_id`, the same shape as #31's plan — two
 * ตอนเรียน of one Offering assess differently and are meant to), while the
 * หมวดคะแนน it is filed under is the Offering's (ADR-0003, #30 — every
 * Section of the Offering divides marks on one basis). So the read answers
 * `{ section, categories, activities }`: the categories are the scheme, in
 * the scheme's own order, and each Activity carries its `score_ratio_id` into
 * it. Grouping is the screen's; naming the groups is the server's, because a
 * screen that derived the groups from the Activities alone would silently
 * lose a category nobody has filed work under yet — which is exactly the
 * category a Teacher most needs to see.
 *
 * *The scheme is reached through the Section, not through a second register
 * join.* `sectionOf` has already answered "is this Section mine" (ADR-0002),
 * and a Section belongs to exactly one Offering, so the scheme query walks
 * `course_sections → semester_courses → subject_score_ratio` from the id that
 * was just authorised. Importing `offeringOf` as well would ask the teaching
 * register twice per request to learn something the first answer implies —
 * and would be a fourth caller for [#104](https://github.com/khthana/Deep-QA/issues/104)
 * to unpick.
 *
 * *Deleting is where this schema is at its most dangerous, in two opposite
 * directions.* `activity_scores.activity_id` is **CASCADE**: an unguarded
 * DELETE answers 204 and takes a cohort's marks with it, and nothing in the
 * database objects. `activity_evidence.activity_id` is **RESTRICT** and its
 * rows are soft-deleted rather than removed: the database does object, as a
 * 23503 that reaches the error handler as เกิดข้อผิดพลาดในระบบ — a system
 * fault, for something a person can fix — and it objects even to evidence
 * that has been "deleted" on the screen, because a foreign key does not read
 * `is_deleted`.
 *
 * Both guards therefore live *inside* the DELETE as `NOT EXISTS`, which is
 * where #31's review put its one guard and for a sharper version of the same
 * reason: between a SELECT that asks and a DELETE that acts there is a gap,
 * and here the gap is measured in a cohort's marks. It narrows that gap to a
 * statement rather than closing it — under READ COMMITTED the DELETE reads
 * the snapshot it starts with, so a score committed after that instant is
 * still cascaded away. Closing it outright wants a lock on the Activity, and
 * that is #34's business, where marks are entered and the two screens can be
 * made to agree about who holds what.
 *
 * When nothing is deleted the route asks why, and answers in the words of
 * whichever thing is holding the row — or ไม่พบ, if it simply went.
 *
 * ## The editor — #33
 *
 * Writing the work, and attributing it to the outcomes it assesses. The
 * attribution is the point of the ticket rather than a field on it: an
 * Activity with no CLO rows contributes to no outcome, so every attainment
 * figure #38 computes is downstream of what POST and PUT accept here.
 *
 * *Four ids in one body, and only two of them are this Section's.* The week is
 * the Section's (#31) and so is the Activity; the หมวดคะแนน and the CLOs are
 * the Offering's (ADR-0003, #30 and #27). Each is checked against **the same
 * list the screen was offered**, not against the foreign key — three of the
 * four keys would admit a foreign id (`activities.score_ratio_id` has no
 * composite key to constrain it at all, which migration 0003 says in as many
 * words), and checking against the offered list is what makes it impossible
 * for the picker and the validator to disagree.
 *
 * *A save replaces the CLO rows whole.* `activity_clo_mapping` has no natural
 * key on (activity_id, clo_id) — its unique key is the sequence — so "the same
 * CLO twice" is the service layer's to refuse, and nothing outside the table
 * references a mapping row's id. Delete-then-insert inside one transaction is
 * therefore both correct and the shape that makes a second save an update
 * rather than a second Activity.
 *
 * *Removing a marked CLO is refused, and that guard is not in the schema.*
 * `activity_scores` carries (student_id, activity_id, clo_id) against
 * `subject_clo` rather than against the mapping rows, so dropping a row a
 * cohort has been marked under leaves those marks attributed to an outcome
 * this Activity no longer assesses — silently, exactly like #32's CASCADE.
 *
 * That guard stops at *removal*, and deliberately. Changing the full mark or a
 * row's weight moves the base those same marks were entered against, just as
 * quietly, and what should happen then — refuse, refuse only where a recorded
 * mark would be invalidated, or rescale — is a decision about marks rather
 * than about attribution. It belongs with #34, and is
 * [#108](https://github.com/khthana/Deep-QA/issues/108).
 *
 * *What is deliberately not enforced is a total of exactly 100.* BR-11 reads
 * two ways in the sources (docs/01 has it as one CLO per row, docs/02 as a
 * sum) and #33's criteria ask for neither, so the rule kept is the one that
 * cannot be argued with: a share of the mark cannot exceed the whole. Less
 * than the whole is a half-finished attribution, and refusing to save one
 * would send a person away from the screen with their work in their head.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, boundedInteger, integerId, round2 } = require('../lib/fields');
const { sectionOf } = require('./enrolment');

/** The one role these routes open for, as in enrolment.js and teachingPlan.js. */
const TEACHING = ['TEACHER'];

/**
 * What an Activity is on the wire, written once and spelled two ways.
 *
 * The list LEFT JOINs the scheme and both tables carry a `score_ratio_id`, so
 * the read has to qualify with the alias; `INSERT ... RETURNING` has no alias
 * to qualify with. Two hand-kept lists would drift the first time a column was
 * added, which is the whole reason this one is a list.
 */
const FIELDS = [
  'id',
  'score_ratio_id',
  'course_syllabus_id',
  'activity_name',
  'activity_type',
  'score_number',
  'announcement_date',
  'deadline_date',
];
const RETURNED = FIELDS.map((field) => `a.${field}`).join(', ');
const RETURNED_UNQUALIFIED = FIELDS.join(', ');

/**
 * The attribution rows, as both readers of them want them: the row itself, and
 * the CLO's number and text, which is what a screen draws and a person reads.
 *
 * `subject_clo` is joined LEFT because `activity_clo_mapping.clo_id` is
 * nullable with ON DELETE RESTRICT — a row whose CLO went is not a row this
 * query may drop. Written once and given a WHERE by each caller below, so the
 * list and the single Activity can never come to disagree about what an
 * attribution row is.
 */
const CLO_ROWS = `SELECT m.activity_id, m.id, m.clo_id, m.weight, m.score,
              c.clo_number, c.clo_detail
         FROM activity_clo_mapping m
         JOIN activities a ON a.id = m.activity_id
         LEFT JOIN subject_clo c ON c.clo_id = m.clo_id`;

/** Sequence is the mapping's own key, so it is the order rows come back in. */
const CLO_ROWS_ORDER = 'ORDER BY m.activity_id ASC, m.sequence_order ASC';

/** The two values the column's CHECK allows, refused here rather than as 23514. */
const TYPES = ['individual', 'group'];

/** numeric(5,2) holds this and no more; 22003 is not a sentence for a person. */
const MAX_MARK = 999.99;

/**
 * A full mark as a person writes it: a number from zero up to what the column
 * holds. A JSON number and a typed string both arrive here. More than two
 * decimals is rounded rather than refused, because that is what the column
 * would do anyway and nobody typing 12.345 means anything but 12.35.
 */
function readMark(value) {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(number) || number < 0 || number > MAX_MARK) return null;
  return round2(number);
}

/**
 * A date, or the nothing that means the Teacher has not set one.
 *
 * A calendar date is what the screen sends (`2026-08-03`); a full timestamp is
 * accepted because a caller that already holds one should not have to trim it.
 * Anything else is refused here rather than reaching the column as 22007.
 */
function readDate(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false };
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(text) || Number.isNaN(Date.parse(text))) {
    return { ok: false };
  }
  return { ok: true, value: text };
}

/**
 * An id the caller is allowed to leave out, in `readDate`'s two-part shape.
 *
 * Absent, null and the empty string a `<select>` sends for its blank option
 * are the three ways of saying "none"; everything else is a claim about a
 * record, `0` included. A claim that is not an id at all gets the same answer
 * as a claim about somebody else's record — read through truthiness instead,
 * and `0` would be filed as "no week chosen" and answered 201.
 */
function readOptionalId(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const id = integerId(value);
  return id === null ? { ok: false, value: null } : { ok: true, value: id };
}

/** A weight is a percentage of this Activity's mark: a whole number of them. */
const readWeight = (value) => boundedInteger(value, { min: 0, max: 100 });

/** The attribution, one row per CLO. Absent and empty both mean "attributed to none". */
function readCloRows(value) {
  if (value === undefined || value === null) return { ok: true, rows: [] };
  if (!Array.isArray(value)) return { ok: false };

  const rows = [];
  for (const row of value) {
    const cloId = integerId(row?.clo_id);
    const weight = readWeight(row?.weight);
    if (cloId === null || weight === null) return { ok: false };
    rows.push({ clo_id: cloId, weight });
  }
  return { ok: true, rows };
}

/**
 * One Activity as the caller owns it.
 *
 * The name, the type and the mark are the row — work with no name is not a
 * piece of work — and everything else may be absent: a category is chosen
 * later (#32's screen draws an Activity that has none), a week may not apply,
 * and dates are often set after the work is written.
 */
function readActivity(body) {
  const announcement = readDate(body?.announcement_date);
  const deadline = readDate(body?.deadline_date);
  const cloRows = readCloRows(body?.clo_rows);
  const week = readOptionalId(body?.course_syllabus_id);
  const category = readOptionalId(body?.score_ratio_id);

  const values = {
    activity_name: blankToNull(body?.activity_name),
    activity_type: TYPES.includes(body?.activity_type) ? body.activity_type : null,
    score_number: readMark(body?.score_number),
    announcement_date: announcement.value ?? null,
    deadline_date: deadline.value ?? null,
    course_syllabus_id: week.value,
    score_ratio_id: category.value,
    clo_rows: cloRows.rows ?? [],
  };

  if (!cloRows.ok) return { ok: false, reason: 'invalidActivityClo' };
  if (
    !values.activity_name ||
    values.activity_name.length > 255 ||
    !values.activity_type ||
    values.score_number === null ||
    !announcement.ok ||
    !deadline.ok
  ) {
    return { ok: false, reason: 'invalidActivity' };
  }
  // An id that is not an id at all is the same answer as an id belonging to
  // somebody else, and that answer is the one the picker's own list gives.
  if (!week.ok) return { ok: false, reason: 'weekNotFound' };
  if (!category.ok) return { ok: false, reason: 'weightNotFound' };
  return { ok: true, values };
}

function activityRoutes(pool) {
  const router = express.Router();

  const notThisSection = (res) => res.status(404).json({ message: REFUSALS.sectionNotFound });
  const notThisActivity = (res) => res.status(404).json({ message: REFUSALS.activityNotFound });

  /**
   * The Offering's หมวดคะแนน, reached from the Section that was authorised.
   * Ordered as #30 orders them, so the screen's groups read down the page in
   * the order the scheme was written rather than in id order.
   */
  async function schemeOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT r.score_ratio_id, r.score_category, r.sequence_order, r.weight
         FROM subject_score_ratio r
         JOIN semester_courses sc ON sc.program_id = r.program_id
                                 AND sc.subject_id = r.subject_id
                                 AND sc.academic_year = r.academic_year
         JOIN course_sections cs ON cs.semester_course_id = sc.id
        WHERE cs.section_id = $1
        ORDER BY r.sequence_order ASC, r.score_ratio_id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * This Section's Activities, grouped-ready: the scheme's order first, then
   * the order they were made. Activities filed under no category sort last —
   * `score_ratio_id` is nullable, and a row with no category is still the
   * Teacher's work and may not be dropped from the list.
   */
  async function listOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT ${RETURNED} FROM activities a
         LEFT JOIN subject_score_ratio r ON r.score_ratio_id = a.score_ratio_id
        WHERE a.section_id = $1
        ORDER BY r.sequence_order ASC NULLS LAST, a.id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * The Offering's CLOs, reached from the Section by the walk `schemeOf`
   * makes — #27 holds the same set at the same grain and reaches it through
   * `offeringOf`, which this file deliberately does not import (see the note
   * on the scheme, and #104).
   *
   * This is the list the editor's picker is filled from *and* the list a
   * saved row is checked against, which is what makes it impossible for the
   * two to disagree about what "a CLO of this รายวิชา and this year" means.
   */
  async function cloOptionsOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT c.clo_id, c.clo_number, c.clo_detail
         FROM subject_clo c
         JOIN semester_courses sc ON sc.program_id = c.program_id
                                 AND sc.subject_id = c.subject_id
                                 AND sc.academic_year = c.academic_year
         JOIN course_sections cs ON cs.semester_course_id = sc.id
        WHERE cs.section_id = $1
        ORDER BY c.clo_number ASC, c.clo_id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * This Section's teaching-plan weeks, as the week picker offers them: #31's
   * grain, unchanged, and only what the picker draws.
   */
  async function weeksOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT id, week_no, title FROM course_syllabus
        WHERE section_id = $1
        ORDER BY week_no ASC, id ASC`,
      [sectionId],
    );
    return rows;
  }

  /**
   * Every attribution row of this Section's Activities, in one query rather
   * than one per Activity: the editor opens on a row the list already holds,
   * so the sixth criterion — editing loads the current rows — is answered by
   * the list itself carrying them.
   */
  async function cloRowsOfSection(sectionId) {
    const { rows } = await pool.query(`${CLO_ROWS} WHERE a.section_id = $1 ${CLO_ROWS_ORDER}`, [
      sectionId,
    ]);
    return rows;
  }

  /** The same rows for one Activity, which is what a save answers with. */
  async function cloRowsOfActivity(activityId) {
    const { rows } = await pool.query(`${CLO_ROWS} WHERE m.activity_id = $1 ${CLO_ROWS_ORDER}`, [
      activityId,
    ]);
    return rows;
  }

  /** The activities of a Section, each carrying the rows that attribute it. */
  async function attributed(sectionId) {
    const [activities, rows] = await Promise.all([
      listOf(sectionId),
      cloRowsOfSection(sectionId),
    ]);
    const byActivity = new Map();
    for (const row of rows) {
      if (!byActivity.has(row.activity_id)) byActivity.set(row.activity_id, []);
      byActivity.get(row.activity_id).push(row);
    }
    return activities.map((activity) => ({
      ...activity,
      clo_rows: byActivity.get(activity.id) ?? [],
    }));
  }

  /**
   * This Activity of this Section, or nothing. `id AND section_id` always —
   * #28's pairing rule: without the second half, the sibling Section's
   * Activity id through this address would be somebody else's work deleted
   * from here.
   */
  async function activityOf(sectionId, activityId) {
    const id = integerId(activityId);
    if (id === null) return null;
    const { rows } = await pool.query(
      `SELECT id, activity_name FROM activities WHERE id = $1 AND section_id = $2`,
      [id, sectionId],
    );
    return rows[0] ?? null;
  }

  router.get(
    '/teaching/sections/:sectionId/activities',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        // Everything both halves of the screen need in one request, as #27's
        // read does: the list draws the categories, and the editor over it
        // draws all three pickers from the same three lists.
        const [categories, clos, weeks, activities] = await Promise.all([
          schemeOf(section.section_id),
          cloOptionsOf(section.section_id),
          weeksOf(section.section_id),
          attributed(section.section_id),
        ]);
        res.json({ section, categories, clos, weeks, activities });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Which of the body's four ids, if any, belongs to somebody else's grain —
   * and then whether the attribution itself holds together.
   *
   * Asked of the same lists the pickers were filled from rather than of the
   * foreign keys, for the reason in this file's header. The order is the order
   * a person would fix things in: the Activity's own two fields first, then
   * the rows, and within the rows the CLO before the arithmetic, so that a row
   * naming a CLO that is not on offer is told that rather than told about a
   * total it cannot make sense of.
   *
   * Asked outside the transaction the save then opens, which leaves the same
   * gap as the DELETE guards above and a far smaller one: a category or a CLO
   * removed between the question and the write costs a row pointing at a set
   * it is no longer in, not a cohort's marks. Closing it wants the four option
   * queries on the save's own client, which is a shape worth having when
   * something else needs it too.
   */
  async function refuseSave(sectionId, values) {
    if (values.score_ratio_id !== null) {
      const scheme = await schemeOf(sectionId);
      if (!scheme.some((one) => one.score_ratio_id === values.score_ratio_id)) {
        return REFUSALS.weightNotFound;
      }
    }
    if (values.course_syllabus_id !== null) {
      const weeks = await weeksOf(sectionId);
      if (!weeks.some((one) => one.id === values.course_syllabus_id)) return REFUSALS.weekNotFound;
    }

    if (values.clo_rows.length === 0) return null;
    // `activity_clo_mapping.score_ratio_id` is NOT NULL: the category is where
    // the attributed marks are counted, so there is nowhere to put a row
    // without one. An Activity with no rows may still have no category.
    if (values.score_ratio_id === null) return REFUSALS.activityCloNeedsCategory;

    const offered = new Map((await cloOptionsOf(sectionId)).map((one) => [one.clo_id, one]));
    const seen = new Set();
    let total = 0;
    for (const row of values.clo_rows) {
      const clo = offered.get(row.clo_id);
      if (!clo) return REFUSALS.cloNotFound;
      if (seen.has(row.clo_id)) return REFUSALS.duplicateActivityClo(clo.clo_number);
      seen.add(row.clo_id);
      total += row.weight;
    }
    if (total > 100) return REFUSALS.activityCloWeights(total);
    return null;
  }

  /**
   * A CLO this Activity has marks under that the save does not keep, if there
   * is one — the guard the schema does not have.
   *
   * Ordered by CLO number so that a save dropping several is refused about the
   * first of them every time; a refusal that named a different row on each
   * press would read as though the screen were guessing.
   */
  async function markedCloLeaving(activityId, keeping) {
    const { rows } = await pool.query(
      `SELECT c.clo_number
         FROM activity_scores s
         JOIN subject_clo c ON c.clo_id = s.clo_id
        WHERE s.activity_id = $1 AND NOT (s.clo_id = ANY($2::int[]))
        GROUP BY c.clo_number
        ORDER BY c.clo_number ASC
        LIMIT 1`,
      [activityId, keeping],
    );
    return rows[0] ?? null;
  }

  /**
   * The write, whole: the Activity and the rows that attribute it, in one
   * transaction, with the rows replaced rather than reconciled.
   *
   * Replacing is safe here and is not in #30: nothing outside the table
   * references a mapping row's id, while a หมวดคะแนน's id is what every
   * Activity points at. The mark each CLO accounts for is computed in the
   * database from the weight, so the share and the full mark can never drift
   * apart by a rounding step taken in another language.
   */
  async function save(section, values, existingId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [
        values.score_ratio_id,
        values.course_syllabus_id,
        values.activity_type,
        values.activity_name,
        values.score_number,
        values.announcement_date,
        values.deadline_date,
      ];

      const { rows } = existingId
        ? await client.query(
            `UPDATE activities
                SET score_ratio_id = $3, course_syllabus_id = $4, activity_type = $5,
                    activity_name = $6, score_number = $7, announcement_date = $8,
                    deadline_date = $9, updated_at = now()
              WHERE id = $1 AND section_id = $2
              RETURNING ${RETURNED_UNQUALIFIED}`,
            [existingId, section.section_id, ...fields],
          )
        : await client.query(
            `INSERT INTO activities (
               section_id, score_ratio_id, course_syllabus_id, activity_type,
               activity_name, score_number, announcement_date, deadline_date
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING ${RETURNED_UNQUALIFIED}`,
            [section.section_id, ...fields],
          );

      const activity = rows[0];
      if (!activity) {
        await client.query('ROLLBACK');
        return null;
      }

      await client.query('DELETE FROM activity_clo_mapping WHERE activity_id = $1', [activity.id]);
      for (const [index, row] of values.clo_rows.entries()) {
        await client.query(
          `INSERT INTO activity_clo_mapping (
             activity_id, sequence_order, clo_id, weight, score_ratio_id, score
           )
           VALUES ($1, $2, $3, $4, $5, ROUND($6::numeric * $7::numeric / 100, 2))`,
          [
            activity.id,
            index + 1,
            row.clo_id,
            row.weight,
            values.score_ratio_id,
            values.score_number,
            row.weight,
          ],
        );
      }

      await client.query('COMMIT');
      return activity;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** What a save answers with: the row as written, and the rows that attribute it. */
  const withCloRows = async (activity) => ({
    ...activity,
    clo_rows: await cloRowsOfActivity(activity.id),
  });

  router.post(
    '/teaching/sections/:sectionId/activities',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const read = readActivity(req.body ?? {});
        if (!read.ok) return res.status(400).json({ message: REFUSALS[read.reason] });

        const refusal = await refuseSave(section.section_id, read.values);
        if (refusal) return res.status(400).json({ message: refusal });

        const created = await save(section, read.values, null);
        return res.status(201).json({ activity: await withCloRows(created) });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.put(
    '/teaching/sections/:sectionId/activities/:activityId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const read = readActivity(req.body ?? {});
        if (!read.ok) return res.status(400).json({ message: REFUSALS[read.reason] });

        const activity = await activityOf(section.section_id, req.params.activityId);
        if (!activity) return notThisActivity(res);

        const refusal = await refuseSave(section.section_id, read.values);
        if (refusal) return res.status(400).json({ message: refusal });

        const leaving = await markedCloLeaving(
          activity.id,
          read.values.clo_rows.map((row) => row.clo_id),
        );
        if (leaving) {
          return res.status(400).json({ message: REFUSALS.activityCloHasMarks(leaving.clo_number) });
        }

        // The pairing is in the UPDATE's own WHERE as well as in `activityOf`,
        // #31's shape: a row a colleague deleted between the two is the empty
        // RETURNING, and answering ไม่พบ is what a second press would get.
        const saved = await save(section, read.values, activity.id);
        if (!saved) return notThisActivity(res);
        return res.json({ activity: await withCloRows(saved) });
      } catch (error) {
        return next(error);
      }
    },
  );

  router.delete(
    '/teaching/sections/:sectionId/activities/:activityId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const activity = await activityOf(section.section_id, req.params.activityId);
        if (!activity) return notThisActivity(res);

        // Both guards in the statement that acts on them. `NOT EXISTS` over
        // `activity_evidence` is deliberately blind to `is_deleted`: the
        // foreign key is, so a guard that were not would hand the person a
        // 23503 dressed as a system fault.
        const { rowCount } = await pool.query(
          `DELETE FROM activities
            WHERE id = $1 AND section_id = $2
              AND NOT EXISTS (SELECT 1 FROM activity_scores s WHERE s.activity_id = $1)
              AND NOT EXISTS (SELECT 1 FROM activity_evidence e WHERE e.activity_id = $1)`,
          [activity.id, section.section_id],
        );
        if (rowCount) return res.status(204).end();

        const refusal = await whyNot(activity.id);
        return res.status(refusal.status).json({ message: refusal.message });
      } catch (error) {
        next(error);
      }
    },
  );

  /**
   * Why nothing was deleted, asked only once it is known that nothing was.
   *
   * Marks first: they are the loss the CASCADE would have made silent, and an
   * Activity that has both is refused for the more serious of the two. The
   * evidence sentence names a file because the ticket asks for the evidence
   * to be named, and counts the rest because soft-deleted evidence still
   * pins the Activity while showing up nowhere on a screen.
   *
   * The status travels with the sentence because the last case is not a
   * refusal at all: a row that vanished under our hands is ไม่พบ, and 404 is
   * what a second press of the same button would have got.
   */
  async function whyNot(activityId) {
    const { rows: marked } = await pool.query(
      'SELECT count(*)::int AS marks FROM activity_scores WHERE activity_id = $1',
      [activityId],
    );
    if (marked[0].marks > 0) {
      return { status: 400, message: REFUSALS.activityHasMarks(marked[0].marks) };
    }

    // The file named is the one uploaded first, not the alphabetically first:
    // the sentence is helping somebody find the evidence they attached, and
    // "the first one" is a thing they remember doing.
    const { rows: evidence } = await pool.query(
      `SELECT count(*)::int AS files,
              (SELECT file_name FROM activity_evidence
                WHERE activity_id = $1
                ORDER BY uploaded_at ASC, evidence_id ASC LIMIT 1) AS first_file
         FROM activity_evidence WHERE activity_id = $1`,
      [activityId],
    );
    if (evidence[0].files > 0) {
      return {
        status: 400,
        message: REFUSALS.activityHasEvidence(evidence[0].first_file, evidence[0].files),
      };
    }

    return { status: 404, message: REFUSALS.activityNotFound };
  }

  return router;
}

module.exports = { activityRoutes };
