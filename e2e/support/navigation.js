'use strict';

/**
 * Opening a screen without reading the answer to somebody else's question —
 * #160.
 *
 * Every screen helper in this directory hands a row the response its screen was
 * drawn from, and every one of them used to ask for it the same way:
 *
 * ```js
 * const [response] = await Promise.all([waitForList(page), page.goto(PATH)]);
 * ```
 *
 * The predicate matches a path and a method and nothing else, so it also
 * matches that same call made by the document the `goto` is *replacing* — and
 * `signIn` returns while the landing screen's own list call is still out, so
 * there usually is one. Chromium keeps a response body only until the page
 * navigates away from the document that asked for it, so the row is handed a
 * response it cannot read and dies on `.json()` with a protocol error naming
 * neither this helper nor the navigation. `149a` lost a row to it three times
 * out of three, in a setup step with nothing to do with its subject, and an
 * hour went into believing an unrelated diff had caused it.
 *
 * `teaching-screen.js` used to narrow the window by reading the body eagerly
 * and throwing it away. That is a mitigation, not a fix — it was the one helper
 * that had it and the one helper that still lost — and it is gone: what follows
 * closes the window instead.
 *
 * ## How the outgoing document's calls are told apart
 *
 * By identity, not by time. The fence is the moment the new document
 * **commits** — `framenavigated` on the main frame — and the `Request` objects
 * the page makes after it are collected. A response is accepted only if its
 * request is one of them, so an answer to a question the old document asked is
 * ignored however late it arrives, and the wait goes on to the new document's
 * own call. Nothing is compared against a clock, so nothing here can decide
 * anything by being slow (#52).
 *
 * The commit and not the navigation *request* is the fence, and the difference
 * is the whole of it. A request is sent first and answered later; between the
 * two the outgoing document is still on screen and still able to ask for things,
 * and a fence at the request would collect what it asks. That is a window
 * narrowed, which is what was already here and what already lost. A fence at the
 * commit has nothing on the far side of it but the new document: the old one is
 * gone, and the new one cannot have asked for anything before it existed.
 * `160a`'s second row builds exactly that request, and it is what tells the two
 * fences apart.
 *
 * Each helper keeps the waiter it already had and hands it here instead of
 * racing it against `page.goto` itself; what it is given is a `page` whose
 * `waitForResponse` cannot be answered by the outgoing document.
 *
 * ## And when it is lost anyway
 *
 * The body is read here, once, while the response is certainly still readable,
 * which makes every later `.json()` in the row a cache lookup. If even that
 * fails, it fails with a sentence naming the screen, the call and the race
 * rather than with a protocol error — #160's second half. The message a row
 * dies with is what decides whether the next person spends ten minutes or an
 * afternoon.
 */

/**
 * Goes to `url` and hands back the response the new screen was drawn from.
 *
 * `wait` is the screen's own waiter — the `page => page.waitForResponse(...)`
 * each helper already had, unchanged. It is called once, before the navigation
 * starts, with a `page` that is this file's (see `fence`), so the predicate it
 * holds still says only what its screen reads.
 */
async function openAt(page, url, wait) {
  const asked = new Set();
  let committed = false;

  const onCommit = frame => {
    if (frame === page.mainFrame()) committed = true;
  };
  const onRequest = request => {
    if (committed) asked.add(request);
  };

  page.on('framenavigated', onCommit);
  page.on('request', onRequest);

  try {
    const [response] = await Promise.all([wait(fence(page, asked)), page.goto(url)]);

    await keepBody(response, url);
    return response;
  } finally {
    page.off('request', onRequest);
    page.off('framenavigated', onCommit);
  }
}

/**
 * The page a waiter is handed: everything `page` does, except that
 * `waitForResponse` can only be answered by a request in `asked`.
 *
 * Done this way so that the waiters already in this directory keep their own
 * predicates — each says what its screen reads, and none of them should also
 * have to say which document asked. A waiter calls
 * `page.waitForResponse` and nothing else, but the rest is forwarded rather
 * than withheld: a surrogate missing the method somebody reaches for next would
 * fail in a way that names nothing.
 */
function fence(page, asked) {
  return new Proxy(page, {
    get(target, property) {
      if (property === 'waitForResponse') {
        return (predicate, options) =>
          target.waitForResponse(
            answer => asked.has(answer.request()) && predicate(answer),
            options,
          );
      }
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * Reads the body while it is there, so the row's own read cannot be too late.
 *
 * Playwright caches a body once it has been read, so this is the only read that
 * can race a navigation. A failure here is reported rather than swallowed: the
 * caller's `.json()` would otherwise report the same thing in Chromium's words,
 * which name no helper and no screen. The sentence names the screen and the
 * call, and the stack it is thrown on names the helper that asked — the two
 * together are what the protocol error was missing.
 */
async function keepBody(response, url) {
  try {
    await response.body();
  } catch (cause) {
    throw new Error(
      `opening ${url}: the answer to ${new URL(response.url()).pathname} was gone before it ` +
        'could be read — the page navigated away from the document that asked for it. That ' +
        'response should have been ignored as the outgoing document\'s; see e2e/support/' +
        `navigation.js and #160. Chromium said: ${cause.message}`,
      { cause },
    );
  }
}

module.exports = { openAt };
