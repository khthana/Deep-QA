'use strict';

/**
 * Outcome-to-Subject mapping — ticket #20.
 *
 * การเชื่อมโยงผลการเรียนรู้กับรายวิชา: for one หลักสูตร, how strongly each of
 * its รายวิชา serves each of its PLOs, at one of five levels. This is the
 * coverage grid the accreditation submission is built from — #18 gives it its
 * rows, #19 gives it its columns, and nothing below it reads it.
 *
 * Seven things here are decisions rather than habit.
 *
 * *There is one read, not three.* Every other screen in the house lists one
 * table and the routes follow. A grid is not a list: it is two axes and the
 * cells between them, and a screen that fetched the rows, the columns and the
 * cells separately would draw itself three times and be briefly wrong twice.
 * So `GET /plo-mapping` answers all three from one snapshot, and the screen has
 * nothing to reconcile.
 *
 * *The write is an upsert, and that is the third criterion rather than a
 * convenience.* "Saving an already-set cell updates it rather than creating a
 * second mapping" reads like a duplicate refusal, but a second row for one cell
 * is not something this route has to prevent: `(program_id, subject_id,
 * outcome_id)` is the primary key, so the database cannot hold one. What the
 * criterion is choosing between is refuse and update, and it asks for update.
 * `ON CONFLICT ... DO UPDATE` is that answer in one statement, which also means
 * two committee members saving the same cell at once cannot produce a fault.
 *
 * *An untouched cell has no row, and `E` is not that.* The migration says both
 * halves: `createEmptyMapping` is dead code, so "an unmapped subject is one
 * with no rows"; and `'E'` says that one *named* PLO is not served by this
 * subject, which is narrower. The inherited system wrote placeholder rows from
 * two other screens — `docs/05` shows the subject import and the PLO creation
 * both reaching for `subjectPloMappingModel` — and this rebuild does not. So
 * `mapping_level` is required on the way in: there is no "save nothing" here,
 * because saving nothing is what not saving already does.
 *
 * *The outcome axis is ข้อหลัก only — #100.* "Every PLO of the หลักสูตร" read
 * literally gives a ข้อย่อย its own column, which is fifty-two columns for the
 * seed's 0501 and a printed page nobody can read. So the read stops at
 * `parent_outcome_id IS NULL` on both the axis and the cells. The write is left
 * permissive on purpose — see the note above the upsert — so a cell an import
 * put under a ข้อย่อย is dropped by the read rather than refused at the door.
 * What this costs is stated rather than hidden: the grid can say a subject
 * serves ข้อหลัก 3, not which ข้อย่อย of it.
 *
 * *Both axes are the active ones.* A pairing #18 switched off is a subject the
 * curriculum no longer teaches; an outcome #19 switched off is one no longer
 * claimed of a graduate. Neither belongs in a submission, so neither is drawn.
 * What is deliberately *not* done is deleting their cells: both screens switch
 * a record off precisely so that it can be switched back on, and coverage
 * thrown away in the meantime would make that a one-way door.
 *
 * *The two "not in this curriculum" checks buy a sentence, not the safety.* The
 * composite foreign keys to `program_subjects` and `learning_outcomes` already
 * make a cross-curriculum cell impossible — ADR-0003's argument, applied on
 * both axes at once. Asking here is what turns one constraint violation into
 * two sentences that say which axis was wrong.
 *
 * *`FACULTY_ADMIN` is absent.* The ticket does not say either way; #79 does,
 * and names A10 — this screen — among the four it binds. The faculty keeps the
 * list of ภาควิชา and of หลักสูตร, and what is *inside* a curriculum is decided
 * below it.
 *
 * The fifth criterion — the PDF, with Thai rendering correctly — is nowhere in
 * this file. The export is built in the browser from the grid this route
 * already answered, because a server that rendered it would need the same font
 * and the same column layout as the screen and would then have two of each.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull } = require('../lib/fields');
const { programInReach } = require('../lib/reach');

/**
 * The roles that decide which รายวิชา serves which ผลการเรียนรู้.
 *
 * The same pair as #18 and #19, and for the same reason: the committee writes
 * its own curriculum's coverage, the ผู้ดูแลภาควิชา above them reaches the
 * curricula they hold. `FULL_ADMIN` is out by docs/06's separation of duties,
 * `FACULTY_ADMIN` by #79, and `TEACHER` because serving an outcome is not
 * deciding that a subject serves it.
 */
const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];

/**
 * `mapping_level`, exactly, in the order the legend reads them.
 *
 * `E` first because it is the enum's own first member and the column default,
 * then the four that say something is taught. A level outside this set never
 * reaches the INSERT: the enum would raise 22P02, which this route has no
 * sentence for and would answer as a fault of its own.
 */
