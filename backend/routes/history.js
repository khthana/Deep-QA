'use strict';

/**
 * User activity history — ticket #13.
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
 * somebody read a screen would be a decision about audit policy, and the log
 * holds no such rows today (see docs/acceptance/13).
 *
 * The route, this module and the screen are all named *history* and never
 * *activity*, because CONTEXT.md already binds **Activity** to a piece of
 * assessed work within a Section. The column keeps its inherited name -
 * renaming it is a migration, not a ticket - so `activity` appears below as a
 * field and nowhere as a concept. The glossary entry is **Activity log entry**.
 */

const express = require('express');

const { ADMIN_ROLES, administration } = require('../auth/administration');
const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/** What an entry is, as this file reads it out. */
const ENTRY = 'id, user_id, activity, time_stamp';

function historyRoutes(pool) {
  const router = express.Router();
  const { reachable } = administration(pool);

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

      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const perPage = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Number.parseInt(req.query.per_page, 10) || PAGE_SIZE),
      );

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
        `SELECT ${ENTRY} FROM user_log WHERE user_id = $1
          ORDER BY time_stamp DESC, id DESC LIMIT $2 OFFSET $3`,
        [target.user_id, perPage, (page - 1) * perPage],
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

  return router;
}

module.exports = { historyRoutes };
