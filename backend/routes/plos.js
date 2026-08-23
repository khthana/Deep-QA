'use strict';

/**
 * Programme Learning Outcomes — ticket #19.
 *
 * ผลการเรียนรู้ระดับหลักสูตร: what a graduate of a หลักสูตร can do, as a tree of
 * main outcomes and their ข้อย่อย, each typed and each in a stated order. This
 * is the set every screen above the subject eventually points at - #20 maps
 * รายวิชา onto it, #27's CLOs hang off it, and the coverage reports read it.
 *
 * Six things are decisions rather than habit, and each is a place where
 * copying #18 or #16 would have been wrong.
 *
 * *A code belongs to its หลักสูตร, not to the university.* `UNIQUE
 * (program_id, outcome_code)` is the ticket in one line: the inherited schema
 * made `outcome_code` globally unique, which stopped two curricula each having
 * a PLO1 - the thing curricula actually do. So the duplicate refusal here says
 * ในหลักสูตรนี้, and the tests assert the acceptance as loudly as the refusal.
 *
 * *The list is not paged.* Every other master-data screen pages at ten, and
 * this one deliberately does not: a child on page two whose parent is on page
 * one is not a tree, and no amount of client work puts it back together. A PLO
 * set is dozens of rows and is read as a whole, so the whole is what is sent -
 * the same reason #18's catalogue picker is unpaged.
 *
 * *The rows arrive in tree order, from the server.* The recursive query below
 * walks each root's descendants and sorts on the path of `sequence_order`s
 * that reaches them, so a child follows its parent and siblings follow their
 * stated order. Sorting flat and re-nesting on the client would work, but it
 * would move the fourth criterion - display order is respected - out of the
 * seam that can assert it. `level_depth` travels with each row and is what the
 * screen indents by.
 *
 * *Depth is the server's answer.* `level_depth` is `DEFAULT 1` with no CHECK,
 * so nothing in the database stops a caller writing a depth that disagrees
 * with the parent it names. It is computed from the parent's here and the body
 * is not read for it, for ADR-0002's reason applied to a field: a number the
 * screen indents by is not a number the screen gets to choose.
 *
 * *The parent check produces a sentence, not the safety.* `FOREIGN KEY
 * (program_id, parent_outcome_id) REFERENCES learning_outcomes (program_id,
 * outcome_id)` already makes a cross-curriculum parent impossible - it is the
 * same argument ADR-0003 makes for `subject_clo`. What the explicit check adds
 * is a message that says which of the two things went wrong. The *cycle* check
 * is different: no foreign key can see an outcome made a child of its own
 * descendant, so that one is load-bearing.
 *
 * *`FACULTY_ADMIN` is absent, against this ticket's own eighth criterion.* The
 * criterion says faculty administrators manage PLOs within their scope. #79
 * reversed that after the ticket was written and names A09 - this screen -
 * among the three it binds: the faculty keeps the list of ภาควิชา and of
 * หลักสูตร, and what is *inside* a curriculum is decided below it. The ticket
 * text is the older of the two, so #79 wins; docs/acceptance/19 records the
 * divergence rather than letting the checklist quietly disagree with the code.
 */

const express = require('express');

const { requireRole, coveredScopes } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { blankToNull, isDuplicate } = require('../lib/fields');
const { reachablePrograms, programInReach } = require('../lib/reach');
const { deleteOrDeactivate } = require('../lib/removal');

/**
 * The roles that decide what a graduate of a curriculum can do.
 *
 * `PROG_MANAGER` first, because this screen is theirs: the ticket opens with a
 * Curriculum Committee member and the outcomes are the committee's own
 * statement of its curriculum. `DEPT_ADMIN` above them, with the reach they
 * have everywhere. `FULL_ADMIN` and `FACULTY_ADMIN` are both absent - see the
 * note at the top of the file for the second, which is a reversal and not an
 * omission - and `TEACHER` because serving an outcome is not writing one.
 */
const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];

/** `outcome_type`, exactly. ความรู้ ทักษะ จริยธรรม and ลักษณะบุคคล on screen. */
const TYPES = ['knowledge', 'skills', 'ethics', 'character'];

