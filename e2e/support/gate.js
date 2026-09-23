'use strict';

/**
 * Holds one request at the route until the row lets it go — #142.
 *
 * `page.route` with a timer (`139a`, `140a`) decides which answer lands second
 * by how long the first is held, which is enough when one other thing has to
 * happen meanwhile. A row that has to open a form, press a button and see its
 * write leave before the held answer lands would be racing that timer, so here
 * the row says when: nothing is handed back until `open()` is called.
 *
 * The first request on `path` that `matches` accepts is the one held; every
 * other request on `path` goes on to the next handler. `sent` settles when the
 * held request has reached the route, `answered` once its answer has been handed
 * to the page. The answer is the real one fetched at that moment, or — given
 * `refusal` — a 409 carrying that sentence, so a held write never reaches the
 * database and there is nothing for the row to put back.
 *
 * `success` answers it with a 200 carrying that body instead, for a row about
 * what the screen does *when a write succeeds* and not about what the write
 * wrote — #146. The request is stopped at the route like a refusal is, so such
 * a row writes nothing either; what it costs is that the answer is this file's
 * and not the server's, which is why it is only for rows whose subject is on
 * the screen. Given both, the refusal is what lands: no caller passes both, so
 * a guard here would be a clause no row could reach (#97).
 *
 * A row that never calls `open()` leaves the request at the route until the
 * test times out, so every row that gates a request opens it.
 *
 * ```js
 * const read = await gate(page, /^\/api\/departments\/\d+$/, isGet);
 * // ... press, and do whatever has to happen while it is out ...
 * read.open();
 * await read.answered;
 * ```
 *
 * ## A document is held by `gateNavigation`, not by this
 *
 * This hands the answer over with `route.fulfill`, and a *document* fulfilled
 * that way arrives without an address space of its own: Chromium then treats
 * every call the new page makes to `localhost` as a local-network request and
 * denies it — `Permission was denied for this request to access the loopback
 * address space` — so the screen sees no `/api/me`, decides nobody is signed in
 * and goes back to the sign-in form. Measured while writing `160a`, where it
 * looked for an afternoon like the thing under test. `gateNavigation` below
 * holds a navigation and then lets the browser fetch it itself, which is the
 * only difference that matters.
 */
async function gate(page, path, matches, { refusal = null, success = null } = {}) {
  const on = (url) => path.test(url.pathname);
  const opened = deferred();
  const sent = deferred();
  const answered = deferred();
  const held = { request: null, sent: sent.promise, answered: answered.promise };
  held.open = () => opened.resolve();

  await page.route(on, async (route, request) => {
    if (held.request !== null || !matches(request)) return route.fallback();
    held.request = request;
    sent.resolve(request);
    await opened.promise;
    try {
      if (refusal) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ message: refusal }),
        });
      } else if (success) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(success),
        });
      } else {
        await route.fulfill({ response: await route.fetch() });
      }
    } catch (error) {
      // A row that has already ended - failed, most likely - closed the page;
      // anything else is the answer never reaching it, and `answered` must not
      // say that it did.
      if (page.isClosed()) return;
      answered.reject(error);
      return;
    }
    answered.resolve();
  });
  return held;
}

/**
 * The same hold, for the navigation itself — #160.
 *
 * Holds the first navigation to `path` until `open()`, then `route.continue()`s
 * it, so the document is fetched by the browser and keeps the address space its
 * own later calls are checked against (see above). There is no `answered`: what
 * `continue` hands back goes to the page, not to this file, so a row waits for
 * what the new document does rather than for the document.
 */
async function gateNavigation(page, path) {
  const opened = deferred();
  const sent = deferred();
  const held = { request: null, sent: sent.promise };
  held.open = () => opened.resolve();

  await page.route(
    (url) => path.test(url.pathname),
    async (route, request) => {
      if (held.request !== null || !request.isNavigationRequest()) return route.fallback();
      held.request = request;
      sent.resolve(request);
      await opened.promise;
      await route.continue();
    },
  );
  return held;
}

function deferred() {
  const settle = {};
  settle.promise = new Promise((resolve, reject) => {
    settle.resolve = resolve;
    settle.reject = reject;
  });
  return settle;
}

const isGet = (request) => request.method() === 'GET';
const isWrite = (request) => request.method() !== 'GET';

module.exports = { gate, gateNavigation, isGet, isWrite };
