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
            department_id, program_id
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

/** Appended to `user_log`, which is what the activity log is. */
async function recordActivity(pool, userId, activity) {
  await pool.query(`INSERT INTO user_log (user_id, activity) VALUES ($1, $2)`, [userId, activity]);
}

/**
 * The checks both ways in share, run once the caller has established that the
 * person is who they say they are. A suspended or unverified account is
 * refused by name; an account with no grant is refused distinctly from one
 * that does not exist, because the two need different things done about them
 * and the person reading the message is the one who has to ask.
 */
async function admit(pool, user) {
  if (user.status !== 'active') return refuse(403, 'inactive');
  if (!user.is_verified) return refuse(403, 'unverified');

  const roles = await allRoles(pool, user.user_id);
  if (roles.length === 0) return refuse(403, 'noRole');

  return { ok: true, user, role: roles[0], roles };
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
  recordActivity,
  resolveGoogleAccount,
  resolvePasswordAccount,
  profileOf,
};
