'use strict';

/**
 * แผนการปรับปรุงอย่างต่อเนื่อง — ticket #41.
 *
 * The narrative an accreditation panel reads beside the numbers: what a year's
 * results showed, what the ผู้สอน make of it, what was changed following last
 * year's reflection, and what they intend to do next. Four kinds of sentence
 * about one ผลการเรียนรู้ in one ปีการศึกษา.
 *
 * The grain is ADR-0003's and was ADR-0003's before this ticket existed —
 * `clo_course_cycle_cloplan` is keyed on (subject, program, academic year) in
 * the inherited schema, which is part of why that ADR reads the way it does.
 * So `offeringOf` from #27 is reused whole rather than re-answered here: the
 * Section id in the address is how a Teacher proves they may be here (ADR-0004
 * and ADR-0002 together), and the triple it resolves to is the record's
 * identity. The sixth criterion is that one function, and nothing else.
 *
 * Four things in this file are decisions rather than shape.
 *
 * *The cycle row is created by the first save and never by the read.* The third
 * criterion asks for exactly that, and the reason to put it in the write rather
 * than in the read is that a Teacher who opens the screen, looks, and leaves
 * has not started a cycle — a row saying they did would be a year in the record
 * with nothing in it, which is the shape an accreditation panel reads as an
 * abandoned one. `ON CONFLICT (subject_id, program_id, academic_year)` is what
 * makes the create-on-demand safe when two ผู้สอน of two ตอนเรียน press save at
 * the same second; the constraint covering exactly those three columns is not
 * decoration, and migration 0002 says so at the table.
 *
 * *Last year's entries are matched by `clo_number` and not by `clo_id`.* This
 * is the one thing about this screen that is easy to get wrong and impossible
 * to see once it is wrong. ADR-0003 gives each ปีการศึกษา its own CLO rows, so
 * last year's CLO-4 and this year's CLO-4 are two different `clo_id` values.
 * Joining the reference panel on the id would silently show nothing, for ever,
 * on every รายวิชา — and an empty panel looks exactly like a year nobody wrote
 * anything in. The number is the only handle the two years share.
 *
 * *The year that gets referenced is the most recent earlier year that has
 * entries, not this year minus one.* A รายวิชา is not taught every year, and
 * the fourth criterion asks for "the previous year's entries" so that this
 * year's can be written against them. The previous year with nothing in it is
 * not what that sentence means; it is a gap in the record, and skipping it is
 * what makes the panel useful on the second offering of a subject taught every
 * other year rather than only on the ones taught consecutively.
 *
 * *`reference_academic_year` is written by the server and only on IMPROVEMENT.*
 * docs/02 has that type as การปรับปรุงจากรอบก่อนหน้า — the improvement made
 * following an earlier round — so it is the one of the four that refers to
 * another year, and the year it refers to is the one the screen was showing
 * when it was written. Reading it from the body would be ADR-0002 in the small:
 * the caller would be telling the server which year it had been reading, and
 * the server already knows.
 */

const express = require('express');

const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { offeringOf, cloOf } = require('./clos');

/** The one role these routes open for, spread at the call site as in clos.js. */
const TEACHING = ['TEACHER'];

/**
 * The four sections of the form, in the order they are read in.
 *
 * A constant and not the CHECK constraint's word order: the database stores a
 * set and the form is a sequence, and SUMMARY → REFLECTION → IMPROVEMENT →
 * NEXT_PLAN is the cycle. Alphabetical would open on the improvement and close
 * on the reflection it followed from.
 *
 * It is not sent to the screen. The screen has to hold the four anyway — each
 * needs a heading and a line saying what it is for, and neither is the server's
 * to word — so a list on the wire would be a second copy that nothing compares
 * with the first. What this one decides is the order rows come back in and
 * which values are accepted.
 */
const TYPES = ['SUMMARY', 'REFLECTION', 'IMPROVEMENT', 'NEXT_PLAN'];

/** The type that names an earlier year, and the only one that carries one. */
const REFERRING = 'IMPROVEMENT';

/**
 * What an entry looks like on the screen.
 *
 * `clo_number` travels with every entry rather than only with the CLO list,
 * because the reference panel's entries belong to last year's CLO rows and
 * there is no list on the screen to look them up in.
 */
const ENTRY = `d.clo_course_cycle_detail_id AS entry_id, d.clo_id,
               d.detail_type, d.detail_text, d.reference_academic_year,
               c.clo_number`;

