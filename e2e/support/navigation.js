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
 * By identity, not by time. The fence is the moment a new document
 * **commits**, and the `Request` objects the page makes after it are collected.
 * A response is accepted only if its request is one of them, so an answer to a
 * question the old document asked is ignored however late it arrives, and the
 * wait goes on to the new document's own call. Nothing is compared against a
 * clock, so nothing here can decide anything by being slow (#52).
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
 * ## The commit is asked of the protocol, not of Playwright — #168
 *
 * `page.on('framenavigated')` is not the commit of a document. Playwright
 * reports `history.pushState` and `history.replaceState` through that same
 * event, and the screens here do it constantly — the landing hop (#120), and
 * every screen that writes its state into the address. So the fence opened on a
 * navigation that had fetched nothing, **before the document the `goto` asked
 * for existed**, and the questions the outgoing document asked after that were
 * collected as the new document's: the one thing this file exists to refuse,
 * done by the guard itself. `105a` died of it in the full run of 27 September,
 * and the census taken before the fix says it was not rare — in **389 of 621**
 * windows the first `framenavigated` was one of these, with two to six of the
 * outgoing document's requests collected behind it.
 *
 * Chromium names the two apart — `Page.frameNavigated` is a document commit and
 * `Page.navigatedWithinDocument` is not one — and Playwright folds both into the
 * one event. So the fence is the protocol event, taken from a CDP session of
 * this call's own. That makes this file chromium-only, which the suite's single
 * project already is (`playwright.config.js`), and the main frame is the one the
 * protocol gives no `parentId` — where Playwright's event was compared against
 * `page.mainFrame()`, the event carries the answer itself. A session per open is
 * what it costs, and the cost is under a minute over the whole suite: 33.4
 * minutes for the run before the fix and 33.7 and 34.0 for the two after it, on
 * 621 opens.
 *
 * A flag was tried first, and it is the thing not to try again: collect
 * `isNavigationRequest()` on the main frame, and let the next commit count as a
 * document's if one had been asked for. It reads like identity and is not —
 * measured, the `goto`'s document request goes out and the **next** commit is
 * still a `replaceState`, which spends the flag and opens the fence early
 * exactly as before. A request being out says a document was asked for; it does
 * not say that this commit is that document's.
 *
 * `asked` is **not** emptied at each commit, and the measurement is why. The
 * ticket proposed exactly that as the fix covering both halves — when a document
 * commits and is then itself replaced, the requests collected in between belong
 * to a document that is gone and their bodies went with it. Three numbers say it
 * would cover nothing. No window in the suite holds two document commits (0 of
 * 621). A request released into a page that has moved on produces no response the
 * waiter can match: `168a`'s second row builds that situation and passes with the
 * clause and without it. And the one way an intermediate document's
 * answer does reach the waiter is while that document is still on screen — which
 * is `keepBody`'s read racing the next commit rather than a question of which
 * document asked, a window to narrow and not a fence to draw, and what covers it
 * is #160's named sentence. So the clause is not here, and the row that would
 * have proved it stays as a net that says it is one.
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

  const session = await page.context().newCDPSession(page);
  await session.send('Page.enable');

  const onCommit = ({ frame }) => {
    if (!frame.parentId) committed = true;
  };
  const onRequest = request => {
    if (committed) asked.add(request);
  };

  session.on('Page.frameNavigated', onCommit);
  page.on('request', onRequest);

  try {
    const [response] = await Promise.all([wait(fence(page, asked)), page.goto(url)]);

    await keepBody(response, url);
    return response;
  } finally {
    page.off('request', onRequest);
    session.off('Page.frameNavigated', onCommit);
    // A row whose page or context is already closing cannot detach, and there is
    // nothing left to detach from; every other failure here would be reported in
    // place of the row's own, which is the thing #160 was about.
    await session.detach().catch(() => {});
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
