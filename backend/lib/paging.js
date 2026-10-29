'use strict';

/**
 * Which page of a list was asked for, and how many rows on it.
 *
 * Ten rows is the number the tickets name - #11's first criterion, #13's third,
 * #14's fourth - so it is the default everywhere and is written once here
 * rather than in each route that pages. The ceiling is what stops `per_page` on
 * a query string from being a way to ask the server for the whole table in one
 * request.
 *
 * Anything unreadable falls back to the default rather than refusing. A page
 * number is navigation, not data: a client that sends `page=abc` gets the first
 * page, which is what the person in front of it wanted, and nothing is written
 * either way.
 *
 * ## A page past the last one is answered, not refused (29 October 2569, #240)
 *
 * `page` has a floor of 1 and no ceiling, so a request for a page past the end
 * is a well-formed request, and the answer is an empty list carrying the `page`
 * that was asked for beside the `total` it is past. The owner chose that on
 * 29 October 2569 (#240, split out of #222) over a server-side ceiling and over
 * a 400/404, and the two prices that decided it are not where the ticket put
 * them:
 *
 * - **A ceiling cannot live here.** `pageOf` runs before the count, so it does
 *   not know the last page; clamping would have to be written at each of the 11
 *   sites in 11 route files that build a paged body, because `total` is counted
 *   there and there is no shared responder - counted on 29 October 2569 by
 *   `pageOf(req)`, which eleven route files call once each.
 * - **A refusal would carry `total` only in a shape one report uses.** That
 *   number is what the screens correct themselves with - the owner's answer to
 *   #209 on 19 October 2569 is that the answer of the read says how many pages
 *   there are and the screen hands the person to the last one that exists, and
 *   #239 took it to the mount points that were left
 *   (`frontend/scripts/pager-last-page.js` reads `corrected 8 · marked 3 ·
 *   unclassified 0` on 29 October 2569). `frontend/src/api/client.js` builds
 *   `ApiError` from a status, a message and a reason, and then hangs
 *   `error.details = payload.errors ?? null` on it for the per-row import
 *   report - so a refusal *can* carry a body, by a mechanism this repo has
 *   already chosen (#196). What option ข costs is therefore not that `total`
 *   cannot be sent: it is a second shape for the one number eight screens read,
 *   each of those screens reading it out of a refusal rather than out of an
 *   answer, and a new `REFUSALS` key with every site that turns a reason into a
 *   sentence (#125). The first draft of this paragraph said a refusal carries no
 *   body at all, which the review of 29 October 2569 refuted at
 *   `client.js:218` - a cost line is a claim like any other (#77).
 *
 * The claim is held at the HTTP seam by `backend/test/history.test.js`, row
 * *and a page past the end is empty rather than an error*, which asserts that
 * the page asked for comes back as asked rather than clamped;
 * `mutation/240-the-page-past-the-last-one.py` runs the two options the owner
 * declined, which is what makes a decision something the suite holds (#48).
 *
 * **What expires this reason.** It rests on *every caller of a paged route is a
 * screen*, measured on 29 October 2569: twelve files under `frontend/src` ask
 * for a page and all of them are screens or panels, `pages/UserHistory.js`
 * among them asking `page: 1` for a picker, which cannot go past the end; no
 * script, report or export reads one (`backend/lib/csv.js` is import-side). The
 * day a caller is not a screen - a script, a report, an export, an outside
 * integration - it gets an empty list with nothing saying the page was past the
 * end, and the rule that would have told it lives in each screen's own `load`
 * and not here.
 *
 * **And the remedy, written beside the condition rather than left as *revisit
 * this* (#242).** What such a caller needs is the answer *saying* the page is
 * past the end - a field beside `total` - which is neither a ceiling nor a
 * refusal, so it leaves this decision and the screens' own correction standing.
 * It is not written today because it buys the person at a screen nothing and
 * costs those same 11 sites.
 */

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const pageOf = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(req.query.per_page, 10) || PAGE_SIZE),
  );
  return { page, perPage, offset: (page - 1) * perPage };
};

module.exports = { PAGE_SIZE, MAX_PAGE_SIZE, pageOf };
