/**
 * Addresses outside this application.
 *
 * There is one, and it was written out twice — `Navbar.js` and `SelectApp.js`
 * both carried `https://portfolio.deep-core.net/teacher` as a literal. That is
 * entry 6 of `docs/acceptance/10-application-shell.md`'s open list, parked on
 * #50 because both sites are sign-in-adjacent screens.
 *
 * Two copies of a production hostname is the smaller half of the problem. The
 * larger is that a value which differs per environment had no way to differ:
 * the two applications are deployed together, and a staging DEEP-QA pointed
 * every "go to the portfolio" control at the live one. `REACT_APP_API_URL`
 * already had the shape this needed.
 *
 * The default is the production address rather than a throw, for the reason
 * `backend/config.js` gives about `FRONTEND_URL`: a wrong destination announces
 * itself the first time somebody follows it, and a build that refuses to start
 * because an optional link is unset is worse than the link it protects.
 *
 * `||` rather than `??`, and the difference is not academic here: both
 * `.env.example` files ship this variable *set*, so the way an operator turns
 * it off is to blank it — and `??` accepts `''` as a value, which would make
 * every "go to Deep Portfolio" control navigate to the page it is already on.
 * This repository ships empty-string environment values on purpose elsewhere
 * (`e2e/playwright.config.js` pins `GOOGLE_CLIENT_ID: ''`), so an empty value
 * is a real state and not a typo. Unset and blank should mean the same thing.
 */
export const PORTFOLIO_URL =
  process.env.REACT_APP_PORTFOLIO_URL || 'https://portfolio.deep-core.net/teacher'
