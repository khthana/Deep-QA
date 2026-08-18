'use strict';

/**
 * User accounts — ticket #11.
 *
 * The Central Admin's whole remit, and the administrators below them within
 * their own part of the university: who exists, what their details are, whether
 * their account works, and - for an external assessor - for how long. Adding
 * one at a time or a spreadsheet at a time.
 *
 * Three rules run through every route here and are worth stating once.
 *
 * *Scope.* An administrator reaches an account when their acting grant covers
 * the account's own scope, which is its programme if it has one and its
 * department otherwise. `coveredScopes` computes that reach as a set and the
 * list filters on it; the single-record routes re-derive it rather than trust
 * that the caller only ever asks for what the list showed them, because the
 * list is a convenience and the guard is the rule (ADR-0002).
 *
 * *Seniority.* An administrator does not see or touch an account more senior
 * than their own acting grant. Without it a department administrator could
 * deactivate the Central Admin, which is a privilege escalation through a door
 * marked "user management" rather than "permissions". The inherited
 * getAllUsersByRolePriority carries the same rule, and it is the one thing in
 * that function worth keeping - it took the role and the scope it filtered by
 * out of the request body, which is the hole ADR-0002 exists to close.
 *
 * *Nothing partially applied.* The import is one transaction. Every row is
 * validated, every failure is collected with the line it is on, and if there is
 * a single failure the transaction rolls back and nothing was written. The
 * inherited departmentController imports the good rows and reports the bad
 * ones, which leaves the person holding a half-imported file and no way to work
 * out what to re-upload.
 *
 * Granting and revoking roles afterwards is #12 and lives in routes/grants.js,
 * which shares the scope and seniority checks below rather than re-deriving
 * them. What is here is the *first* grant, made
 * with the account, because #11's second criterion says a new account can
 * immediately sign in and an account holding no grant is refused at sign-in by
 * name. Creating an account that cannot sign in and calling it done would meet
 * the letter of the route and none of the criterion.
 */

const express = require('express');
const bcrypt = require('bcrypt');

const { PASSWORD_ROLES, onUser, recordActivity } = require('../auth/accounts');
const { requireRole } = require('../auth/authorise');
const { REFUSALS } = require('../auth/refusals');
const { importRows, sendTemplate } = require('../lib/importer');
const { pageOf } = require('../lib/paging');
const {
  ADMIN_ROLES,
  COLUMNS,
  RETURNED,
  OWN_SCOPE,
  SENIORITY,
  GRANTS,
  administration,
} = require('../auth/administration');

/** The same cost #8 signs in against and #10 changes a password with. */
const HASH_ROUNDS = 10;

/** The template's columns, and the fields the import reads from a row. */
const IMPORT_COLUMNS = [
  'user_id',
  'email',
  'title_th',
  'first_name_th',
  'last_name_th',
  'title_en',
  'first_name_en',
  'last_name_en',
  'department_id',
  'program_id',
  'role_id',
  'scope_id',
  'valid_from',
  'valid_until',
  'password',
];

const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);

const blankToNull = (value) => {
  const text = trimmed(value);
  return text === '' || text === undefined ? null : text;
};

/**
 * A date as the form or the spreadsheet stated it, or a refusal.
 *
 * Only ISO `YYYY-MM-DD` is accepted. `new Date('01/03/2026')` is a different
 * day in Bangkok than it is in Boston and neither reading is an error, so a
 * lenient parser here would quietly file an assessor's window against the wrong
 * month rather than say it could not read the date.
 */
function readDate(value) {
  const text = blankToNull(value);
  if (text === null) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false };
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  // Rejects 2026-02-31, which Date rolls forward into March without complaint.
  if (parsed.toISOString().slice(0, 10) !== text) return { ok: false };
  return { ok: true, value: text };
}

/**
 * One account's worth of fields, from a form or from a spreadsheet row.
 *
 * The two are read by the same function on purpose. A rule the form enforces
 * and the import does not is a rule with a way around it, and the import is how
 * people put a hundred accounts in at once - which is exactly the moment nobody
 * is checking them one by one.
 */
