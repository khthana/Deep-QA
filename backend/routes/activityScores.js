'use strict';

/**
 * คะแนนกิจกรรมการเรียนรู้ — #34.
 *
 * A teacher records what each student scored on one Activity. The screen has
 * two toggles over the grid, and neither of them is a storage decision.
 *
 * ## `clo_id` is NOT NULL, so there is only ever one kind of stored mark
 *
 * Migration 0003 says at length why `activity_scores` keys on
 * (student_id, activity_id, clo_id) with no nullable column in it: the upsert
 * that makes re-saving a correction rather than an accumulation needs a unique
 * constraint on exactly those three, and a nullable member of a unique
 * constraint is not unique. The consequence lands here. There is no such thing
 * as a mark against an Activity; there are only marks against its outcomes.
 *
 * So the per-CLO toggle is about *typing*, not about storage. `mode: 'clo'`
 * takes one number per attribution row. `mode: 'activity'` takes one number and
 * this file divides it across the rows by their weights — and reads it back by
 * adding them up again, which is why the division has to be exact rather than
 * merely close. A teacher who typed 61 and read back 60.99 would be right to
 * distrust the screen.
 *
 * The remainder therefore goes on the first row rather than being left to
 * rounding. Three outcomes at 34/33/33 of 61 marks round to 20.74/20.13/20.13,
 * which is 61.00 exactly; at other weights it is not, and the first row absorbs
 * the hundredth. That is arbitrary between the rows and exact in the total,
 * which is the trade this screen wants: nobody reads one CLO's share of a mark
 * typed for the whole Activity, and everybody reads the total.
 *
 * ## The group toggle is one table over, and does not remember itself
 *
 * A group's mark is written to every member, and nothing records that it
 * arrived as one number, because the mark belongs to the student. #26 owns who
 * is in a group; this file only reads it, and a student moved to another group
 * afterwards keeps the mark they were given — which is correct, and would not
 * be if the mark were stored against the group.
 *
 * The toggle is offered on every Activity and merely *defaults* from
 * `activity_type`. The type is what the work was; how a teacher chooses to
 * enter marks for it is theirs, and a group project marked individually is an
 * ordinary thing.
 *
 * ## Why the file is always a list of students
 *
 * The ticket asks the import to be checked for the student count, the student
 * codes, the names and the CLO columns before anything is applied. All four
 * are about students, so the file is a roll and the per-CLO toggle changes its
 * columns, not its rows. Group entry stays a way of typing on the screen.
 *
 * ## Everything is judged before anything is written
 *
 * A save is one list, and a refusal anywhere in it writes none of it. That is
 * the same promise the import makes and it is made for the same reason: a
 * teacher correcting a whole class needs to know that a refused save left the
 * record where it was, rather than half-applied at a row they cannot identify.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { parseTable } = require('../lib/csv');
const { blankToNull, integerId } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { sectionOf, notThisSection } = require('./enrolment');

/** A ผู้สอน's own ตอนเรียน, as in `enrolment.js`, `activities.js` and `workGroups.js`. */
const TEACHING = ['TEACHER'];

/** The two identifying columns every marks file carries, whichever toggle wrote it. */
const WHO_COLUMNS = ['student_id', 'full_name_th'];

/** The single mark column of a file written with the per-CLO toggle off. */
const WHOLE_MARK_COLUMN = 'score';

/** Marks are `numeric(5,2)`; two decimals is what the column keeps. */
const round2 = (value) => Math.round(value * 100) / 100;

/**
 * A mark as a person writes it: blank means *not marked yet* and is a null,
 * which is a different thing from nought and is what the column already holds
 * for work nobody has looked at.
 */
function readMark(value) {
  if (value === null || value === undefined) return { ok: true, score: null };
  if (typeof value === 'string' && value.trim() === '') return { ok: true, score: null };
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(number) || number < 0) return { ok: false };
  return { ok: true, score: round2(number) };
}

/**
 * One typed mark divided across the Activity's outcomes.
 *
 * By weight rather than by each row's `score`, because the weights are the
 * declared division and the scores are that division already rounded — dividing
 * by a rounded number twice is how a total drifts. `total` is the weights' own
 * sum rather than a hundred: BR-11 caps them at a hundred and does not oblige
 * them to reach it, and a mark divided by a denominator larger than the weights
 * would quietly lose marks.
 */