const LEVELS = ['E', 'I', 'D', 'P', 'A'];

/**
 * What one cell is, as this file reads it out.
 *
 * `updated_by_name` is joined in for #19's reason: a grid several people
 * maintain over a curriculum's life needs to say who last touched a cell, and
 * an identifier is not who.
 */
const CELL = `m.subject_id, m.outcome_id, m.mapping_level, m.updated_at,
              trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))
                AS updated_by_name`;

/**
 * One cell's worth of fields, from the grid.
 *
 * All four are required, `mapping_level` included: there is no request here
 * that means "clear this cell", because the state a cell starts in is *no row*
 * and this route never writes one it would then have to take away.
 *
 * `outcome_id` is read as a whole number rather than left to the bind, because
 * `learning_outcomes.outcome_id` is an `integer` and a body naming `1e40` would
 * otherwise raise 22003 at the lookup — a database fault where the route means
 * a sentence.
 */
function readCell(source) {
  const values = {
    program_id: blankToNull(source.program_id),
    subject_id: blankToNull(source.subject_id),
    outcome_id: blankToNull(source.outcome_id),
    mapping_level: blankToNull(source.mapping_level),
  };

  if (!values.program_id || !values.subject_id) return { ok: false };
  if (!LEVELS.includes(values.mapping_level)) return { ok: false };

  if (values.outcome_id === null) return { ok: false };
  const outcomeId = Number(values.outcome_id);
  if (!Number.isInteger(outcomeId)) return { ok: false };
  if (outcomeId < 1 || outcomeId > 2147483647) return { ok: false };
  values.outcome_id = outcomeId;

  return { ok: true, values };
}

