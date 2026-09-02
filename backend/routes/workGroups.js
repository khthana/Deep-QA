'use strict';

/**
 * Ticket #26: กลุ่มงาน — who works with whom inside one ตอนเรียน.
 *
 * #25 built the class list. This divides it. What makes the ticket more than a
 * second junction table is that two of its rules are rules the database cannot
 * hold, and a third is a history that has to survive the thing it is about.
 *
 * *BR-06 and BR-07 live here because they cannot live anywhere else.* Migration
 * 0003 says so where `student_group_member` is declared: at most ten students
 * to a group counts a row's siblings, and one group per student per Section
 * reaches through two tables to the Section. Neither is a condition a single
 * row can satisfy, so neither is a constraint. That leaves them to this file,
 * and leaves this file owing an answer to the question a service-layer rule
 * always owes: what happens when two requests arrive together. See *The locks*
 * below.
 *
 * *Adding is not moving.* A student who is already in a group of this Section
 * is refused by `POST`, with the other group named, and the way to change
 * their group is `PUT` — a different verb, one log line, `MOVE_STUDENT`. The
 * ticket asks for that in its fifth criterion, and it asks for it because a
 * screen that quietly moved somebody would leave a history in which nobody was
 * ever moved: a removal here, an addition there, and no row that says the two
 * were one act. Making the person choose the verb is what makes the log true.
 *
 * *The grain is the Section, exactly as in `enrolment.js`.* A group belongs to
 * one ตอนเรียน; the two ตอนเรียน of one Offering divide their own rolls, and
 * `sectionOf` is imported from #25 rather than copied for
 * [#104](https://github.com/khthana/Deep-QA/issues/104)'s reason. Every group
 * id from a URL is then looked up by `(group_id, section_id)` and never by id
 * alone — three of this file's routes take both, and a group id belonging to
 * the Section next door is a 404 rather than a write that the foreign key
 * would have accepted without a word.
 *
 * *A rename writes nothing to the log, and that is the schema being right.*
 * The `action_type` CHECK holds five values and no rename among them. Every
 * entry copies `group_name` at the time it is written, so what a rename would
 * record is already recorded, once per line, by the copies — and a history
 * that renamed itself retroactively would be a history that lost the name the
 * person actually clicked on. The ticket's sixth criterion lists creations,
 * deletions, additions, removals and moves, and that list is exactly five.
 *
 * *Deleting a group empties it rather than refusing.* `student_group_member`
 * cascades, so the row would go either way; what the cascade cannot do is say
 * that it went. So the delete writes a `REMOVE_STUDENT` for every member and
 * then `DELETE_GROUP`, in one transaction, and only then drops the group. The
 * alternative — refusing to delete a group that still holds people — was
 * considered and rejected: nothing is lost by the delete (the students stay
 * enrolled, and their marks were never the group's), and a teacher disbanding
 * a group of ten would have had to press remove ten times to be allowed to
 * press delete once.
 *
 * ## The lock
 *
 * Both rules are counted and then written, and between those two moments a
 * second request can do the same. Two adds arriving together could each count
 * nine members and both write a tenth; two adds of one student into two groups
 * could each find them ungrouped.
 *
 * So every writing route takes one lock before it counts, and it is the same
 * lock for all of them: the `course_sections` row this screen is addressed by,
 * `FOR UPDATE`, as the first statement after BEGIN. Grouping is serialised per
 * ตอนเรียน, which is exactly the scope both rules are stated in - BR-06 counts
 * one group of it and BR-07 counts one student in it - and a ตอนเรียน has one
 * or two teachers, so nothing a person does here waits on anybody.
 *
 * It was two finer locks first, taken in one order: the student's own
 * `student_course` row, then the `student_group` row being written into. That
 * is correct for the routes that touch one student and one group, and wrong
 * for the import, which touches many of both inside one transaction: it holds
 * the first row's group while it reaches for the second row's student, and a
 * typed add holding that student and reaching for that group closes the cycle.
 * Postgres would break the deadlock by aborting one of them, and the person
 * whose upload lost would be told the system had failed. One lock cannot cycle.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, integerId, isDuplicate } = require('../lib/fields');
const { importRows, sendImport, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const { sectionOf, notThisSection } = require('./enrolment');

/** A ผู้สอน's own ตอนเรียน, as in `enrolment.js` and `teaching.js`. */
const TEACHING = ['TEACHER'];

