'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isActivitiesList } = require('./activities-screen');
const { isClosList } = require('./clos-screen');
const { isWeightsList } = require('./weights-screen');
const { isOnePair } = require('./program-subjects-screen');

/**
 * Which answer a screen's own read is — #218.
 *
 * A waiter has to match by what **identifies** the request, not by what matches
 * closely enough to pass (#116). These screens hang children under their own
 * address, so a matcher written as a prefix accepts a child's answer as well,
 * and the body that arrives then has none of the keys the row goes on to read.
 *
 * Measured on 19 Oct 2569 against the unfixed waiter, in a browser, with the
 * breadcrumb's read of one Activity held open until it landed inside the window
 * — `DEEPER_NAMES.activity` in `Mainpage.js`, the only caller in the
 * application of `GET /activities/:activityId`. `waitForActivities` took
 * `/api/teaching/sections/1/activities/1` and `untilActivitiesDrawn` died at
 * its first clause, the one reading `answered.activities.length`, with
 * `TypeError: Cannot read properties of undefined (reading 'length')` — the
 * message the full suite of 18 Oct 2569 printed for `141a`'s *evidence the back
 * button has left behind* row. `docs/acceptance/32-activity-list.md` §#218
 * carries what the probe measured; the probe itself was deleted once it had
 * answered (#207).
 *
 * These are claims about an instrument and not about the product, so no sheet
 * row rests on them (#171) and they are proved here rather than at the browser
 * seam, where the window has to be opened by hand to be seen at all.
 */

const host = url => `http://localhost:5100${url}`;

test('the Activities waiter identifies the list and nothing under it', () => {
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities')), true);
  assert.equal(isActivitiesList(host('/api/teaching/sections/27/activities')), true);

  // The four siblings, each a real GET route of its own.
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities/5')), false);
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities/5/evidence')), false);
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities/5/scores')), false);
  assert.equal(
    isActivitiesList(host('/api/teaching/sections/1/activities/5/scores/import-template')),
    false,
  );
});

test('a query string is not part of what identifies the read', () => {
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities?page=2')), true);
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities/5?page=2')), false);
});

test('the CLOs waiter identifies the list and nothing under it', () => {
  assert.equal(isClosList(host('/api/teaching/sections/1/clos')), true);

  // The three siblings, each a real GET route of its own.
  assert.equal(isClosList(host('/api/teaching/sections/1/clos/9')), false);
  assert.equal(isClosList(host('/api/teaching/sections/1/clos/9/behaviors')), false);
  assert.equal(isClosList(host('/api/teaching/sections/1/clos/9/criteria')), false);
});

test('the weighting scheme waiter identifies the scheme and not its template', () => {
  assert.equal(isWeightsList(host('/api/teaching/sections/1/weights')), true);
  assert.equal(isWeightsList(host('/api/teaching/sections/1/weights/import-template')), false);
});

test('the editor waiter identifies one pair and none of the three singles', () => {
  assert.equal(isOnePair(host('/api/program-subjects/0501/01076105')), true);

  // The three GET routes the editor's old prefix also accepted. `/catalogue` is
  // the one that matters: this screen asks it as the form is typed into.
  assert.equal(isOnePair(host('/api/program-subjects/catalogue')), false);
  assert.equal(isOnePair(host('/api/program-subjects/programs')), false);
  assert.equal(isOnePair(host('/api/program-subjects/import-template')), false);
  assert.equal(isOnePair(host('/api/program-subjects')), false);
});

test('neither matcher answers for a path that merely starts the same way', () => {
  assert.equal(isActivitiesList(host('/api/teaching/sections/1/activities-archive')), false);
  assert.equal(isClosList(host('/api/teaching/sections/1/clos-archive')), false);
});