function divide(score, rows) {
  if (score === null) return rows.map((row) => ({ row, score: null }));
  const total = rows.reduce((sum, row) => sum + Number(row.weight), 0);
  const shares = rows.map((row) =>
    total > 0 ? round2((score * Number(row.weight)) / total) : round2(score / rows.length),
  );
  const drift = round2(score - shares.reduce((sum, share) => sum + share, 0));
  shares[0] = round2(shares[0] + drift);
  return rows.map((row, index) => ({ row, score: shares[index] }));
}

/**
 * One person's per-CLO marks, in whichever shape they were typed, measured
 * against their ceilings before anything is written.
 *
 * The screen and the file ask the same question and differ only in where a
 * cell comes from — an object keyed by clo_id, or a column named for a CLO
 * number — so `cellOf` is the whole of the difference between them. It was two
 * copies until a review pointed out that the ceilings they enforce had drifted
 * apart.
 *
 * Only the per-CLO ceiling is checked here, and the Activity's full mark is
 * not — not because it does not apply, but because it cannot be reached past
 * these. Each share is capped at `activity_clo_mapping.score`, which #33
 * computes as the full mark times the weight, so their sum is the full mark
 * exactly wherever the weights reach a hundred and below it wherever BR-11
 * lets them fall short. A second check against the sum would fire only on the
 * hundredth of a mark that rounding leaves behind when the full mark is not a
 * whole number — refusing a teacher who typed each cell's own stated ceiling,
 * which is the one entry nobody should have to argue with.
 *
 * Refusals come back as data rather than as a response, because one caller
 * owes a status and the other owes a line number.
 */
function readShares(cloRows, cellOf) {
  const shares = [];
  for (const row of cloRows) {
    const read = readMark(cellOf(row));
    if (!read.ok) return { ok: false, reason: 'invalidMark' };
    if (read.score !== null && read.score > Number(row.score)) {
      return { ok: false, message: REFUSALS.markOverClo(row.clo_number, Number(row.score)) };
    }
    shares.push({ row, score: read.score });
  }
  return { ok: true, shares };
}

/** The same, for a mark typed against the Activity rather than against its outcomes. */
function readWhole(activity, cloRows, cell) {
  const read = readMark(cell);
  if (!read.ok) return { ok: false, reason: 'invalidMark' };
  if (read.score !== null && read.score > Number(activity.score_number)) {
    return { ok: false, message: REFUSALS.markOverActivity(Number(activity.score_number)) };
  }
  return { ok: true, shares: divide(read.score, cloRows) };
}

/** A refusal with the status it answers with, so a caller can hand it back whole. */
const refusedWith = (status, message) => ({ status, body: { message } });

