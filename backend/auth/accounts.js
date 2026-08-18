'use strict';

/**
 * Who is allowed in, and as what.
 *
 * The rules live here rather than in the route handlers because one of the two
 * ways in cannot be exercised by a test: Google's consent screen is not
 * something a suite can drive, and the delivered system's OAuth callback is
 * therefore the one path where a rule could rot unnoticed. Everything the
 * callback decides - the domain, the account, its status, its grants - it
 * decides by calling `resolveGoogleAccount`, which is a function of the
 * database and an email address and so can be tested directly against the
 * seeded accounts. What is left in the strategy is the part Google owns.
 *
 * The domain rule belongs to the Google path alone. `U_NONKMITL` is an
 * external assessor at `assessor@tabee-review.org` - R010, and the reason the
 * seed carries the account at all - and external assessors sign in with a
 * password. Applying the domain rule to both paths would make the role
 * unusable by construction. The inherited system draws the line in the same
 * place: the check is in config/passport, not in authController.loginUser.
 */

const bcrypt = require('bcrypt');

const { REFUSALS } = require('./refusals');

const KMITL_DOMAIN = '@kmitl.ac.th';

/**
 * Password sign-in is for the two roles that have no KMITL Google account:
 * the central administrator and an external assessor from outside the
 * university. Every other role goes through Google - except in development,
 * where opening it to everyone is what lets an acceptance pass sign in as all
 * eleven seeded accounts without a Google project.
 */
const PASSWORD_ROLES = new Set(['FULL_ADMIN', 'EXT_ASSESSOR']);

/**
 * A cost-10 hash of a random string nobody holds, stood in for the hash of an
 * account that does not exist or has no password set. Its only job is to cost
 * what a real comparison costs.
 */
const ABSENT_PASSWORD = '$2b$10$5reNSYeYldlOdEXXhDM5GOB/lqhlAHfa6Rar1m2Nn1EEPW8x8AIui';

const refuse = (status, reason) => ({ ok: false, status, reason, message: REFUSALS[reason] });

/**
 * The account, by the address it signs in with. Email is unique in `users`,
 * and is what both ways in arrive holding - Google hands back an address, and
 * the password form asks for one.
 */
async function findByEmail(pool, email) {
  const { rows } = await pool.query(
    `SELECT user_id, email, password, status, is_verified,
            title_th, first_name_th, last_name_th,
            title_en, first_name_en, last_name_en,
            department_id, program_id, valid_from, valid_until
     FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Every grant the account holds, most powerful first. Priority ascends with
 * authority - FULL_ADMIN is 1 and EXT_ASSESSOR is 6 - so the head of the list
 * is the grant that decides where the account lands, and `U_MULTI`, who is
 * both a programme committee member and a teacher, arrives on the committee
 * side. The tail is what R003's role picker offers.
 *
 * `is_active` is checked on both the grant and the role: a role switched off
 * centrally should stop granting without anyone having to walk the grants.
 */
async function allRoles(pool, userId) {
  const { rows } = await pool.query(
    `SELECT r.role_id, r.role_name, r.priority, ur.scope_id
     FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
     WHERE ur.user_id = $1 AND ur.is_active AND r.is_active
     ORDER BY r.priority ASC, ur.scope_id ASC`,
    [userId],
  );
  return rows;
}

/**
 * Appended to `user_log`, which is what the activity log is.
 *
 * `db` is anything that answers `query` - the pool, or a client already inside
 * a transaction. Writing the log through the pool from inside a transaction
 * would record work that the enclosing ROLLBACK then undoes, so the caller
 * hands in whichever of the two the entry belongs to.
 */
async function recordActivity(db, userId, activity) {
  await db.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, $2)`, [userId, activity]);
}

/**
 * Whether today falls inside the account's stated window - #11's fourth
 * criterion, and R005's mandatory one.
 *
 * Both ends are optional and an absent end is open, so an ordinary staff
 * account with neither set is inside every window there is. The comparison is
 * by calendar day rather than by instant: 0005 stores dates for the reason
 * written there, and `valid_until` names the last day the account works and
 * not the moment it stops.
 *
 * Which day it is, is asked of Bangkok and not of the host. The window was
 * written by somebody sitting in Thailand and means the day they meant; a
 * server running on UTC would, for the seven hours after midnight here, still
 * be on yesterday and would turn away an assessor on the first morning of
 * their access. The two ends are read by local calendar fields instead,
 * because node-postgres hands a `date` back as local midnight.
 *
 * `today` is a parameter rather than read from the clock, so a test can put
 * the account either side of its window without waiting for a date to pass.
 */
