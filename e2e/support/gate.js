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
 * A row that never calls `open()` leaves the request at the route until the
 * test times out, so every row that gates a request opens it.
 *
 * ```js
 * const read = await gate(page, /^\/api\/departments\/\d+$/, isGet);
 * // ... press, and do whatever has to happen while it is out ...
 * read.open();
 * await read.answered;
 * ```
 */
async function gate(page, path, matches, { refusal = null } = {}) {
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

module.exports = { gate, isGet, isWrite };