function activityScoreRoutes(pool) {
  const router = express.Router();

  const notThisActivity = (res) => res.status(404).json({ message: REFUSALS.activityNotFound });

  /**
   * This Activity of this Section, or nothing — #28's pairing rule, which
   * `activities.js` states: without the second half of the WHERE, the sibling
   * Section's Activity id through this address would be somebody else's marks.
   */
  async function activityOf(sectionId, activityId) {
    const id = integerId(activityId);
    if (id === null) return null;
    const { rows } = await pool.query(
      `SELECT id, activity_name, activity_type, score_number
         FROM activities WHERE id = $1 AND section_id = $2`,
      [id, sectionId],
    );
    return rows[0] ?? null;
  }

  /**
   * The rows a mark may be written against, in the order the editor wrote
   * them. A row whose CLO has gone is dropped rather than carried: `clo_id` is
   * nullable there and NOT NULL here, so it is not a row this screen can put a
   * number on.
   */
  async function cloRowsOf(activityId) {
    const { rows } = await pool.query(
      `SELECT m.id, m.clo_id, m.weight, m.score, c.clo_number, c.clo_detail
         FROM activity_clo_mapping m
         JOIN subject_clo c ON c.clo_id = m.clo_id
        WHERE m.activity_id = $1
        ORDER BY m.sequence_order ASC, m.id ASC`,
      [activityId],
    );
    return rows;
  }

  /**
   * The roll, each student carrying the group they are in — one query, because
   * the screen draws both toggles over the same list and a second read could
   * disagree with the first about who is enrolled.
   */
  async function rollOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT sc.student_id, s.full_name_th, g.group_id, g.group_name
         FROM student_course sc
         JOIN student s ON s.student_id = sc.student_id
         LEFT JOIN student_group_member m ON m.student_id = sc.student_id
         LEFT JOIN student_group g ON g.group_id = m.group_id AND g.section_id = sc.section_id
        WHERE sc.section_id = $1
        ORDER BY sc.student_id ASC`,
      [sectionId],
    );
    return rows;
  }

  /** This Section's groups with their members — #26's shape, read only. */
  async function groupsOf(sectionId) {
    const { rows } = await pool.query(
      `SELECT g.group_id, g.group_name,
              coalesce(array_agg(m.student_id ORDER BY m.student_id)
                       FILTER (WHERE m.student_id IS NOT NULL), '{}') AS members
         FROM student_group g
         LEFT JOIN student_group_member m ON m.group_id = g.group_id
        WHERE g.section_id = $1
        GROUP BY g.group_id, g.group_name
        ORDER BY g.group_name ASC, g.group_id ASC`,
      [sectionId],
    );
    return rows;
  }

  /** Every mark on this Activity, which is what the grid is filled from. */
  async function marksOf(activityId) {
    const { rows } = await pool.query(
      `SELECT student_id, clo_id, score FROM activity_scores
        WHERE activity_id = $1 ORDER BY student_id ASC, clo_id ASC`,
      [activityId],
    );
    return rows;
  }

  /**
   * The whole screen in one answer: what is being marked, what it may be marked
   * against, who is to be marked, how they are grouped, and what is recorded.
   */
  async function screenOf(sectionId, activity) {
    const [clo_rows, students, groups, marks] = await Promise.all([
      cloRowsOf(activity.id),
      rollOf(sectionId),
      groupsOf(sectionId),
      marksOf(activity.id),
    ]);
    return { activity, clo_rows, students, groups, marks };
  }

  /**
   * Resolve the Section and the Activity, or answer for whichever was wrong.
   *
   * Every route below opens this way, and the order matters: a Section that is
   * not this account's is refused before an Activity id is looked at, so the
   * address bar cannot be used to learn which Activity ids exist.
   */
  async function reached(req, res, work) {
    const section = await sectionOf(pool, req, req.params.sectionId);
    if (!section) return notThisSection(res);
    const activity = await activityOf(section.section_id, req.params.activityId);
    if (!activity) return notThisActivity(res);
    return work(section, activity);
  }

  router.get(
    '/teaching/sections/:sectionId/activities/:activityId/scores',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        return await reached(req, res, async (section, activity) =>
          res.status(200).json(await screenOf(section.section_id, activity)),
        );
      } catch (error) {
        return next(error);
      }
    },
  );

  /** The outcome numbers of an Activity, as a sentence names them. */
  const cloNumbersOf = (cloRows) => cloRows.map((row) => row.clo_number).join(', ');

  /**
   * Turn what arrived into per-student, per-CLO numbers, or refuse.
   *
   * Everything is decided here and nothing is written, which is what lets one
   * bad cell refuse a whole class's save without a transaction to unwind. The
   * refusals are the ticket's own: the ceiling of a whole Activity, the ceiling
   * of one outcome's share of it, a student who is not in this ตอนเรียน, and a
   * group that is not this ตอนเรียน's.
   */
  async function plan(sectionId, activity, cloRows, body) {
    const mode = body?.mode === 'clo' ? 'clo' : 'activity';
    const entry = body?.entry === 'group' ? 'group' : 'student';
    const marks = Array.isArray(body?.marks) ? body.marks : null;
    if (!marks) return { refusal: refusedWith(400, REFUSALS.invalidMark) };

    const roll = await rollOf(sectionId);
    const enrolled = new Map(roll.map((student) => [student.student_id, student]));
    const groups = entry === 'group' ? await groupsOf(sectionId) : [];
    const byGroup = new Map(groups.map((group) => [group.group_id, group]));

    const byClo = new Map(cloRows.map((row) => [String(row.clo_id), row]));
    const writes = [];

    for (const entryRow of marks) {
      // Who this row is about: one student, or everybody in one group. The
      // group is looked up in this Section's own list, so a group id from the
      // Section next door is ไม่พบ rather than a set of marks written to
      // students this teacher does not teach.
      let students;
      if (entry === 'group') {
        const group = byGroup.get(Number(entryRow?.group_id));
        if (!group) return { refusal: refusedWith(404, REFUSALS.groupNotFound) };
        students = group.members;
      } else {
        const studentId = blankToNull(entryRow?.student_id);
        if (!studentId || !enrolled.has(studentId)) {
          return {
            refusal: refusedWith(400, REFUSALS.markStudentNotEnrolled(studentId ?? '—')),
          };
        }
        students = [studentId];
      }

      // What they scored, in the shape the toggle put it in.
      let read;
      if (mode === 'clo') {
        const typed = entryRow?.scores ?? {};
        // A row naming an outcome this Activity does not assess is the grid
        // and the Activity disagreeing about what is being marked, not a typo
        // in a number. Asked before the marks are read, so the answer is about
        // the column that should not be there rather than about its contents.
        for (const key of Object.keys(typed)) {
          if (!byClo.has(String(key))) {
            return {
              refusal: refusedWith(400, REFUSALS.markCloNotInActivity(cloNumbersOf(cloRows))),
            };
          }
        }
        read = readShares(cloRows, (row) => typed[row.clo_id] ?? typed[String(row.clo_id)]);
      } else {
        read = readWhole(activity, cloRows, entryRow?.score);
      }
      if (!read.ok) {
        return { refusal: refusedWith(400, read.message ?? REFUSALS.invalidMark) };
      }
      const { shares } = read;

      for (const studentId of students) {
        for (const share of shares) {
          writes.push({ studentId, cloId: share.row.clo_id, score: share.score });
        }
      }
    }

    return { writes };
  }

  /**
   * Write the planned marks, correcting rather than accumulating.
   *
   * `ON CONFLICT (student_id, activity_id, clo_id) DO UPDATE` is the fourth
   * criterion in one line, and it is available because 0003 put the unique
   * constraint on exactly those three columns and made none of them nullable.
   *
   * One statement rather than one per mark, because the unit a person presses
   * is a whole class: fifty-seven students over nine outcomes is five hundred
   * round trips inside a single transaction if each mark is its own statement.
   *
   * The marks are keyed by the same triple the constraint uses before they go,
   * because `ON CONFLICT DO UPDATE` refuses a statement that would touch one
   * row twice — the loop this replaced would simply have applied the second
   * one. Keeping the last is what it did, so keeping the last is what this
   * does; nothing in the two callers can produce a duplicate today, and the
   * two of them disagreeing about that is not worth a 500.
   */
  async function record(client, activityId, writes) {
    const latest = new Map();
    for (const write of writes) latest.set(`${write.studentId}:${write.cloId}`, write);
    const marks = [...latest.values()];

    // Postgres takes 65535 parameters in one statement; at four apiece this is
    // far under it for any ตอนเรียน, and chunked so that it stays under it for
    // one nobody has imagined yet.
    for (let from = 0; from < marks.length; from += 500) {
      const batch = marks.slice(from, from + 500);
      const tuples = batch
        .map((_, index) => `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`)
        .join(', ');
      await client.query(
        `INSERT INTO activity_scores (student_id, activity_id, clo_id, score)
              VALUES ${tuples}
         ON CONFLICT (student_id, activity_id, clo_id)
         DO UPDATE SET score = EXCLUDED.score, updated_at = now()`,
        batch.flatMap((mark) => [mark.studentId, activityId, mark.cloId, mark.score]),
      );
    }
  }

  router.put(
    '/teaching/sections/:sectionId/activities/:activityId/scores',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        return await reached(req, res, async (section, activity) => {
          const cloRows = await cloRowsOf(activity.id);
          if (cloRows.length === 0) {
            return res.status(400).json({ message: REFUSALS.activityHasNoClo });
          }

          const planned = await plan(section.section_id, activity, cloRows, req.body);
          if (planned.refusal) {
            return res.status(planned.refusal.status).json(planned.refusal.body);
          }

          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await record(client, activity.id, planned.writes);
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
          } finally {
            client.release();
          }

          return res.status(200).json(await screenOf(section.section_id, activity));
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The blank file, in the shape the toggle is currently in.
   *
   * Declared above nothing that could swallow it — `scores` has no `/:id` below
   * it — but kept beside its import for the reason every other screen keeps
   * them together: the two have to agree about the columns, and they agree here
   * by being read from the same place.
   *
   * The example row's code is `66019999`, outside both seeded cohorts, for
   * #67's reason: a person who uploads the template unedited is answered by the
   * class list rather than by somebody's real record.
   */
  router.get(
    '/teaching/sections/:sectionId/activities/:activityId/scores/import-template',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        return await reached(req, res, async (section, activity) => {
          const cloRows = await cloRowsOf(activity.id);
          const perClo = req.query.mode === 'clo' && cloRows.length > 0;
          const columns = WHO_COLUMNS.concat(
            perClo ? cloRows.map((row) => row.clo_number) : [WHOLE_MARK_COLUMN],
          );
          const example = { student_id: '66019999', full_name_th: 'ตัวอย่าง นักศึกษา' };
          for (const column of columns.slice(WHO_COLUMNS.length)) example[column] = '0';
          return sendTemplate(res, 'activity-marks-template.csv', columns, example);
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The four checks the ticket names, made before any row is read.
   *
   * They are whole-file questions — a count, a set of codes, a set of names, a
   * list of columns — and each answers with which of the four failed, because a
   * single "this file does not match" would be true of all four and would leave
   * the reader to work out which. Only once the file is *about* this ตอนเรียน
   * does the per-row report take over, and then it is about the numbers.
   */
  function reconcile(headers, records, roll, cloRows) {
    if (WHO_COLUMNS.some((column) => !headers.includes(column))) {
      return { wrongTemplate: true };
    }

    const markColumns = headers.filter((column) => !WHO_COLUMNS.includes(column));
    const perClo = !(markColumns.length === 1 && markColumns[0] === WHOLE_MARK_COLUMN);
    if (perClo) {
      const expected = cloRows.map((row) => row.clo_number);
      const same =
        markColumns.length === expected.length &&
        markColumns.every((column, index) => column === expected[index]);
      if (!same) return { message: REFUSALS.marksCloColumns(expected.join(', ')) };
    }

    if (records.length !== roll.length) {
      return { message: REFUSALS.marksCountMismatch(roll.length, records.length) };
    }

    const enrolled = new Map(roll.map((student) => [student.student_id, student]));
    const inFile = new Set();
    for (const line of records) {
      const code = blankToNull(line.student_id);
      const student = code ? enrolled.get(code) : null;
      if (!student) return { message: REFUSALS.markStudentNotEnrolled(code ?? '—') };
      // The name check is the ticket's third, and it is a check that the file
      // is *aligned* rather than that the name is right: a sheet whose rows
      // slipped by one still carries real codes and real names, and only the
      // pairing of them says so.
      const name = blankToNull(line.full_name_th);
      if (name !== student.full_name_th) {
        return { message: REFUSALS.marksNameMismatch(code, student.full_name_th) };
      }
      inFile.add(code);
    }
    for (const student of roll) {
      if (!inFile.has(student.student_id)) {
        return { message: REFUSALS.marksStudentMissing(student.student_id) };
      }
    }

    return { ok: true, perClo };
  }

  router.post(
    '/teaching/sections/:sectionId/activities/:activityId/scores/import',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        return await reached(req, res, async (section, activity) => {
          const cloRows = await cloRowsOf(activity.id);
          if (cloRows.length === 0) {
            return sendImport(res, { ok: false, message: REFUSALS.activityHasNoClo }, 'marks');
          }

          // The four checks the ticket asks for are about the file rather than
          // about any row of it, so they are asked here — before `importRows`
          // opens a transaction — rather than through its `whole`, which runs
          // inside one. The answers still go back through `sendImport`, which
          // owns what a refused import looks like; what is different about
          // this route is *when* the question is asked, not how it is answered.
          const text = typeof req.body === 'string' ? req.body : '';
          const { headers, records } = parseTable(text);
          if (records.length === 0) return sendImport(res, { empty: true }, 'marks');

          const roll = await rollOf(section.section_id);
          const checked = reconcile(headers, records, roll, cloRows);
          if (checked.wrongTemplate) return sendImport(res, { wrongTemplate: true }, 'marks');
          if (checked.message) {
            return sendImport(res, { ok: false, message: checked.message }, 'marks');
          }

          // One draft per student, not per mark: a file of sixty students
          // reports "นำเข้าสำเร็จ 60 รายการ", which is what the person counted
          // when they filled it in.
          const result = await importRows(pool, text, {
            required: WHO_COLUMNS,
            readRow: (line) => {
              const student_id = blankToNull(line.student_id);
              const read = checked.perClo
                ? readShares(cloRows, (row) => line[row.clo_number])
                : readWhole(activity, cloRows, line[WHOLE_MARK_COLUMN]);
              if (!read.ok) return read;
              return { ok: true, draft: { student_id, shares: read.shares } };
            },
            insert: async (client, draft) => {
              await record(
                client,
                activity.id,
                draft.shares.map((share) => ({
                  studentId: draft.student_id,
                  cloId: share.row.clo_id,
                  score: share.score,
                })),
              );
              return { ok: true, row: { student_id: draft.student_id } };
            },
          });

          return sendImport(res, result, 'marks');
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { activityScoreRoutes };
