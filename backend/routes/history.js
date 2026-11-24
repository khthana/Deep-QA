'use strict';

/**
 * User activity history — ticket #13.
 *
 * **Since #305 (24 November 2569) this header describes the first route only.**
 * The screen no longer opens a person: it reads `GET /history`, one table of
 * every account's lines, and no screen asks the per-account route below any
 * more. That route's scope is `reachable`'s, as written here; the new route
 * cannot ask `reachable` - there is no one account to ask about - so it puts
 * `GET /users`' own scope fragments in its `WHERE`, which its docblock says
 * why. Read the paragraphs below as #13's, dated (#54).
 *
 * An administrator opens a person and reads what that account has done, so
 * that "who saw or changed this" has an answer. The rows are already being
 * written: every ticket from #8 onwards calls `recordActivity` at the point it
 * changes something, and this is the first thing to read them back.
 *
 * Two rules govern the route and both are borrowed rather than restated.
 *
 * The scope restriction is `reachable`, the same door `GET /users/:userId` and
 * every grant route go through. ADR-0002 puts authorisation on the server and
 * in one place; a history route that decided for itself who may be read would
 * be a second opinion about the same question, and the one that drifts is
 * always the copy. Out of scope and does not exist are the same 404 for the
 * same reason they are there: a route that distinguished them is a route for
 * discovering which colleagues exist.
 *
 * The paging is `GET /users`' shape - `count(*)` before the page is taken, and
 * `{ total, page, per_page }` beside the rows - because the pager on the screen
 * is the same pager and a second convention would be a second thing to get
 * right.
 *
 * What is *not* here: a filter by activity, and any writing. The ticket asks
 * for a reader. The eleven activity codes are written where the actions happen,
 * which is the only place that knows one happened; a route recording that
 * somebody read a screen would be a decision about audit policy, and that
 * decision was made - reads are not logged (see docs/acceptance/13).
 *
 * An entry now also carries the record it was written about, and the entry the
 * route reads out is still the acting account's: what this person did, not what
 * was done to them. Migration 0006 says why.
 *
 * The route, this module and the screen are all named *history* and never
 * *activity*, because CONTEXT.md already binds **Activity** to a piece of
 * assessed work within a Section. The column keeps its inherited name -
 * renaming it is a migration, not a ticket - so `activity` appears below as a
 * field and nowhere as a concept. The glossary entry is **Activity log entry**.
 */

const express = require('express');

const { ADMIN_ROLES, OWN_SCOPE, SENIORITY, administration } = require('../auth/administration');
const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { pageOf } = require('../lib/paging');
const { searchOf } = require('../lib/search');

/** What an entry is, as this file reads it out - actor, action, object, when. */
const ENTRY = 'l.id, l.user_id, l.activity, l.target_kind, l.target_id, l.time_stamp';

/**
 * Who acted, by name - #305's table names the account where #13's panel had one
 * open. The English names too, because the screen reads a person by
 * `personName`, whose fallback for an account with no Thai name is them.
 */
const ACTOR = 'u.title_th, u.first_name_th, u.last_name_th, u.first_name_en, u.last_name_en';

/**
 * The name of the record an entry is about, where that record is a department
 * or a programme and still exists - #294.
 *
 * The owner answered on 20 November 2569 that the history names an
 * organisation unit rather than drawing its code, and that a unit deleted since
 * keeps the code, which is then the only thing left that says what it was.
 * Only those two kinds: a subject, a student and an account keep their codes
 * everywhere (rule 1 of #294), so they are not looked up at all.
 *
 * `target_id` is no foreign key (migration 0006), and a department and a
 * programme can share an id, so **the `CASE` on the entry's own kind is what
 * names it** - an entry about one must not be named after the other (#60,
 * #231). The joins are on each table's primary key and so add no rows; they
 * carry no kind of their own, because a guard there would be a second copy of
 * the `CASE`'s opinion that no mutant could tell apart from it (#97). A
 * `COALESCE` over the two names would be the kind-blind reading, and
 * `history.test.js`'s twin department is what it fails.
 */
const TARGET_NAME = `CASE l.target_kind
                       WHEN 'DEPARTMENT' THEN td.department_name_th
                       WHEN 'PROGRAM' THEN tp.program_name_th
                     END AS target_name`;
const TARGET_JOINS = `LEFT JOIN departments td ON td.department_id = l.target_id
                      LEFT JOIN programs tp ON tp.program_id = l.target_id`;

