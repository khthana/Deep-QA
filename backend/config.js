'use strict';

/**
 * Values read from the environment that more than one module needs.
 *
 * `FRONTEND_URL` was read in two places with two different silent fallbacks —
 * `http://localhost:5000` for the CORS origin and `''` for the OAuth redirect
 * base. An unset variable therefore produced a CORS policy naming a frontend
 * that is not there *and* a redirect to a relative path on the backend's own
 * host, neither of which announces itself. One definition and one default is
 * the least that can be said for it.
 *
 * The default is the development one rather than a throw, unlike `SECRET_KEY`
 * in auth/session.js: a wrong origin is a visible failure at the first
 * request, where a wrong signing key is a silent one.
 */
const frontendUrl = () => process.env.FRONTEND_URL ?? 'http://localhost:5000';

module.exports = { frontendUrl };