/**
 * BR-06's ceiling. The one number in this file that is a rule rather than a
 * shape.
 *
 * `db/seed.js` declares it too, as `MAX_GROUP_SIZE`, and cannot import this
 * one: `backend` reads `db` and never the reverse. What keeps the two honest
 * is `backend/test/work-groups.test.js`, which fills a group to the *seed's*
 * number and asserts this file refuses the next one — so a disagreement is a
 * failing test rather than a rule with two values.
 */
const MAX_MEMBERS = 10;

/** `group_name` is varchar(100); anything longer is a 22001 rather than a sentence. */
const NAME_LIMIT = 100;

/** Eight digits, the shape #17's register refuses anything else in. */
const CODE = /^\d{8}$/;

/** Two columns, because a grouping is a name and a person and nothing else. */
const IMPORT_COLUMNS = ['group_name', 'student_id'];

/**
 * What a member is on the screen: the code, and the name a person reads.
 *
 * One join with two ways in — by Section for the list, by group for the one
 * group a write answers with — because a second copy of it is a second place
 * for "a member is a student of this Section" to stop being true.
 */
const MEMBERS = `SELECT m.group_id, s.student_id, s.full_name_th
                   FROM student_group_member m
                   JOIN student_group g ON g.group_id = m.group_id
                   JOIN student s ON s.student_id = m.student_id`;
const MEMBERS_OF_SECTION = `${MEMBERS} WHERE g.section_id = $1 ORDER BY s.student_id`;
const MEMBERS_OF_GROUP = `${MEMBERS} WHERE m.group_id = $1 ORDER BY s.student_id`;