function readAccount(source, { editing = false } = {}) {
  const values = {
    user_id: blankToNull(source.user_id),
    email: blankToNull(source.email),
    title_th: blankToNull(source.title_th),
    first_name_th: blankToNull(source.first_name_th),
    last_name_th: blankToNull(source.last_name_th),
    title_en: blankToNull(source.title_en),
    first_name_en: blankToNull(source.first_name_en),
    last_name_en: blankToNull(source.last_name_en),
    department_id: blankToNull(source.department_id),
    program_id: blankToNull(source.program_id),
    password: blankToNull(source.password),
  };

  if (!values.user_id || !values.email) return { ok: false, reason: 'invalidUser' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    return { ok: false, reason: 'invalidUser' };
  }
  if (!values.first_name_th && !values.first_name_en) {
    return { ok: false, reason: 'invalidUser' };
  }
  // 0001's widths, enforced here so an over-long identifier comes back as a
  // sentence rather than as a 22001 the error handler turns into "something
  // went wrong in the system".
  if (values.user_id.length > 20 || values.email.length > 100) {
    return { ok: false, reason: 'invalidUser' };
  }

  const from = readDate(source.valid_from);
  const until = readDate(source.valid_until);
  if (!from.ok || !until.ok) return { ok: false, reason: 'invalidValidity' };
  if (from.value && until.value && from.value > until.value) {
    return { ok: false, reason: 'invalidValidity' };
  }
  values.valid_from = from.value;
  values.valid_until = until.value;

  const roleId = blankToNull(source.role_id) ?? blankToNull(source.role?.role_id);
  const scopeId = blankToNull(source.scope_id) ?? blankToNull(source.role?.scope_id);
  // On an edit the grants are not this ticket's to touch - #12 owns them - so a
  // role named in an edit body is ignored rather than half-applied.
  const role = editing || !roleId ? null : { role_id: roleId, scope_id: scopeId };

  // The Central Admin and the external assessor sign in with a password;
  // everybody else is sent to Google, which refuses any address outside
  // @kmitl.ac.th. So one of those two created without a password has no way in
  // at all, and an account that cannot sign in is not the account the second
  // criterion asks for.
  if (role && PASSWORD_ROLES.has(role.role_id) && !values.password) {
    return { ok: false, reason: 'passwordRequired' };
  }

  return { ok: true, values, role };
}

/**
 * A refusal the caller can act on, for the write failures that are the caller's
 * mistake rather than the server's.
 *
 * 23505 is a duplicate - the address or the identifier is already in use - 23503
 * is a department or programme that does not exist, and 23514 is 0005's window
 * constraint. Everything else throws on to the error handler, which is where an
 * unexpected failure belongs.
 */
function writeRefusal(error) {
  if (error.code === '23505') {
    const email = String(error.constraint ?? '').includes('email');
    return { status: 409, reason: email ? 'duplicateEmail' : 'duplicateUserId' };
  }
  if (error.code === '23503') return { status: 400, reason: 'invalidUser' };
  if (error.code === '23514') return { status: 400, reason: 'invalidValidity' };
  return null;
}

/**
 * Writes the account and its first grant on the client it is handed, so the
 * caller owns the transaction. Both writes or neither: an account created
 * without its grant is one that cannot sign in, which is the state #11's second
 * criterion rules out.
 */
async function insertAccount(client, values, role, actorId) {
  try {
    const password = values.password ? await bcrypt.hash(values.password, HASH_ROUNDS) : null;
    const { rows } = await client.query(
      `INSERT INTO users (user_id, email, title_th, first_name_th, last_name_th,
                          title_en, first_name_en, last_name_en,
                          department_id, program_id, password,
                          valid_from, valid_until, is_verified, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, 'active')
    RETURNING ${RETURNED}`,
      [
        values.user_id,
        values.email,
        values.title_th,
        values.first_name_th,
        values.last_name_th,
        values.title_en,
        values.first_name_en,
        values.last_name_en,
        values.department_id,
        values.program_id,
        password,
        values.valid_from,
        values.valid_until,
      ],
    );

    await client.query(
      `INSERT INTO user_roles (user_id, role_id, scope_id, assigned_by)
       VALUES ($1, $2, $3, $4)`,
      [rows[0].user_id, role.role_id, role.scope_id, actorId],
    );

    return { ok: true, user: rows[0] };
  } catch (error) {
    const refusal = writeRefusal(error);
    if (!refusal) throw error;
    // The failed statement has poisoned the transaction, so the caller cannot
    // go on writing on this client. Every path that reads this rolls back.
    return { ok: false, status: refusal.status, reason: refusal.reason };
  }
}