const BANGKOK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const calendarDay = (value) => {
  if (typeof value === 'string') return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

function withinValidity(user, today = BANGKOK.format(new Date())) {
  // `YYYY-MM-DD` compares as a string in the order it compares as a date,
  // which is the whole reason ISO is written biggest-part-first.
  const now = calendarDay(today);
  if (user.valid_from && now < calendarDay(user.valid_from)) return false;
  if (user.valid_until && now > calendarDay(user.valid_until)) return false;
  return true;
}

/**
 * The checks both ways in share, run once the caller has established that the
 * person is who they say they are. A suspended or unverified account is
 * refused by name; an account with no grant is refused distinctly from one
 * that does not exist, because the two need different things done about them
 * and the person reading the message is the one who has to ask.
 *
 * The validity window sits with them because it is the same kind of fact: a
 * true statement about the account that has nothing to do with whether the
 * password was right. Putting it in the password path alone would have left
 * the Google path open, and an external assessor with a KMITL address is not
 * forbidden by anything.
 */
async function admit(pool, user) {
  if (user.status !== 'active') return refuse(403, 'inactive');
  if (!user.is_verified) return refuse(403, 'unverified');
  if (!withinValidity(user)) return refuse(403, 'outsideValidity');

  const roles = await allRoles(pool, user.user_id);
  if (roles.length === 0) return refuse(403, 'noRole');

  return { ok: true, user, role: roles[0], roles };
}

/**
 * The same three account-level facts, for a caller who signed in earlier and
 * is holding a cookie: is the account still active, still verified, still
 * inside its window.
 *
 * `attachRoles` re-reads the grants on every request so a revoked grant stops
 * being honoured at once (#9's fifth criterion). Deactivating an account and
 * an assessor's window running out are the same kind of event, and until #11
 * neither bit until the cookie ran out - up to half an hour of a suspended
 * account still working. This is what closes that, at the cost of one small
 * read per request alongside the grants.
 *
 * Returns a refusal or null, so the caller reads it the way `admit` is read.
 */
async function sessionAdmission(pool, userId) {
  const { rows } = await pool.query(
    `SELECT status, is_verified, valid_from, valid_until FROM users WHERE user_id = $1`,
    [userId],
  );
  const user = rows[0];
  // The account was deleted while its cookie was still good. Told as `unknown`
  // for the same reason sign-in tells it: there is nothing to reactivate.
  if (!user) return refuse(403, 'unknown');
  if (user.status !== 'active') return refuse(403, 'inactive');
  if (!user.is_verified) return refuse(403, 'unverified');
  if (!withinValidity(user)) return refuse(403, 'outsideValidity');
  return null;
}

/** The rules the Google callback applies, minus the part Google owns. */
async function resolveGoogleAccount(pool, email) {
  if (!email?.toLowerCase().endsWith(KMITL_DOMAIN)) return refuse(403, 'domain');

  const user = await findByEmail(pool, email);
  if (!user) return refuse(403, 'unknown');

  return admit(pool, user);
}

/**
 * The rules the password form applies.
 *
 * A missing account and a wrong password give the same answer. The inherited
 * controller distinguished them - "Invalid email" against "Incorrect
 * password" - which turns the form into a way of asking whether an address is
 * registered. Nothing on this path has proved who the caller is yet, so it
 * gets one message; the Google path, where Google has already proved it, is
 * where the specific refusals are worth giving.
 */
async function resolvePasswordAccount(pool, email, password) {
  const user = email ? await findByEmail(pool, email) : null;

  // Compared against a hash either way, so an address that is not registered
  // costs the same as one that is. Without this, the answer arrives in
  // microseconds for an unknown address and in tens of milliseconds for a
  // known one, and the single refusal message above stops being single.
  const matched = password
    ? await bcrypt.compare(password, user?.password || ABSENT_PASSWORD)
    : false;
  if (!user || !matched) return refuse(401, 'credentials');

  const admitted = await admit(pool, user);
  if (!admitted.ok) return admitted;

  // The grant being signed in under, not any grant held. An account holding
  // both EXT_ASSESSOR and PROG_MANAGER lands on the committee - priority 4
  // against 6 - which is a role the rule directs to Google, so its assessor
  // grant must not be what lets it past.
  const development = process.env.NODE_ENV !== 'production';
  if (!development && !PASSWORD_ROLES.has(admitted.role.role_id)) {
    return refuse(403, 'passwordNotAllowed');
  }

  return admitted;
}

/** What the sign-in response says about the person who just signed in. */
const profileOf = (user) => ({
  user_id: user.user_id,
  email: user.email,
  title_th: user.title_th,
  first_name_th: user.first_name_th,
  last_name_th: user.last_name_th,
  title_en: user.title_en,
  first_name_en: user.first_name_en,
  last_name_en: user.last_name_en,
  department_id: user.department_id,
  program_id: user.program_id,
});

module.exports = {
  ABSENT_PASSWORD,
  KMITL_DOMAIN,
  PASSWORD_ROLES,
  findByEmail,
  allRoles,
  withinValidity,
  sessionAdmission,
  recordActivity,
  resolveGoogleAccount,
  resolvePasswordAccount,
  profileOf,
};