function historyRoutes(pool) {
  const router = express.Router();
  const { reachOf, reachable } = administration(pool);

  /**
   * One account's history, newest first, a page at a time.
   *
   * `time_stamp` is a timestamptz and is sent as the instant it is, not as a
   * formatted string. The Bangkok reading the second criterion asks for is the
   * screen's job: the server has no business guessing which clock the reader
   * is on, and an instant is the one form that cannot be misread as another.
   */
  router.get('/users/:userId/history', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const target = await reachable(req, req.params.userId);
      if (!target) return res.status(404).json({ message: REFUSALS.userNotFound });

      const { page, perPage, offset } = pageOf(req);

      const counted = await pool.query(
        'SELECT count(*)::int AS total FROM user_log WHERE user_id = $1',
        [target.user_id],
      );

      // `id` breaks the tie, and it has to. The timestamp is not unique - the
      // migration's own comment says the same person can do the same thing
      // twice in the same microsecond - so ordering by it alone lets two rows
      // swap places between the request for page one and the request for page
      // two, and then one of them is read twice and the other never. `id` is
      // the identity column, so newest-first by it agrees with the timestamp
      // wherever the timestamps differ at all.
      const { rows } = await pool.query(
        `SELECT ${ENTRY}, ${TARGET_NAME} FROM user_log l
          ${TARGET_JOINS}
          WHERE l.user_id = $1
          ORDER BY l.time_stamp DESC, l.id DESC LIMIT $2 OFFSET $3`,
        [target.user_id, perPage, offset],
      );

      return res.status(200).json({
        entries: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Every account's history in one table, newest first - #305.
   *
   * The owner's answer of 22 November 2569 (`docs/users-screen.md` rule 11)
   * put back the delivered screen's one table of everybody's lines
   * (`userLogs.js`), with the record each line was about kept from #13 - so
   * the table can say who suspended whom. The delivered route read the whole
   * log and filtered and paged it in the browser; this one does both here.
   *
   * **The scope is `reachable`'s rule, written into the query** - the acting
   * account's own place against what the grant covers, and its seniority
   * against the grant's - because a line is readable exactly when its account
   * is (ADR-0002), and because it has to be decided **before** the page is
   * taken: filtered afterwards, `total` would count lines nobody is shown and
   * the pager would offer pages of them. The two clauses are `GET /users`'
   * own, copied from `administration.js`' fragments rather than restated.
   *
   * **The search** is the accounts list's - the acting account's id, email and
   * two names, `%` and `_` read as themselves (`searchOf`, #272) - plus the
   * record's own id, so typing an account's id finds what was done *to* it as
   * well as what it did, which is the question the ทำกับข้อมูล column is kept
   * for. The activity's Thai wording is the screen's (`historyEntry.js`) and
   * the server does not know it, so a search by activity is not offered: the
   * implementer's choice, written on the sheet.
   */
  router.get('/history', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const { scopes, priority } = await reachOf(req);
      const { page, perPage, offset } = pageOf(req);
      const search = searchOf(req);

      const where = `
         WHERE ($1::text[] IS NULL OR ${OWN_SCOPE} = ANY($1))
           AND COALESCE(${SENIORITY}, 99) >= $2
           AND ($3::text IS NULL
                OR u.email ILIKE '%' || $3 || '%'
                OR u.user_id ILIKE '%' || $3 || '%'
                OR l.target_id ILIKE '%' || $3 || '%'
                OR COALESCE(u.first_name_th, '') || ' ' || COALESCE(u.last_name_th, '')
                     ILIKE '%' || $3 || '%'
                OR COALESCE(u.first_name_en, '') || ' ' || COALESCE(u.last_name_en, '')
                     ILIKE '%' || $3 || '%')`;
      const params = [scopes, priority, search];

      const counted = await pool.query(
        `SELECT count(*)::int AS total
           FROM user_log l JOIN users u ON u.user_id = l.user_id ${where}`,
        params,
      );

      // Newest first, `id` breaking the tie for the per-account route's reason
      // above, and the same order so the two tables never disagree about it.
      const { rows } = await pool.query(
        `SELECT ${ENTRY}, ${ACTOR}, ${TARGET_NAME}
           FROM user_log l JOIN users u ON u.user_id = l.user_id
           ${TARGET_JOINS} ${where}
          ORDER BY l.time_stamp DESC, l.id DESC LIMIT $4 OFFSET $5`,
        [...params, perPage, offset],
      );

      const { total } = counted.rows[0];
      return res.status(200).json({ entries: rows, total, page, per_page: perPage });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { historyRoutes };