function workGroupRoutes(pool) {
  const router = express.Router();

  /**
   * A refusal as `inSection` carries it: a status and the sentence, unsent.
   *
   * Not `refuse`, which `auth/accounts.js` already owns with the opposite
   * contract - that one takes a REFUSALS *key* and looks it up, this one takes
   * a sentence already formed, because three of this file's refusals name a
   * group and cannot be constants. One name for two contracts in one repo is
   * how the wrong one gets called.
   */
  const refusedWith = (status, message) => ({ status, body: { message } });
  const notThisGroup = () => refusedWith(404, REFUSALS.groupNotFound);

  /**
   * The one lock — see *The lock* at the top of this file.
   *
   * The `course_sections` row rather than a table or an advisory key, because
   * it is the row this whole screen is addressed by and its id is already in
   * hand. Taken as the first statement after BEGIN so that every writing path
   * agrees on when it happens, and released by the COMMIT that ends the
   * transaction.
   */
  const lockSection = (client, sectionId) =>
    client.query('SELECT section_id FROM course_sections WHERE section_id = $1 FOR UPDATE', [
      sectionId,
    ]);

  /** A group name as typed: present, trimmed, and short enough for its column. */
  function readName(source) {
    const group_name = blankToNull(source?.group_name);
    if (!group_name || group_name.length > NAME_LIMIT) return { ok: false };
    return { ok: true, group_name };
  }

  /**
   * This group, if it is this Section's — and null for every other case.
   *
   * `client` rather than the pool because every writing route calls it inside
   * its own transaction, behind the Section lock: what it reads is what the
   * route is about to count, and the count is only worth anything if nobody
   * else can change it in between.
   */
  async function groupOf(client, sectionId, groupId) {
    const id = integerId(groupId);
    if (id === null) return null;
    const { rows } = await client.query(
      'SELECT group_id, group_name FROM student_group WHERE group_id = $1 AND section_id = $2',
      [id, sectionId],
    );
    return rows[0] ?? null;
  }

  /** The group as the list draws it: itself, its members, and how many that is. */
  async function withMembers(client, group) {
    const { rows } = await client.query(MEMBERS_OF_GROUP, [group.group_id]);
    const members = rows.map((row) => ({
      student_id: row.student_id,
      full_name_th: row.full_name_th,
    }));
    return { ...group, members, member_count: members.length };
  }

  /**
   * Where this student stands in this Section: enrolled at all, and in which
   * group — one question, because the answer to the second is meaningless
   * without the first.
   *
   * Asked of whatever it is handed - the pool for the import's per-row report,
   * which is built before the transaction exists, and the transaction's own
   * client everywhere the answer is about to be acted on. Only the second is
   * load-bearing, because only the second is behind the Section lock.
   */
  async function standingOf(client, sectionId, studentId) {
    const enrolled = await client.query(
      'SELECT student_id FROM student_course WHERE student_id = $1 AND section_id = $2',
      [studentId, sectionId],
    );
    if (!enrolled.rows[0]) return null;

    const { rows } = await client.query(
      `SELECT g.group_id, g.group_name
         FROM student_group_member m
         JOIN student_group g ON g.group_id = m.group_id
        WHERE g.section_id = $1 AND m.student_id = $2`,
      [sectionId, studentId],
    );
    return { enrolled: true, group: rows[0] ?? null };
  }

  /** How many students the group holds, asked after the group row is locked. */
  async function memberCount(client, groupId) {
    const { rows } = await client.query(
      'SELECT count(*)::int AS members FROM student_group_member WHERE group_id = $1',
      [groupId],
    );
    return rows[0].members;
  }

  /**
   * One line of history.
   *
   * `group_name` comes off the group the caller is holding rather than being
   * looked up, because the log is a copy and not a pointer — 0003 says why —
   * and a join here would quietly start telling the truth about the present.
   *
   * The three fields that never vary within one request — the Section, the
   * group, and who is acting — travel as one `where` argument, so a call site
   * says only what happened. They were a clump repeated at six of them.
   */
  const record = (client, { section, group, by }, entry) =>
    client.query(
      `INSERT INTO student_group_change_log
         (section_id, group_id, group_name, student_id, action_type, old_group_id,
          new_group_id, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        section.section_id,
        group.group_id,
        group.group_name,
        entry.student_id ?? null,
        entry.action_type,
        entry.old_group_id ?? null,
        entry.new_group_id ?? null,
        by,
      ],
    );

  /**
   * A transaction with the Section already resolved, or the refusal instead.
   *
   * Every writing route below is the same six lines of BEGIN, resolve, work,
   * COMMIT, rollback-on-throw, release, and the sixth is the one that is easy
   * to forget once.
   *
   * `work` returns `{ status, body }` and does not touch `res`, which is the
   * whole point rather than a tidiness: a route that answered inside the
   * transaction would be telling the caller the thing was done while the COMMIT
   * was still in flight. #26's own suite caught it — a DELETE answered 204 and
   * the very next read still found the group — and the failure mode outside a
   * test is worse, because a COMMIT that fails after the 204 leaves a person
   * looking at a screen that says the group is gone.
   */
  async function inSection(req, res, next, work) {
    const section = await sectionOf(pool, req, req.params.sectionId);
    if (!section) return notThisSection(res);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockSection(client, section.section_id);
      const answer = await work(client, section);
      await client.query('COMMIT');
      return answer.status === 204
        ? res.status(204).send()
        : res.status(answer.status).json(answer.body);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  }

  /**
   * Every group of this ตอนเรียน, with its members, and the roll they come from
   * — the first criterion, and the shape the whole screen is drawn from.
   *
   * Not paged, alone among the lists in this system, and deliberately. The
   * groups *are* the page: a Section holds at most a few dozen, each holding at
   * most ten, and a person doing this work is looking at all of them at once to
   * decide who goes where. The roll comes with them for the same reason — the
   * control that adds somebody has to offer fifty-seven names and say which of
   * them are already placed, and a paged roll would be a picker that cannot see
   * the person it is looking for.
   *
   * The roll's join is scoped to this Section inside the sub-select rather than
   * in the WHERE. A student may be in a group of another Section — that is what
   * BR-07 permits and what the prior year's cohort looks like — and a join left
   * unscoped would return them twice, once per group, which the screen would
   * draw as two students with one code.
   */
  router.get(
    '/teaching/sections/:sectionId/groups',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const groups = await pool.query(
          `SELECT group_id, group_name FROM student_group
            WHERE section_id = $1 ORDER BY group_name, group_id`,
          [section.section_id],
        );
        const members = await pool.query(MEMBERS_OF_SECTION, [section.section_id]);
        const students = await pool.query(
          `SELECT s.student_id, s.full_name_th, placed.group_id, placed.group_name
             FROM student_course sc
             JOIN student s ON s.student_id = sc.student_id
             LEFT JOIN (SELECT m.student_id, g.group_id, g.group_name
                          FROM student_group_member m
                          JOIN student_group g ON g.group_id = m.group_id
                         WHERE g.section_id = $1) placed
               ON placed.student_id = s.student_id
            WHERE sc.section_id = $1
            ORDER BY s.student_id`,
          [section.section_id],
        );

        const held = new Map(groups.rows.map((group) => [group.group_id, []]));
        for (const member of members.rows) {
          held.get(member.group_id).push({
            student_id: member.student_id,
            full_name_th: member.full_name_th,
          });
        }

        return res.status(200).json({
          groups: groups.rows.map((group) => ({
            ...group,
            members: held.get(group.group_id),
            member_count: held.get(group.group_id).length,
          })),
          students: students.rows,
          max_group_size: MAX_MEMBERS,
          section,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The change history — the sixth criterion.
   *
   * Declared above `/:groupId`, as the template is, so Express does not read
   * `history` as a group id.
   *
   * The two group names either side of a move are looked up live rather than
   * stored, and only the row's own `group_name` is a copy. That is the honest
   * shape of what 0003 kept: one name per line. A group deleted since answers
   * `null` for whichever side it was on, and the screen falls back to the copy
   * — which for a move is the group the student went *to*, so the sentence a
   * reader gets is never wrong, only sometimes shorter.
   */
  router.get(
    '/teaching/sections/:sectionId/groups/history',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);

        const { page, perPage, offset } = pageOf(req);
        const counted = await pool.query(
          'SELECT count(*)::int AS total FROM student_group_change_log WHERE section_id = $1',
          [section.section_id],
        );
        // `log_id` breaks the tie and has to: `created_at` defaults to `now()`,
        // which is the *transaction's* clock, so every line the deletion of one
        // group writes carries the same instant to the microsecond. Ordering by
        // the timestamp alone would let a group's removals and its deletion come
        // back shuffled, and the reader would see people leaving a group that
        // was already gone.
        const { rows } = await pool.query(
          `SELECT l.log_id, l.action_type, l.group_id, l.group_name, l.student_id,
                  s.full_name_th AS student_name,
                  l.old_group_id, source.group_name AS old_group_name,
                  l.new_group_id, target.group_name AS new_group_name,
                  l.performed_by,
                  trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))
                    AS performed_by_name,
                  l.created_at
             FROM student_group_change_log l
             LEFT JOIN student s ON s.student_id = l.student_id
             LEFT JOIN student_group source ON source.group_id = l.old_group_id
             LEFT JOIN student_group target ON target.group_id = l.new_group_id
             LEFT JOIN users u ON u.user_id = l.performed_by
            WHERE l.section_id = $1
            ORDER BY l.created_at DESC, l.log_id DESC
            LIMIT $2 OFFSET $3`,
          [section.section_id, perPage, offset],
        );

        return res.status(200).json({
          entries: rows,
          total: counted.rows[0].total,
          page,
          per_page: perPage,
          section,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * The blank file — above `/:groupId` for the reason `history` is.
   *
   * The example names `66019999`, outside both seeded cohorts, for #25's
   * reason: a person who uploads the template unedited is answered by the
   * class list rather than by somebody's real record (#67).
   */
  router.get(
    '/teaching/sections/:sectionId/groups/import-template',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        if (!(await sectionOf(pool, req, req.params.sectionId))) return notThisSection(res);
        return sendTemplate(res, 'section-groups-template.csv', IMPORT_COLUMNS, {
          group_name: 'กลุ่มที่ 1',
          student_id: '66019999',
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * A spreadsheet of groupings — the seventh criterion.
   *
   * The file names a group per row rather than listing groups separately,
   * because that is what a class list with a group column already looks like
   * when a ผู้สอน has one. A name this Section does not have yet is created,
   * once, with its `CREATE_GROUP` line; a name it already has is added to. So
   * one file can group a whole class from nothing, or finish a grouping
   * somebody started on the screen, without meaning two different things.
   *
   * It is additive and never removes: a student the file does not mention
   * stays where they are. #30's weighting import replaces, and the difference
   * is that a weighting scheme is one thing that must total a hundred, while a
   * grouping is many independent facts. A replace here would silently disband
   * every group a colleague made between the download and the upload.
   *
   * BR-07 is checked in `verify`, against the database, and BR-06 in `insert`,
   * inside the transaction — which is where it has to be, because a file
   * putting eleven people in a new group has ten of them staged and none of
   * them committed at the moment the eleventh is judged.
   */
  router.post(
    '/teaching/sections/:sectionId/groups/import',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const section = await sectionOf(pool, req, req.params.sectionId);
        if (!section) return notThisSection(res);
        const performedBy = req.session.userId;

        const result = await importRows(pool, req.body, {
          required: IMPORT_COLUMNS,
          readRow: (record_) => {
            const name = readName(record_);
            if (!name.ok) return { ok: false, reason: 'invalidGroup' };
            const student_id = blankToNull(record_.student_id);
            if (!student_id || !CODE.test(student_id)) {
              return { ok: false, reason: 'invalidEnrolment' };
            }
            return { ok: true, draft: { group_name: name.group_name, student_id } };
          },
          // One student, one line. Two lines naming the same code are each
          // individually legal and together are BR-07 broken inside the file,
          // where the database has nothing to say and only the line numbers
          // can explain it.
          keys: [{ of: (draft) => draft.student_id, message: REFUSALS.repeatedStudentId }],
          verify: async (draft) => {
            const standing = await standingOf(pool, section.section_id, draft.student_id);
            if (!standing) return 'studentNotEnrolled';
            if (standing.group) {
              return { message: REFUSALS.studentInAnotherGroup(standing.group.group_name) };
            }
            return null;
          },
          insert: async (client, draft) => {
            // The lock, and then both rules asked again — `verify` above asked
            // them of the pool, before this transaction existed, because a
            // per-row report has to be built before anything is written. That
            // answer is a report, not a guarantee. This one is behind the
            // lock, and it is also the only place that can see the rows
            // earlier lines of the same file have staged: a file putting
            // eleven people in a new group has ten of them written and none of
            // them committed when the eleventh is judged.
            //
            // Taken here rather than once before the first row because
            // `importRows` owns the transaction and opens it itself. That is
            // sound, and the reason is worth writing down: `insert` runs
            // inside a savepoint, and a savepoint that is *released* — which is
            // what a row that succeeds does — leaves its locks with the
            // transaction. So the first row to get this far holds the lock for
            // the rest of the file. A row that is *rolled back* gives its lock
            // up again, and that is harmless: `importRows` rolls the whole file
            // back if any row failed, so a run that let go of the lock is a run
            // that commits nothing.
            await lockSection(client, section.section_id);

            const standing = await standingOf(client, section.section_id, draft.student_id);
            if (!standing) return { ok: false, reason: 'studentNotEnrolled' };
            if (standing.group) {
              return {
                ok: false,
                message: REFUSALS.studentInAnotherGroup(standing.group.group_name),
              };
            }

            const found = await client.query(
              'SELECT group_id, group_name FROM student_group WHERE section_id = $1 AND group_name = $2',
              [section.section_id, draft.group_name],
            );
            let group = found.rows[0];
            if (!group) {
              const made = await client.query(
                `INSERT INTO student_group (section_id, group_name) VALUES ($1, $2)
                 RETURNING group_id, group_name`,
                [section.section_id, draft.group_name],
              );
              group = made.rows[0];
              await record(client, { section, group, by: performedBy }, {
                action_type: 'CREATE_GROUP',
                new_group_id: group.group_id,
              });
            }

            if ((await memberCount(client, group.group_id)) >= MAX_MEMBERS) {
              return { ok: false, message: REFUSALS.groupFull(group.group_name) };
            }

            await client.query(
              'INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)',
              [group.group_id, draft.student_id],
            );
            await record(client, { section, group, by: performedBy }, {
              student_id: draft.student_id,
              action_type: 'ADD_STUDENT',
              new_group_id: group.group_id,
            });
            return { ok: true, row: { group_id: group.group_id, student_id: draft.student_id } };
          },
        });
        return sendImport(res, result, 'members');
      } catch (error) {
        return next(error);
      }
    },
  );

  /** A new group — the first half of the first criterion. */
  router.post(
    '/teaching/sections/:sectionId/groups',
    requireRole(...TEACHING),
    async (req, res, next) =>
      inSection(req, res, next, async (client, section) => {
        const name = readName(req.body ?? {});
        if (!name.ok) return refusedWith(400, REFUSALS.invalidGroup);

        let group;
        try {
          const { rows } = await client.query(
            `INSERT INTO student_group (section_id, group_name) VALUES ($1, $2)
             RETURNING group_id, group_name`,
            [section.section_id, name.group_name],
          );
          group = rows[0];
        } catch (error) {
          // Migration 0007's partial index, not a SELECT taken first: two
          // creates arriving together would both find nothing.
          if (isDuplicate(error)) {
            return refusedWith(409, REFUSALS.duplicateGroupName);
          }
          throw error;
        }

        await record(client, { section, group, by: req.session.userId }, {
          action_type: 'CREATE_GROUP',
          new_group_id: group.group_id,
        });

        return { status: 201, body: { group: { ...group, members: [], member_count: 0 } } };
      }),
  );

  /** A new name for a group — and no log line; see the header. */
  router.put(
    '/teaching/sections/:sectionId/groups/:groupId',
    requireRole(...TEACHING),
    async (req, res, next) =>
      inSection(req, res, next, async (client, section) => {
        const group = await groupOf(client, section.section_id, req.params.groupId);
        if (!group) return notThisGroup();

        const name = readName(req.body ?? {});
        if (!name.ok) return refusedWith(400, REFUSALS.invalidGroup);

        try {
          await client.query(
            'UPDATE student_group SET group_name = $1, updated_at = now() WHERE group_id = $2',
            [name.group_name, group.group_id],
          );
        } catch (error) {
          if (isDuplicate(error)) {
            return refusedWith(409, REFUSALS.duplicateGroupName);
          }
          throw error;
        }

        const renamed = { group_id: group.group_id, group_name: name.group_name };
        return { status: 200, body: { group: await withMembers(client, renamed) } };
      }),
  );

  /**
   * A group disbanded — the third part of the first criterion, and the eighth.
   *
   * The confirmation the eighth criterion asks for is the screen's: a server
   * cannot tell a considered DELETE from a slip, and a route that demanded a
   * `confirm: true` in the body would be asking the caller to answer a question
   * they answered by calling.
   *
   * The members' exits are written before the deletion and one at a time, so
   * that a reader of one student's history sees them leave rather than
   * inferring it from a group that is no longer there.
   */
  router.delete(
    '/teaching/sections/:sectionId/groups/:groupId',
    requireRole(...TEACHING),
    async (req, res, next) =>
      inSection(req, res, next, async (client, section) => {
        const group = await groupOf(client, section.section_id, req.params.groupId);
        if (!group) return notThisGroup();

        const { rows } = await client.query(
          'SELECT student_id FROM student_group_member WHERE group_id = $1 ORDER BY student_id',
          [group.group_id],
        );
        const ledger = { section, group, by: req.session.userId };
        for (const member of rows) {
          await record(client, ledger, {
            student_id: member.student_id,
            action_type: 'REMOVE_STUDENT',
            old_group_id: group.group_id,
          });
        }
        await record(client, ledger, {
          action_type: 'DELETE_GROUP',
          old_group_id: group.group_id,
        });

        // The membership rows go with it - `ON DELETE CASCADE` - and their
        // going is what the lines above have just recorded.
        await client.query('DELETE FROM student_group WHERE group_id = $1', [group.group_id]);
        return { status: 204 };
      }),
  );

  /**
   * Somebody added to a group — the second criterion, and where both limits are
   * refused.
   *
   * The order of the three refusals is the order a person would ask them in:
   * is this even your student, is she somewhere already, is there room. Asking
   * about room first would tell a ผู้สอน that a group is full when the student
   * they picked was never going to be added to it.
   */
  router.post(
    '/teaching/sections/:sectionId/groups/:groupId/students',
    requireRole(...TEACHING),
    async (req, res, next) =>
      inSection(req, res, next, async (client, section) => {
        const studentId = blankToNull(req.body?.student_id);
        const standing = studentId
          ? await standingOf(client, section.section_id, studentId)
          : null;

        const group = await groupOf(client, section.section_id, req.params.groupId);
        if (!group) return notThisGroup();
        if (!standing) return refusedWith(404, REFUSALS.studentNotEnrolled);

        if (standing.group) {
          const message =
            standing.group.group_id === group.group_id
              ? REFUSALS.studentAlreadyHere
              : REFUSALS.studentInAnotherGroup(standing.group.group_name);
          return { status: 409, body: { message } };
        }
        if ((await memberCount(client, group.group_id)) >= MAX_MEMBERS) {
          return refusedWith(409, REFUSALS.groupFull(group.group_name));
        }

        await client.query(
          'INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)',
          [group.group_id, studentId],
        );
        await record(client, { section, group, by: req.session.userId }, {
          student_id: studentId,
          action_type: 'ADD_STUDENT',
          new_group_id: group.group_id,
        });

        return { status: 201, body: { group: await withMembers(client, group) } };
      }),
  );

  /**
   * Somebody moved into this group — the fifth criterion.
   *
   * The destination is the address and the origin is read from the database,
   * never from the body: which group somebody is in now is a fact the server
   * holds, and taking it from the caller would let a request rewrite the
   * history of a group it never touched. ADR-0002 is about authorisation and
   * this is not authorisation, but it is the same sentence one turn down.
   *
   * One log line, `MOVE_STUDENT`, carrying both ends. A removal and an addition
   * would say the same thing about the membership table and a different thing
   * about what happened.
   */
  router.put(
    '/teaching/sections/:sectionId/groups/:groupId/students/:studentId',
    requireRole(...TEACHING),
    async (req, res, next) =>
      inSection(req, res, next, async (client, section) => {
        const studentId = req.params.studentId;
        const standing = await standingOf(client, section.section_id, studentId);

        const group = await groupOf(client, section.section_id, req.params.groupId);
        if (!group) return notThisGroup();
        if (!standing) return refusedWith(404, REFUSALS.studentNotEnrolled);

        if (!standing.group) return refusedWith(409, REFUSALS.studentNotGrouped);
        if (standing.group.group_id === group.group_id) {
          return refusedWith(409, REFUSALS.studentAlreadyHere);
        }
        if ((await memberCount(client, group.group_id)) >= MAX_MEMBERS) {
          return refusedWith(409, REFUSALS.groupFull(group.group_name));
        }

        await client.query(
          'DELETE FROM student_group_member WHERE group_id = $1 AND student_id = $2',
          [standing.group.group_id, studentId],
        );
        await client.query(
          'INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)',
          [group.group_id, studentId],
        );
        await record(client, { section, group, by: req.session.userId }, {
          student_id: studentId,
          action_type: 'MOVE_STUDENT',
          old_group_id: standing.group.group_id,
          new_group_id: group.group_id,
        });

        return { status: 200, body: { group: await withMembers(client, group) } };
      }),
  );

  /**
   * Somebody taken out of a group — the second criterion's other half.
   *
   * The DELETE is attempted rather than preceded by a SELECT, so that the
   * membership row's own key decides whether there was anything to remove:
   * two requests arriving together cannot both find the row and both write a
   * removal into the history.
   */
  router.delete(
    '/teaching/sections/:sectionId/groups/:groupId/students/:studentId',
    requireRole(...TEACHING),
    async (req, res, next) =>
      inSection(req, res, next, async (client, section) => {
        const group = await groupOf(client, section.section_id, req.params.groupId);
        if (!group) return notThisGroup();

        const removed = await client.query(
          'DELETE FROM student_group_member WHERE group_id = $1 AND student_id = $2',
          [group.group_id, req.params.studentId],
        );
        if (removed.rowCount === 0) {
          return refusedWith(404, REFUSALS.studentNotInGroup);
        }

        await record(client, { section, group, by: req.session.userId }, {
          student_id: req.params.studentId,
          action_type: 'REMOVE_STUDENT',
          old_group_id: group.group_id,
        });

        return { status: 204 };
      }),
  );

  return router;
}

module.exports = { workGroupRoutes };