/**
 * The census — every read waiter in `e2e/support`, against every route the
 * server really mounts.
 *
 * The rows above are claims about four matchers; this is the population they
 * came out of, because a reason why a fifth waiter is safe *today* is a claim
 * with an expiry date on it (#131) and the thing that moves that date is a route
 * somebody else adds. Counted by the mechanism and not by what a helper is
 * called (#174): for one waiter and one method, how many mounted routes can
 * satisfy it. More than one, and the waiter is taking delivery of an answer it
 * cannot identify.
 *
 * It gives three answers and not two (#159): *counted*, *exact by construction*
 * — a predicate that compares the whole pathname with `===` cannot accept two
 * routes, there being no two routes with one path — and **could not ask**, for a
 * predicate this reader cannot resolve to either. The third is why all three
 * group sizes are asserted as equalities and not as floors: an instrument that
 * quietly skips what it cannot read is the species that reported `problems 0`
 * over three sites it had stopped seeing (#208, #123), and a floor hides a
 * waiter that has merely moved from one group to another. **The groups are the
 * tell, never the total** — which is why they are printed as well as asserted.
 * The files are named rather than the lines, because a citation by line number
 * ages the day anything above it grows (#173).
 *
 * What it cannot say, written down rather than assumed (#132): it reads only
 * `e2e/support`, so a waiter written inside a spec file is invisible to it; it
 * answers about **routes** and never about whether a waiter is fenced to one
 * document by `openAt` (#160), which is the other half of #218's mechanism; and
 * it compares against the paths `router.<method>('…')` writes as plain strings,
 * so a path assembled from a variable is not in its population at all.
 *
 * One spelling is load-bearing: `howItMatches` recognises a named predicate as
 * `const isX = url => RE.test(…)`, which is how all four of the matchers above
 * are written. A predicate spelled any other way does not become invisible —
 * it falls into *could not ask*, whose per-file sizes are asserted below, so it
 * arrives as a red and not as a silence.
 */

const SUPPORT = __dirname;
const ROUTES = path.join(__dirname, '..', '..', 'backend', 'routes');

/**
 * What the groups measured on 19 Oct 2569, at the commit that closed #218.
 *
 * Equalities rather than floors, for the reason in the docstring above. A figure
 * that moves means a read waiter was added, rewritten into another group, or
 * stopped being resolvable — each of which is a decision for whoever moved it,
 * and the printed groups beside the failure say which of the three happened.
 */
const MEASURED = {
  counted: 13,
  exact: 15,
  unreadable: { 'plos-screen.js': 1, 'rubrics-screen.js': 1, 'scores-screen.js': 1 },
};

/** Every route the server mounts, all of them under `/api` (`backend/app.js`). */
function mountedRoutes() {
  const found = [];
  for (const name of fs.readdirSync(ROUTES).filter(file => file.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(ROUTES, name), 'utf8');
    const declared = /router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;
    let hit;
    while ((hit = declared.exec(source)) !== null) {
      found.push({ method: hit[1].toUpperCase(), path: `/api${hit[2]}`, file: name });
    }
  }
  return found;
}

/** The text of one balanced call, from its opening paren. */
function callText(source, from) {
  let depth = 0;
  for (let at = from; at < source.length; at += 1) {
    if (source[at] === '(') depth += 1;
    if (source[at] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(from, at + 1);
    }
  }
  return source.slice(from);
}