/**
 * A ข้อหลัก that still has ข้อย่อย, refused from inside the removal's own
 * transaction. It is an error rather than a returned reason because that is the
 * only way out of the callback `deleteOrDeactivate` hands the client to, and it
 * is a class of its own so the route can tell it from a database fault.
 */
class HasChildren extends Error {}

/**
 * What a PLO is, as this file reads it out.
 *
 * `updated_by_name` is joined in for #27's reason: a set several people
 * maintain over a curriculum's life needs to say who last touched a row, and
 * an identifier is not who.
 */
const RETURNED = `lo.outcome_id, lo.program_id, lo.outcome_code, lo.outcome_title,
                  lo.outcome_description, lo.outcome_type, lo.parent_outcome_id,
                  lo.sequence_order, lo.level_depth, lo.is_active, lo.updated_at,
                  trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))
                    AS updated_by_name`;

const FROM = `FROM learning_outcomes lo LEFT JOIN users u ON u.user_id = lo.updated_by`;

/**
 * One outcome's worth of fields, from the form.
 *
 * `program_id` is required on creation and absent from an edit: moving an
 * outcome between curricula is not an edit. Everything beneath it - the
 * subject mappings, the CLOs that name it - carries the curriculum in its own
 * key, and none of that moves with a re-pointed parent.
 *
 * `sequence_order` is read as a whole number and refused otherwise, rather
 * than left to `Number()` and stored as NaN: an outcome ordered by nothing
 * sorts wherever the database feels like, which is the fourth criterion
 * failing silently. `level_depth` and `parent_outcome_id` are deliberately not
 * read here - the first is computed and the second is checked against the
 * database, which this function has no access to.
 */
function readOutcome(source, { editing = false } = {}) {
  const values = {
    program_id: blankToNull(source.program_id),
    outcome_code: blankToNull(source.outcome_code),
    outcome_title: blankToNull(source.outcome_title),
    outcome_description: blankToNull(source.outcome_description),
    outcome_type: blankToNull(source.outcome_type),
    sequence_order: blankToNull(source.sequence_order),
  };

  if (!editing && !values.program_id) return { ok: false, reason: 'invalidPlo' };
  if (!values.outcome_code || !values.outcome_title) return { ok: false, reason: 'invalidPlo' };
  if (!TYPES.includes(values.outcome_type)) return { ok: false, reason: 'invalidPlo' };

  // The null check is not redundant with the one below it: `Number(null)` is
  // `0`, which is a perfectly good integer, so a form submitted with the order
  // box empty would otherwise be accepted and sorted to the top of the list.
  if (values.sequence_order === null) return { ok: false, reason: 'invalidPlo' };
  const order = Number(values.sequence_order);
  if (!Number.isInteger(order)) return { ok: false, reason: 'invalidPlo' };
  // A whole number is not yet a number the column can hold: `sequence_order` is
  // an `integer`, and one past its end raises 22003 at the INSERT, which the
  // route has no key for and would answer as a fault of its own. The shape and
  // the range are two checks because they fail in two different places.
  if (order < 0 || order > 2147483647) return { ok: false, reason: 'invalidPlo' };
  values.sequence_order = order;

  return { ok: true, values };
}

/** The parent named by a body, or nothing — `null` and absent both mean a root. */
function readParent(source) {
  const raw = blankToNull(source.parent_outcome_id);
  if (raw === null || raw === undefined) return null;
  const parent = Number(raw);
  return Number.isInteger(parent) ? parent : NaN;
}