const ENTRY_FROM = `FROM clo_course_cycle_detail_cloplan d
                    JOIN clo_course_cycle_cloplan y
                      ON y.clo_course_cycle_id = d.clo_course_cycle_id
                    JOIN subject_clo c ON c.clo_id = d.clo_id`;

/** Blank, whitespace and absent all mean the same refusal here. */
function text(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * The fields of an entry that the caller owns, and nothing else.
 *
 * `reference_academic_year` is not among them — see the note at the top — and
 * neither is the cycle: a body naming a year or a cycle id is ignored rather
 * than refused, for the reason clos.js ignores `academic_year`.
 */
function readEntry(body) {
  const cloId = body?.clo_id;
  const detailType = body?.detail_type;
  const detailText = text(body?.detail_text);

  if (!TYPES.includes(detailType)) return { ok: false, reason: 'invalidImprovementEntry' };
  if (!detailText) return { ok: false, reason: 'invalidImprovementEntry' };
  if (cloId === undefined || cloId === null || !/^\d+$/.test(String(cloId))) {
    return { ok: false, reason: 'invalidImprovementEntry' };
  }
  return { ok: true, values: { clo_id: cloId, detail_type: detailType, detail_text: detailText } };
}

function improvementPlanRoutes(pool) {
  const router = express.Router();

  /** This Offering's ผลการเรียนรู้, in the order the screen lists them. */
  async function closOf(offering) {
    const { rows } = await pool.query(
      `SELECT clo_id, clo_number, clo_detail
         FROM subject_clo
        WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3
        ORDER BY clo_number ASC, clo_id ASC`,
      [offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows;
  }

  /**
   * The most recent earlier ปีการศึกษา of this รายวิชา that anybody wrote in.
   *
   * `academic_year` is varchar(4) — migration 0002 says why — and every value
   * in it is four digits, so `<` and MAX compare left to right and agree with
   * the arithmetic. A year of a different width would break that quietly, which
   * is the reason the column has a width at all.
   */
  async function referenceYear(offering) {
    const { rows } = await pool.query(
      `SELECT y.academic_year
         FROM clo_course_cycle_cloplan y
        WHERE y.program_id = $1 AND y.subject_id = $2 AND y.academic_year < $3
          AND EXISTS (SELECT 1 FROM clo_course_cycle_detail_cloplan d
                       WHERE d.clo_course_cycle_id = y.clo_course_cycle_id)
        ORDER BY y.academic_year DESC
        LIMIT 1`,
      [offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows[0]?.academic_year ?? null;
  }

  /**
   * Every entry of one ปีการศึกษา of this รายวิชา, in the form's order.
   *
   * `array_position` over the same constant the validator uses, rather than a
   * CASE: a CASE would be a second copy of the order that nothing checks
   * against the first. The ORDER BY is written here and not kept as a fragment
   * beside `ENTRY` and `ENTRY_FROM` — those two are shared with `entryOf`,
   * where `$4` is the academic year, and a shared fragment carrying its own
   * parameter position would mean `$4` naming two different things.
   */
  async function entriesOf(offering, year) {
    const { rows } = await pool.query(
      `SELECT ${ENTRY} ${ENTRY_FROM}
        WHERE y.program_id = $1 AND y.subject_id = $2 AND y.academic_year = $3
        ORDER BY c.clo_number ASC, c.clo_id ASC,
                 array_position($4::text[], d.detail_type) ASC`,
      [offering.program_id, offering.subject_id, year, TYPES],
    );
    return rows;
  }

  /**
   * The cycle row for this year, made if it is not there yet.
   *
   * `DO UPDATE` with a no-op assignment rather than `DO NOTHING`, because
   * `DO NOTHING` returns no row on conflict and the id is the whole point of
   * the statement. The conflict target names the three columns of the unique
   * constraint exactly; anything else raises 42P10.
   */
  async function cycleFor(client, offering) {
    const { rows } = await client.query(
      `INSERT INTO clo_course_cycle_cloplan (program_id, subject_id, academic_year)
       VALUES ($1, $2, $3)
       ON CONFLICT (subject_id, program_id, academic_year)
         DO UPDATE SET academic_year = EXCLUDED.academic_year
       RETURNING clo_course_cycle_id`,
      [offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows[0].clo_course_cycle_id;
  }

  /** One entry by id, if it belongs to this Offering's cycle — the grain again. */
  async function entryOf(offering, entryId) {
    if (!/^\d+$/.test(String(entryId))) return null;
    const { rows } = await pool.query(
      `SELECT ${ENTRY} ${ENTRY_FROM}
        WHERE d.clo_course_cycle_detail_id = $1
          AND y.program_id = $2 AND y.subject_id = $3 AND y.academic_year = $4`,
      [entryId, offering.program_id, offering.subject_id, offering.academic_year],
    );
    return rows[0] ?? null;
  }

  /**
   * Everything the screen draws, in one request — the read half of criteria
   * one, three, four and five.
   *
   * `previous` is null rather than an empty envelope when there is no earlier
   * year to show, so the screen has one thing to test rather than two. #40's
   * walk is the reason that distinction is drawn here at all: a panel that
   * opens onto nothing is a control that answers nothing, and the way to not
   * build one is to give the screen a state to not draw it in.
   */
  router.get(
    '/teaching/sections/:sectionId/improvement-plan',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const year = await referenceYear(offering);

        return res.status(200).json({
          offering,
          clos: await closOf(offering),
          entries: await entriesOf(offering, offering.academic_year),
          previous: year
            ? { academic_year: year, entries: await entriesOf(offering, year) }
            : null,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Writing one — the first and second criteria's write half, and the third.
   *
   * One statement for both, because (cycle, CLO, type) is the key and the form
   * has one box per cell: a person who edits what they wrote is writing the
   * same cell again, and a second endpoint for that would be a second way to
   * arrive at one row. The row's id is not in the address for the same reason —
   * the screen knows the cell before it knows whether anything is in it.
   *
   * Both statements are in one transaction because the first of them may be
   * creating the cycle: a detail insert that fails after the cycle row was
   * committed would leave the empty year the note at the top says not to make.
   */
  router.post(
    '/teaching/sections/:sectionId/improvement-plan/entries',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const draft = readEntry(req.body);
        if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

        // #27's own answer to "is this CLO of this Offering", imported rather
        // than asked again: clos.js exports it for the reason it exports
        // `offeringOf`, which is that two answers to one question drift.
        const clo = await cloOf(pool, offering, draft.values.clo_id);
        if (!clo) return res.status(404).json({ message: REFUSALS.cloNotFound });

        // Read before the write and outside the transaction: it is a question
        // about the years before this one, which the write cannot change.
        const reference =
          draft.values.detail_type === REFERRING ? await referenceYear(offering) : null;

        const client = await pool.connect();
        let entryId;
        try {
          await client.query('BEGIN');
          const cycleId = await cycleFor(client, offering);
          const { rows } = await client.query(
            `INSERT INTO clo_course_cycle_detail_cloplan
               (clo_course_cycle_id, clo_id, detail_type, detail_text, reference_academic_year)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (clo_course_cycle_id, clo_id, detail_type)
               DO UPDATE SET detail_text = EXCLUDED.detail_text,
                             reference_academic_year = EXCLUDED.reference_academic_year
             RETURNING clo_course_cycle_detail_id`,
            [cycleId, clo.clo_id, draft.values.detail_type, draft.values.detail_text, reference],
          );
          entryId = rows[0].clo_course_cycle_detail_id;
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }

        return res.status(200).json({ entry: await entryOf(offering, entryId) });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Removing one — the second criterion's other half.
   *
   * Asking the person to confirm first is the screen's job, as it is for #27's
   * CLO and #23's Offering: there is nothing for a server to confirm against,
   * and a request that arrived is a request that was meant.
   *
   * The cycle row is left behind when its last entry goes. It costs one row and
   * it is what makes deleting the last sentence of a year different from never
   * having written one — the year was opened, and the record of that is the
   * only thing that distinguishes an emptied cycle from an absent one.
   */
  router.delete(
    '/teaching/sections/:sectionId/improvement-plan/entries/:entryId',
    requireRole(...TEACHING),
    async (req, res, next) => {
      try {
        const offering = await offeringOf(pool, req, req.params.sectionId);
        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });

        const existing = await entryOf(offering, req.params.entryId);
        if (!existing) return res.status(404).json({ message: REFUSALS.improvementEntryNotFound });

        await pool.query(
          `DELETE FROM clo_course_cycle_detail_cloplan WHERE clo_course_cycle_detail_id = $1`,
          [existing.entry_id],
        );

        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

module.exports = { improvementPlanRoutes };
