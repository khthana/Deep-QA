'use strict';

/**
 * The reference the database cannot see — #60.
 *
 * Every other thing that points at a programme or a department points at it
 * with a foreign key, and `ON DELETE RESTRICT` is what decides whether the
 * record may be destroyed. `lib/removal` says at length why that is the right
 * way round: a reference added by a later migration is covered on the day it is
 * added, where a hand-written "is anything pointing at this" check silently
 * stops being true.
 *
 * `user_roles.scope_id` is the one reference that cannot be a foreign key. A
 * scope is a faculty, a department or a programme, and which of the three is
 * decided by the role (ADR-0001, ADR-0002) — migration 0001 says so in its own
 * words above the column. So no constraint raises `23503`, the DELETE goes
 * through, and the grant is left naming a record that no table holds.
 *
 * That is why the check here is hand-written, and why it is the only one. It is
 * not an exception to `lib/removal`'s reasoning; it is the case that reasoning
 * does not reach, and it is bounded by the column having no constraint rather
 * than by anybody's memory of a list of tables.
 *
 * Both callers run these on the client of a transaction that also holds the
 * DELETE, because the question and the answer have to be the same moment: a
 * grant issued between a check and a delete would dangle exactly as before.
 */

/**
 * Is anybody holding a role over this scope right now?
 *
 * Active grants only. A revoked grant is a row that stays — `routes/grants`
 * switches `is_active` off rather than deleting, so that the record of who
 * granted it survives the revoke — and counting those would make a programme
 * permanently undeletable from the first grant anybody ever issued over it,
 * which is the cost the ticket names against this option. What happens to the
 * revoked rows is `forgetRevokedGrants` below.
 */
async function isGranted(client, scopeId) {
  // Keyed on the scope alone - no role, no tier. That is not an oversight about
  // the polymorphism: `auth/authorise.js`'s `scopeChain` resolves an identifier
  // against programmes, then departments, then the faculty, in that order, and
  // its docstring says why the seed gives the faculty the code `ENG` rather than
  // a number - *two organisational units sharing a code would be
  // indistinguishable here*. A test asserts that order. So a grant naming this
  // identifier is a grant over this record, by the same premise every
  // authorisation decision in the system already rests on.
  const { rows } = await client.query(
    'SELECT 1 FROM user_roles WHERE scope_id = $1 AND is_active LIMIT 1',
    [scopeId],
  );
  return rows.length > 0;
}

/**
 * Forget the revoked grants over a scope that is about to stop existing.
 *
 * `routes/grants` keeps a revoked row so that who granted it survives, and that
 * is a record about a programme. Once the programme is destroyed there is no
 * programme for it to be about: the row would name an identifier no table
 * holds, which is the second half of #60's acceptance. Nothing reads it either
 * — all five readers of `user_roles` filter `ur.is_active` (`auth/accounts`,
 * `auth/administration`, `routes/grants`, `routes/users`, and `authorise`
 * through the first of them) — so what is dropped here is a row with no reader
 * and no subject.
 *
 * It runs only on the path that destroys the record. A deactivated programme
 * still exists, so its revoked grants still name something and are left alone.
 */
async function forgetRevokedGrants(client, scopeId) {
  await client.query('DELETE FROM user_roles WHERE scope_id = $1 AND NOT is_active', [scopeId]);
}

module.exports = { isGranted, forgetRevokedGrants };