function ploRoutes(pool) {
  const router = express.Router();

  /**
   * The curriculum this request may write into.
   *
   * Named by the body and checked against the reach derived from the acting
   * grant, which is the shape ADR-0002 permits: authority is never read from a
   * request, a target named by one is verified. A curriculum that does not
   * exist, one in another department and one that has been retired all answer
   * the same key, for `departmentInReach`'s reason.
   */
  async function programRefusal(req, programId) {
    if (!programId) return 'invalidPlo';
    const program = await programInReach(pool, req.auth.acting.scope_id, programId);
    return program ? null : 'ploProgramNotYours';
  }

  /**
   * One outcome, if this grant reaches its curriculum.
   *
   * The same reach the list filters on, so an outcome the list did not show
   * cannot be edited by asking for it by number - and out of reach answers the
   * same 404 as never-made, which is the eighth criterion enforced at the
   * server rather than in a menu.
   */
  async function reachable(req, outcomeId) {
    if (!/^\d+$/.test(String(outcomeId))) return null;
    const reach = await coveredScopes(pool, req.auth.acting.scope_id);
    const { rows } = await pool.query(
      `SELECT ${RETURNED} ${FROM}
        WHERE lo.outcome_id = $1 AND ($2::text[] IS NULL OR lo.program_id = ANY($2))`,
      [outcomeId, reach],
    );
    return rows[0] ?? null;
  }

  /** The row as the screen wants it, read back after a write. */
  async function load(executor, outcomeId) {
    const { rows } = await executor.query(
      `SELECT ${RETURNED} ${FROM} WHERE lo.outcome_id = $1`,
      [outcomeId],
    );
    return rows[0];
  }

  /**
   * The parent this outcome is to sit under, as a refusal key or a depth.
   *
   * Answers `{ depth: 1 }` for a root. The parent has to be in the same
   * curriculum, which the composite foreign key would enforce anyway; asking
   * here is what turns a constraint violation into a sentence a person can act
   * on. An inactive parent is allowed: a switched-off outcome is still where
   * its ข้อย่อย live, and refusing would make the deactivation take the subtree
   * with it in everything but name.
   */
  async function parentDepth(programId, parentId) {
    if (parentId === null) return { depth: 1 };
    if (!Number.isInteger(parentId)) return { reason: 'ploParentNotFound' };

    const { rows } = await pool.query(
      `SELECT level_depth FROM learning_outcomes WHERE outcome_id = $1 AND program_id = $2`,
      [parentId, programId],
    );
    if (!rows[0]) return { reason: 'ploParentNotFound' };
    return { depth: rows[0].level_depth + 1 };
  }

  /**
   * Whether `parentId` is `outcomeId` itself or one of its descendants — the
   * check no foreign key makes.
   *
   * A tree that has been made to point back into itself is not merely wrong on
   * screen: the recursive query below would walk it forever. So this is asked
   * before every re-parenting, and answering it costs one walk of the subtree
   * being moved, not of the whole curriculum.
   */
  async function wouldCycle(outcomeId, parentId) {
    if (parentId === null) return false;
    if (parentId === outcomeId) return true;

    const { rows } = await pool.query(
      `WITH RECURSIVE descendants AS (
         SELECT outcome_id FROM learning_outcomes WHERE parent_outcome_id = $1
         UNION ALL
         SELECT child.outcome_id
           FROM learning_outcomes child
           JOIN descendants d ON child.parent_outcome_id = d.outcome_id
       )
       SELECT 1 FROM descendants WHERE outcome_id = $2 LIMIT 1`,
      [outcomeId, parentId],
    );
    return Boolean(rows[0]);
  }

  /**
   * The set, as a tree — the second and fourth criteria, in the halves that are
   * facts about the API.
   *
   * Roots first, narrowed by the reach and by `?program_id=`; then each root's
   * descendants, carrying the path of `sequence_order`s that reaches them.
   * Ordering on that path is what puts a child directly under its parent and
   * siblings in their stated order; `outcome_id` is appended at each step so
   * that two siblings given the same order still have a settled answer rather
   * than whichever the plan happened to produce.
   *
   * Inactive outcomes are listed alongside active ones, deliberately: a
   * referenced outcome is switched off rather than removed, and this is the
   * screen it is switched back on from.
   */
  router.get('/plos', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const program = blankToNull(req.query.program_id) ?? null;

      const { rows } = await pool.query(
        `WITH RECURSIVE tree AS (
           SELECT lo.*, ARRAY[lo.sequence_order, lo.outcome_id] AS path
             FROM learning_outcomes lo
            WHERE lo.parent_outcome_id IS NULL
              AND ($1::text[] IS NULL OR lo.program_id = ANY($1))
              AND ($2::text IS NULL OR lo.program_id = $2)
           UNION ALL
           SELECT child.*, t.path || child.sequence_order || child.outcome_id
             FROM learning_outcomes child
             JOIN tree t
               ON child.parent_outcome_id = t.outcome_id
              AND child.program_id = t.program_id
         )
         SELECT ${RETURNED}
           FROM tree lo
           LEFT JOIN users u ON u.user_id = lo.updated_by
          ORDER BY lo.program_id ASC, lo.path ASC`,
        [reach, program],
      );

      return res.status(200).json({ plos: rows, total: rows.length });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The curricula this caller reaches — the screen's picker, drawn from here
   * rather than from `/api/programs`, which belongs to the two administrators
   * (#15) and would refuse the committee member this screen is mainly for.
   */
  router.get('/plos/programs', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const programs = await reachablePrograms(pool, req.auth.acting.scope_id);
      return res.status(200).json({ programs });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * One outcome, for the edit form. Declared after `/plos/programs` because
   * Express matches in order and `:outcomeId` would otherwise swallow it.
   */
  router.get('/plos/:outcomeId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const plo = await reachable(req, req.params.outcomeId);
      if (!plo) return res.status(404).json({ message: REFUSALS.ploNotFound });
      return res.status(200).json({ plo });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Writing one down — the first criterion, with the third, fifth and eighth as
   * its refusals.
   */
  router.post('/plos', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const draft = readOutcome(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      // The curriculum first, and 403. Answering anything about codes or
      // parents ahead of it would tell a caller who holds nothing here what
      // another curriculum contains, which is not theirs to ask.
      const notYours = await programRefusal(req, draft.values.program_id);
      if (notYours) return res.status(403).json({ message: REFUSALS[notYours] });

      const parentId = readParent(req.body ?? {});
      const parent = await parentDepth(draft.values.program_id, parentId);
      if (parent.reason) return res.status(400).json({ message: REFUSALS[parent.reason] });

      const { rows } = await pool.query(
        `INSERT INTO learning_outcomes (
           program_id, outcome_code, outcome_title, outcome_description, outcome_type,
           parent_outcome_id, sequence_order, level_depth, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         RETURNING outcome_id`,
        [
          draft.values.program_id,
          draft.values.outcome_code,
          draft.values.outcome_title,
          draft.values.outcome_description,
          draft.values.outcome_type,
          parentId,
          draft.values.sequence_order,
          parent.depth,
          req.session.userId,
        ],
      );

      return res.status(201).json({ plo: await load(pool, rows[0].outcome_id) });
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: REFUSALS.duplicatePloCode });
      return next(error);
    }
  });

  /**
   * Changing one — the first criterion's middle verb, the fourth's *settable*,
   * and the way back from the sixth.
   *
   * The curriculum is not editable and is not read from the body. The parent
   * is: an outcome promoted to a main one, or a main one folded under another,
   * is a real edit of a tree, and the alternative is deleting a subtree and
   * typing it again. What that costs is the depth of everything beneath it,
   * which is why the descendants are re-stamped in the same statement rather
   * than left holding a depth that no longer describes where they are.
   *
   * `is_active` may be flipped, because a deactivation that could not be
   * undone would be a one-way door: the code is held by the row that is
   * already there, so the outcome could never simply be written again.
   */
  router.put('/plos/:outcomeId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.outcomeId);
      if (!existing) return res.status(404).json({ message: REFUSALS.ploNotFound });

      const draft = readOutcome(req.body ?? {}, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      // The parent is looked up before the cycle is asked about, and the order
      // matters: `readParent` answers NaN for a body that named something that
      // is not a number, and only `parentDepth` refuses it. Asked the other way
      // round, that NaN reaches the cycle walk's bind and comes back as a
      // database fault rather than as the sentence this route means.
      const parentId = readParent(req.body ?? {});
      const parent = await parentDepth(existing.program_id, parentId);
      if (parent.reason) return res.status(400).json({ message: REFUSALS[parent.reason] });

      if (await wouldCycle(existing.outcome_id, parentId)) {
        return res.status(400).json({ message: REFUSALS.ploParentCycle });
      }

      const shift = parent.depth - existing.level_depth;

      // The row and the subtree underneath it are one write, not two. Moving an
      // outcome changes its own `level_depth` and every descendant's by the same
      // amount, and a failure between the two would leave a tree that is
      // permanently mis-indented with nothing to notice it: nothing recomputes a
      // depth from the parent chain, because the walk is what stamps it.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE learning_outcomes
              SET outcome_code = $2,
                  outcome_title = $3,
                  outcome_description = $4,
                  outcome_type = $5,
                  parent_outcome_id = $6,
                  sequence_order = $7,
                  level_depth = $8,
                  is_active = coalesce($9, is_active),
                  updated_by = $10,
                  updated_at = now()
            WHERE outcome_id = $1`,
          [
            existing.outcome_id,
            draft.values.outcome_code,
            draft.values.outcome_title,
            draft.values.outcome_description,
            draft.values.outcome_type,
            parentId,
            draft.values.sequence_order,
            parent.depth,
            typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,
            req.session.userId,
          ],
        );

        // Everything under a moved outcome moved with it. The subtree is walked
        // rather than recomputed from each row's own parent, because the walk is
        // the only way to reach rows whose depth is now wrong by the same amount.
        if (shift !== 0) {
          await client.query(
            `WITH RECURSIVE descendants AS (
               SELECT outcome_id FROM learning_outcomes WHERE parent_outcome_id = $1
               UNION ALL
               SELECT child.outcome_id
                 FROM learning_outcomes child
                 JOIN descendants d ON child.parent_outcome_id = d.outcome_id
             )
             UPDATE learning_outcomes
                SET level_depth = level_depth + $2
              WHERE outcome_id IN (SELECT outcome_id FROM descendants)`,
            [existing.outcome_id, shift],
          );
        }

        const plo = await load(client, existing.outcome_id);
        await client.query('COMMIT');
        return res.status(200).json({ plo });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (isDuplicate(error)) return res.status(409).json({ message: REFUSALS.duplicatePloCode });
      return next(error);
    }
  });

  /**
   * Taking one out — the sixth criterion, which is not quite a removal, and one
   * case the ticket does not name.
   *
   * An outcome nothing depends on is deleted and answers 204. One a subject
   * mapping or a CLO points at is switched off instead and answers 200 with the
   * row, so the screen can say which of the two happened rather than guessing.
   * The database decides, through ON DELETE RESTRICT on the tables that
   * reference `(program_id, outcome_id)`, so a third added later is covered on
   * the day it is added.
   *
   * `parent_outcome_id` is RESTRICT too, and that is the case the ticket does
   * not name. Left to `deleteOrDeactivate` it would read as any other
   * reference and a main outcome with ข้อย่อย would be quietly switched off
   * while its children stayed listed underneath - an outcome nobody asked for
   * and nobody would notice. So the children are asked about first, and the
   * answer says what to do instead. Inactive children count: they still hold
   * the foreign key, and a subtree that is switched off is still a subtree.
   *
   * Asking the person to confirm first is the seventh criterion and is the
   * screen's job: there is nothing for a server to confirm against, and a
   * request that arrived is a request that was meant.
   */
  router.delete('/plos/:outcomeId', requireRole(...MAINTAINERS), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.outcomeId);
      if (!existing) return res.status(404).json({ message: REFUSALS.ploNotFound });

      const outcome = await deleteOrDeactivate(pool, {
        remove: async (client) => {
          // Asked on the same client, inside the transaction the DELETE is
          // attempted in, and not before it: asked outside, a ข้อย่อย written
          // in the gap would reach `deleteOrDeactivate` as any other reference
          // and the parent would be switched off with its children still
          // listed underneath - the one thing this guard exists to prevent.
          const { rows } = await client.query(
            `SELECT 1 FROM learning_outcomes WHERE parent_outcome_id = $1 LIMIT 1`,
            [existing.outcome_id],
          );
          if (rows[0]) throw new HasChildren();
          return client.query('DELETE FROM learning_outcomes WHERE outcome_id = $1', [
            existing.outcome_id,
          ]);
        },
        deactivate: (client) =>
          client.query(
            `UPDATE learning_outcomes SET is_active = false, updated_by = $2, updated_at = now()
              WHERE outcome_id = $1`,
            [existing.outcome_id, req.session.userId],
          ),
        load: (client) => load(client, existing.outcome_id),
      });

      if (outcome.deleted) return res.status(204).send();
      if (outcome.missing) return res.status(404).json({ message: REFUSALS.ploNotFound });
      return res.status(200).json({ plo: outcome.row, deactivated: true });
    } catch (error) {
      if (error instanceof HasChildren) {
        return res.status(409).json({ message: REFUSALS.ploHasChildren });
      }
      return next(error);
    }
  });

  return router;
}

module.exports = { ploRoutes };