function userRoutes(pool) {
  const router = express.Router();
  const { reachOf, reachable, assignable, placeAllowed } = administration(pool);

  // --- the list ------------------------------------------------------------

  /**
   * The first criterion: filterable, and paginating beyond ten rows.
   *
   * `total` is the count before the page is taken, which is what a pager needs
   * and what a client counting the rows it received cannot work out.
   */
  router.get('/users', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const { scopes, priority } = await reachOf(req);

      const { page, perPage, offset } = pageOf(req);

      // Each filter is optional and absent means no restriction, which is why
      // every one is written as `$n IS NULL OR ...` rather than by assembling
      // the SQL from whichever were sent. A query built by concatenating
      // request values is how the inherited controllers got their injection
      // surface, and a WHERE clause is exactly where it showed.
      const search = blankToNull(req.query.q);
      const status = blankToNull(req.query.status);
      const role = blankToNull(req.query.role);

      const where = `
         WHERE ($1::text[] IS NULL OR ${OWN_SCOPE} = ANY($1))
           AND COALESCE(${SENIORITY}, 99) >= $2
           AND ($3::text IS NULL
                OR u.email ILIKE '%' || $3 || '%'
                OR u.user_id ILIKE '%' || $3 || '%'
                OR COALESCE(u.first_name_th, '') || ' ' || COALESCE(u.last_name_th, '')
                     ILIKE '%' || $3 || '%'
                OR COALESCE(u.first_name_en, '') || ' ' || COALESCE(u.last_name_en, '')
                     ILIKE '%' || $3 || '%')
           AND ($4::text IS NULL OR u.status::text = $4)
           AND ($5::text IS NULL OR EXISTS (
                 SELECT 1 FROM user_roles ur
                  WHERE ur.user_id = u.user_id AND ur.is_active AND ur.role_id = $5))`;

      const params = [scopes, priority, search, status, role];

      const counted = await pool.query(
        `SELECT count(*)::int AS total FROM users u ${where}`,
        params,
      );

      const { rows } = await pool.query(
        `SELECT ${COLUMNS}, ${GRANTS} AS roles
           FROM users u ${where}
          ORDER BY u.email ASC
          LIMIT $6 OFFSET $7`,
        [...params, perPage, offset],
      );

      return res.status(200).json({
        users: rows,
        total: counted.rows[0].total,
        page,
        per_page: perPage,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * The import template — the fifth criterion, and the first half of the
   * pattern every import screen in this system follows.
   *
   * Declared before `/users/:userId` because Express matches in order and the
   * parameter would otherwise swallow the word.
   */
  router.get('/users/import-template', requireRole(...ADMIN_ROLES), (req, res) =>
    // The example row matters most here for the date format - the field a
    // person is most likely to get wrong and the one this system is strictest
    // about.
    sendTemplate(res, 'users-template.csv', IMPORT_COLUMNS, {
      user_id: '66010001',
      email: 'somchai.ja@kmitl.ac.th',
      title_th: 'นาย',
      first_name_th: 'สมชาย',
      last_name_th: 'ใจดี',
      title_en: 'Mr.',
      first_name_en: 'Somchai',
      last_name_en: 'Jaidee',
      department_id: '05',
      program_id: '',
      role_id: 'TEACHER',
      scope_id: '05',
      valid_from: '',
      valid_until: '',
      password: '',
    }));

  router.get('/users/:userId', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const user = await reachable(req, req.params.userId);
      if (!user) return res.status(404).json({ message: REFUSALS.userNotFound });
      return res.status(200).json({ user });
    } catch (error) {
      return next(error);
    }
  });

  // --- creating and editing ------------------------------------------------

  /**
   * Add one account — the second criterion, and the fourth when a window is
   * given.
   *
   * `is_verified` is set true. The column exists for the self-registration
   * flow, where somebody claims an address and has to prove they hold it; an
   * account an administrator typed in has already been vouched for by the
   * administrator, and leaving it false would mean every created account was
   * refused at sign-in with "not yet verified" - the second criterion failing
   * while every row of the table looked right.
   */
  router.post('/users', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    const client = await pool.connect();
    try {
      const draft = readAccount(req.body ?? {});
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const { values, role } = draft;
      // No grant, no sign-in. The criterion asks for an account that works, and
      // #12 is where a *second* grant is added rather than where the first one
      // finally arrives.
      if (!role) return res.status(400).json({ message: REFUSALS.invalidUser });

      if (!(await placeAllowed(req, values.department_id, values.program_id))) {
        return res.status(403).json({ message: REFUSALS.scopeNotYours });
      }
      const refusal = await assignable(req, role.role_id, role.scope_id);
      if (refusal) return res.status(403).json({ message: REFUSALS[refusal] });

      await client.query('BEGIN');
      const created = await insertAccount(client, values, role, req.auth.userId);
      if (!created.ok) {
        await client.query('ROLLBACK');
        return res.status(created.status).json({ message: REFUSALS[created.reason] });
      }
      await recordActivity(client, req.auth.userId, 'CREATE_USER', onUser(created.user.user_id));
      await client.query('COMMIT');

      return res.status(201).json({ user: created.user });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
  });

  /** Edit an account's details, including an assessor's window. */
  router.put('/users/:userId', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const existing = await reachable(req, req.params.userId);
      if (!existing) return res.status(404).json({ message: REFUSALS.userNotFound });

      const draft = readAccount({ ...req.body, user_id: existing.user_id }, { editing: true });
      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });

      const { values } = draft;
      if (!(await placeAllowed(req, values.department_id, values.program_id))) {
        return res.status(403).json({ message: REFUSALS.scopeNotYours });
      }

      const { rows } = await pool.query(
        `UPDATE users SET email = $2,
                title_th = $3, first_name_th = $4, last_name_th = $5,
                title_en = $6, first_name_en = $7, last_name_en = $8,
                department_id = $9, program_id = $10,
                valid_from = $11, valid_until = $12,
                updated_at = now()
          WHERE user_id = $1
      RETURNING ${RETURNED}`,
        [
          existing.user_id,
          values.email,
          values.title_th,
          values.first_name_th,
          values.last_name_th,
          values.title_en,
          values.first_name_en,
          values.last_name_en,
          values.department_id,
          values.program_id,
          values.valid_from,
          values.valid_until,
        ],
      );
      await recordActivity(pool, req.auth.userId, 'UPDATE_USER', onUser(existing.user_id));
      return res.status(200).json({ user: rows[0] });
    } catch (error) {
      const refusal = writeRefusal(error);
      if (refusal) return res.status(refusal.status).json({ message: REFUSALS[refusal.reason] });
      return next(error);
    }
  });

  /**
   * Deactivate or reactivate — the third criterion.
   *
   * A separate route from the edit above, because it is a separate decision.
   * Folding it into the details form is how an account gets suspended by
   * somebody who meant to correct a surname, and it is also why this is the one
   * field the import cannot set.
   *
   * Nobody may do it to themselves. The Central Admin locking themselves out is
   * unrecoverable without a database console, and there is no reading of the
   * criterion under which it is a feature.
   */
  router.put('/users/:userId/status', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const status = trimmed(req.body?.status);
      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ message: REFUSALS.invalidUser });
      }
      if (req.params.userId === req.auth.userId) {
        return res.status(403).json({ message: REFUSALS.forbidden });
      }

      const existing = await reachable(req, req.params.userId);
      if (!existing) return res.status(404).json({ message: REFUSALS.userNotFound });

      const { rows } = await pool.query(
        `UPDATE users SET status = $2::status_enum, updated_at = now()
          WHERE user_id = $1
      RETURNING user_id, email, status`,
        [existing.user_id, status],
      );
      // Twenty characters is what user_log.activity holds, so the two states
      // share one verb rather than being told apart by a longer word.
      await recordActivity(pool, req.auth.userId, 'SET_USER_STATUS', onUser(existing.user_id));
      return res.status(200).json({ user: rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  // --- the import ----------------------------------------------------------

  /**
   * The sixth and seventh criteria: every row, or none of them.
   *
   * All of the mechanism - every row or none, the per-row savepoint, the
   * duplicates within the file, the report sorted by line - is `lib/importer`
   * and is shared with every other import screen (#14). What is left here is
   * the four things that are about accounts and nothing else: what makes a row
   * readable, which two columns must not repeat, which scopes and grants this
   * administrator may use, and what writing one row means.
   *
   * The body arrives as `text/csv` and not as a multipart upload. A file input
   * in the browser can read its file and post the text, which is the whole of
   * what multipart would have bought, and this way there is no upload
   * middleware, no temporary file written to disk, and nothing to clean up
   * after a request that failed.
   */
  router.post('/users/import', requireRole(...ADMIN_ROLES), async (req, res, next) => {
    try {
      const result = await importRows(pool, req.body, {
        readRow: (record) => {
          const draft = readAccount(record);
          if (!draft.ok) return draft;
          // `readAccount` reports a missing or unknown role by leaving `role`
          // null rather than by refusing, because the single-account route
          // wants the values either way.
          if (!draft.role) return { ok: false, reason: 'invalidUser' };
          return { ok: true, draft: { values: draft.values, role: draft.role } };
        },
        keys: [
          { of: (d) => d.values.user_id, message: REFUSALS.duplicateUserId },
          { of: (d) => d.values.email.toLowerCase(), message: REFUSALS.duplicateEmail },
        ],
        verify: async ({ values, role }) => {
          if (!(await placeAllowed(req, values.department_id, values.program_id))) {
            return 'scopeNotYours';
          }
          return assignable(req, role.role_id, role.scope_id);
        },
        insert: async (client, { values, role }) => {
          const written = await insertAccount(client, values, role, req.auth.userId);
          return written.ok ? { ok: true, row: written.user } : written;
        },
        // One line for the upload rather than one per account. Migration 0006
        // says why it names no target.
        onCommit: (client) => recordActivity(client, req.auth.userId, 'IMPORT_USERS'),
      });

      if (result.empty) {
        return res.status(400).json({ message: REFUSALS.importEmpty, errors: [], created: 0 });
      }
      if (!result.ok) {
        return res
          .status(400)
          .json({ message: REFUSALS.importRejected, errors: result.errors, created: 0 });
      }
      return res
        .status(201)
        .json({ created: result.created.length, users: result.created, errors: [] });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { userRoutes, IMPORT_COLUMNS };