/** Every `page.waitForResponse` in the support modules, with its file's consts. */
function waiters() {
  const marker = 'page.waitForResponse';
  const all = [];
  for (const name of fs
    .readdirSync(SUPPORT)
    .filter(file => file.endsWith('.js') && !file.endsWith('.test.js'))) {
    const source = fs.readFileSync(path.join(SUPPORT, name), 'utf8');

    const regexes = {};
    const declared = /^const (\w+) = (\/[^\n;]+\/);$/gm;
    let hit;
    while ((hit = declared.exec(source)) !== null) regexes[hit[1]] = hit[2];

    const predicates = {};
    const named = /^const (is\w+) = url => (\w+)\.test\(/gm;
    while ((hit = named.exec(source)) !== null) predicates[hit[1]] = hit[2];

    let at = source.indexOf(marker);
    while (at !== -1) {
      all.push({
        file: name,
        text: callText(source, source.indexOf('(', at + marker.length)),
        regexes,
        predicates,
      });
      at = source.indexOf(marker, at + marker.length);
    }
  }
  return all;
}

/**
 * A regex literal written where the predicate tests it, which is a shape three
 * of these waiters use. Found by walking back from `.test(` to the opening
 * slash rather than by a pattern for `/^`, because an anchor at the tail is as
 * good as one at the head and a reader that knows only one spelling is the
 * reader that stops seeing its population (#141).
 */
function inlineRegexBefore(text) {
  const at = text.indexOf('.test(');
  if (at === -1 || text[at - 1] !== '/') return null;
  for (let start = at - 2; start > 0; start -= 1) {
    if (text[start] === '/' && text[start - 1] !== '\\') return text.slice(start, at);
    if (text[start] === '\n') return null;
  }
  return null;
}

/** `counted` with a regex, `exact` by construction, or `could not ask`. */
function howItMatches(waiter) {
  const viaPredicate = waiter.text.match(/\b(is\w+)\(/);
  if (viaPredicate && waiter.predicates[viaPredicate[1]]) {
    return { how: 'counted', source: waiter.regexes[waiter.predicates[viaPredicate[1]]] };
  }

  const viaName = waiter.text.match(/\b(\w+)\.test\(/);
  if (viaName && waiter.regexes[viaName[1]]) {
    return { how: 'counted', source: waiter.regexes[viaName[1]] };
  }

  const inline = inlineRegexBefore(waiter.text);
  if (inline) return { how: 'counted', source: inline };

  if (/pathname\s*===/.test(waiter.text) || /===\s*\w+\(/.test(waiter.text)) {
    return { how: 'exact' };
  }

  return { how: 'could not ask' };
}

const sample = route => route.replace(/:\w+/g, '1');

test('every read waiter in e2e/support identifies one route, or says it cannot be asked', () => {
  const routes = mountedRoutes();
  assert.ok(routes.length > 150, `the routes reader found ${routes.length}`);

  const reads = waiters().filter(waiter => /method\(\)\s*===\s*'GET'/.test(waiter.text));

  const tooMany = [];
  const unreadable = {};
  let counted = 0;
  let exact = 0;

  for (const waiter of reads) {
    const { how, source } = howItMatches(waiter);
    if (how === 'could not ask') {
      unreadable[waiter.file] = (unreadable[waiter.file] ?? 0) + 1;
      continue;
    }
    if (how === 'exact') {
      exact += 1;
      continue;
    }
    counted += 1;
    const matcher = new RegExp(source.slice(1, -1));
    const accepted = routes.filter(
      route => route.method === 'GET' && matcher.test(sample(route.path)),
    );
    if (accepted.length !== 1) {
      tooMany.push(`${waiter.file} ${source} accepts ${accepted.map(r => r.path).join(' , ')}`);
    }
  }

  // Printed as well as asserted: a figure that has moved is read against its
  // own group and never against the total.
  console.log(
    'read waiters: counted %d · exact %d · could not ask %j (of %d reads, %d routes)',
    counted,
    exact,
    unreadable,
    reads.length,
    routes.length,
  );

  assert.deepEqual(tooMany, [], `a read waiter cannot identify its answer:\n${tooMany.join('\n')}`);

  // Keyed by file **and counted**, so that a second unresolvable waiter in a
  // file already named is a red rather than a set that has not changed.
  // `scores-screen.js` builds its path from a function and asks about the tail
  // by hand; `plos-screen.js` and `rubrics-screen.js` declare the regex inside
  // the function that uses it. Each was read by eye on 19 Oct 2569 and accepts
  // one GET route.
  assert.deepEqual(
    unreadable,
    MEASURED.unreadable,
    'a support module gained or lost a read waiter this census cannot resolve',
  );

  assert.equal(counted, MEASURED.counted, 'the number of read waiters counted against the routes');
  assert.equal(exact, MEASURED.exact, 'the number of read waiters exact by construction');
});