function ploMappingRoutes(pool) {
  const router = express.Router();

  /**
   * The curriculum this request may read or write, or the key refusing it.
   *
   * Named by the caller and checked against the reach derived from the acting
   * grant, which is the shape ADR-0002 permits: authority is never read from a
   * request, a target named by one is verified. A curriculum that does not
   * exist, one in another department and one that has been retired all answer
   * the same key, so the query string is not a way of learning which curricula
   * the university has.
   */
  async function programRefusal(req, programId) {
    if (!programId) return { status: 400, key: 'mappingProgramMissing' };
    const program = await programInReach(pool, req.auth.acting.scope_id, programId);
    return program ? null : { status: 403, key: 'mappingProgramNotYours' };
  }

  /** One cell as the grid wants it, read back after a write. */
  async function loadCell(programId, subjectId, outcomeId) {
    const { rows } = await pool.query(
      `SELECT ${CELL}
         FROM subject_plo_mapping m
         LEFT JOIN users u ON u.user_id = m.updated_by
        WHERE m.program_id = $1 AND m.subject_id = $2 AND m.outcome_id = $3`,
      [programId, subjectId, outcomeId],
    );
    return rows[0];
  }

  /**
   * The whole grid for one หลักสูตร — the first and fourth criteria, in the
   * halves that are facts about the API.
   *
   * Three arrays and the curriculum they belong to, from one call. The rows are
   * its active รายวิชา by code; the columns are its active ข้อหลัก in
   * ข้อ order — since #100 there is no walk down to ข้อย่อย and nothing here
   * groups by depth; and the cells are only the ones somebody has set, which is
   * what makes the fourth criterion visible from outside — a subject just
   * placed and an outcome just written appear on their axis and in no cell.
   *
   * `parent_outcome_id` is the authority for that, not `level_depth`. #100
   * words its first criterion as `level_depth = 1`, and the two agree on every
   * row because `/api/plos` computes depth from the parent it was given and
   * refuses to read it off a request body. But the column is `DEFAULT 1` with
   * no CHECK behind it (`plos.js`, *Depth is the server's answer*), so it is
   * the derived field of the pair and parentage is the fact. Filtering on the
   * fact means a row whose depth was written wrong by some future import still
   * lands on the side of the axis it belongs to.
   *
   * `coveredScopes` is not used here, unlike every list route in the house.
   * This one is about a single curriculum the caller has named, so the narrower
   * question — does this grant reach *that* one — is the question, and it
   * answers 403 rather than an empty grid. An empty grid would be a lie: it is
   * what a curriculum with nothing in it looks like.
   */
  router.get('/plo-mapping', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const programId = blankToNull(req.query.program_id);
      const refusal = await programRefusal(req, programId);
      if (refusal) return res.status(refusal.status).json({ message: REFUSALS[refusal.key] });

      const program = await pool.query(
        `SELECT program_id, program_name_th, program_name_en, year
           FROM programs WHERE program_id = $1`,
        [programId],
      );

      const subjects = await pool.query(
        `SELECT ps.subject_id, ps.subject_type, s.subject_name_th, s.subject_name_en, s.credits
           FROM program_subjects ps
           JOIN subjects s ON s.subject_id = ps.subject_id
          WHERE ps.program_id = $1 AND ps.is_active = true
          ORDER BY ps.subject_id ASC`,
        [programId],
      );

      // ข้อหลัก only, and only the ones still in force. #100: the grid maps at the
      // main-PLO grain, so there is no walk down to ข้อย่อย here — a column per
      // ข้อย่อย is fifty-two columns nobody can read on one page. outcome_id
      // breaks the tie so two ข้อ given the same order still have a settled
      // answer rather than whichever the plan happened to produce.
      const outcomes = await pool.query(
        `SELECT outcome_id, outcome_code, outcome_title, outcome_type,
                parent_outcome_id, sequence_order, level_depth
           FROM learning_outcomes
          WHERE program_id = $1
            AND parent_outcome_id IS NULL
            AND is_active = true
          ORDER BY sequence_order ASC, outcome_id ASC`,
        [programId],
      );

      // Cells on both live axes only, so the grid never carries one it has no
      // square to draw in — and since #100 an axis is ข้อหลัก only, so a cell
      // written against a ข้อย่อย by an import is dropped here rather than sent
      // to a screen with no column for it. The rows themselves stay in the
      // table; see the note at the top of the file for why they are not
      // deleted with the axis.
      const mappings = await pool.query(
        `SELECT ${CELL}
           FROM subject_plo_mapping m
           LEFT JOIN users u ON u.user_id = m.updated_by
           JOIN program_subjects ps
             ON ps.program_id = m.program_id AND ps.subject_id = m.subject_id
           JOIN learning_outcomes lo
             ON lo.program_id = m.program_id AND lo.outcome_id = m.outcome_id
          WHERE m.program_id = $1 AND ps.is_active = true AND lo.is_active = true
            AND lo.parent_outcome_id IS NULL`,
        [programId],
      );

      return res.status(200).json({
        program: program.rows[0],
        subjects: subjects.rows,
        outcomes: outcomes.rows,
        mappings: mappings.rows,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Setting one cell — the second and third criteria, with the sixth as its
   * refusal.
   *
   * PUT rather than POST because it is the same request whether the cell has
   * been set before or not: a grid does not create cells, it fills the ones its
   * two axes already make. That is also why there is no `/:id` on the path —
   * the identifier is the three names in the body, and there is no surrogate to
   * put in a URL (ADR-0001 tier 2).
   */
  router.put('/plo-mapping', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readCell(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS.invalidMapping });

      // The curriculum first, and 403. Answering anything about which subjects
      // or outcomes it holds ahead of that would tell a caller who holds
      // nothing here what another curriculum contains, which is not theirs to
      // ask.
      const refusal = await programRefusal(req, draft.values.program_id);
      if (refusal) return res.status(refusal.status).json({ message: REFUSALS[refusal.key] });

      const { program_id: programId, subject_id: subjectId, outcome_id: outcomeId } = draft.values;

      const subject = await pool.query(
        `SELECT 1 FROM program_subjects WHERE program_id = $1 AND subject_id = $2`,
        [programId, subjectId],
      );
      if (!subject.rows[0]) {
        return res.status(404).json({ message: REFUSALS.mappingSubjectNotInProgram });
      }

      const outcome = await pool.query(
        `SELECT 1 FROM learning_outcomes WHERE program_id = $1 AND outcome_id = $2`,
        [programId, outcomeId],
      );
      if (!outcome.rows[0]) {
        return res.status(404).json({ message: REFUSALS.mappingOutcomeNotInProgram });
      }

      // Neither check above asks about is_active, and that is deliberate. The
      // grid does not draw a switched-off axis, so the screen cannot send one;
      // a route that refused it anyway would be a rule with no caller and no
      // way for a person to meet it. What would meet it is the import or the
      // script somebody writes later to restore a curriculum's coverage, and
      // refusing that is the opposite of what the two screens' deactivations
      // are for.
      await pool.query(
        `INSERT INTO subject_plo_mapping (
           program_id, subject_id, outcome_id, mapping_level, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (program_id, subject_id, outcome_id)
         DO UPDATE SET mapping_level = EXCLUDED.mapping_level,
                       updated_by = EXCLUDED.updated_by,
                       updated_at = now()`,
        [programId, subjectId, outcomeId, draft.values.mapping_level, req.session.userId],
      );

      return res.status(200).json({ mapping: await loadCell(programId, subjectId, outcomeId) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { ploMappingRoutes };
