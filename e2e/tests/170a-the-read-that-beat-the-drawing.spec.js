'use strict';

const { test, expect } = require('@playwright/test');

const { SCORE_RATIOS, ACTIVITIES, unmarkedActivityName } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const {
  openActivities,
  mySectionIds,
  groupsOnScreen,
  namesOnScreen,
  removeActivity,
} = require('../support/activities-screen');

/**
 * #170 - the settle point `activities-screen.js` opens through.
 *
 * `waitForActivities` resolves when the answer's headers land. The screen draws
 * from a body that arrives after them and from state React sets after that, and
 * draws *nothing* in between - `data` starts `null`. A read taken in that window
 * comes back empty, which is what the full suite caught `32a` row 1 doing on
 * 28 September 2569.
 *
 * ## Why this row builds the window rather than waiting for one
 *
 * #170 measured the window at 11-22ms and caught the raw read inside it once in
 * ten opens on an idle machine. A row that only reran would be the row that
 * catches the defect on some runs rather than the row that holds it (#129), and
 * a mutant against it would be read off a coin.
 *
 * ## Why the knob is the answer and not the renderer
 *
 * Two instruments were measured first and both showed nothing, 0 reds in 20
 * each: `Emulation.setCPUThrottlingRate` at twenty (#136's tool), and the main
 * thread held busy for 250ms after the answer. Neither can work, and for one
 * reason: **the read is executed by the renderer too**, so anything that makes
 * the drawing late makes the read queue behind it. #164's rule one layer up -
 * the knob is for the drawing, not for the reading.
 *
 * What does open the window is an answer whose *continuation* is late while the
 * thread stays free, which is the gap `waitForResponse` leaves open by
 * construction: it reports headers, and the screen waits for a body. The
 * fixture below is that, and nothing else - the request is neither intercepted
 * nor rewritten, and the answer the screen gets is the server's own.
 *
 * ## Two rows, because the screen loses the race two different ways
 *
 * Row 1 is the **open**, where the screen has drawn nothing at all and the read
 * comes back empty. Row 2 is the **reload after a delete**, where #149 keeps
 * the old list up while one is out - so the read is not empty but *stale*, the
 * piece of work that was just deleted still on the screen. Same mechanism, and
 * a symptom that looks nothing like it: measured, the row read six names where
 * five belonged, every run.
 *
 * ## What proves them
 *
 * `e2e/support/` is not what `mutation/` mutates (`160a` says why), so the
 * stand-in is a control run by hand, one per row: take `untilActivitiesDrawn`
 * out of `openActivities` and row 1 dies on its own; take it out of
 * `removeActivity` and row 2 does. `32a` and `33a` stand under both.
 */

/**
 * Row 2 deletes an Activity the seed made - put back when the file ends (#134).
 *
 * `support/hold.js` says what it puts back, and what it does not.
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** How late the screen's own continuation is, in milliseconds. */
const LATE = 400;

/**
 * Makes the activities answer reach the screen after it has reached the row.
 *
 * Not a busy loop: the thread stays free, so the read is free to happen in the
 * window. `addInitScript` and not `page.route`, because a fulfilled route is
 * answered all at once - `waitForResponse` would resolve at the fulfil and
 * there would be no gap to read into.
 */
const arriveLate = lateBy => {
  window.__lateArrivals = 0;
  const real = window.fetch;
  window.fetch = async (...args) => {
    const url = String(args[0]?.url ?? args[0]);
    const answer = await real(...args);
    if (/\/api\/teaching\/sections\/\d+\/activities$/.test(url)) {
      window.__lateArrivals += 1;
      await new Promise(done => setTimeout(done, lateBy));
    }
    return answer;
  };
};

test('row 1: a list whose answer arrives late is read drawn, not empty', async ({ page }) => {
  await page.addInitScript(arriveLate, LATE);

  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);

  const answer = await openActivities(page, section);
  expect(answer.status()).toBe(200);

  // The precondition, asserted where it is used (#51): the fixture is only a
  // fixture if the screen actually went through it. A page that had been
  // served from somewhere the init script did not reach would read perfectly
  // and prove nothing.
  expect(await page.evaluate(() => window.__lateArrivals)).toBeGreaterThan(0);

  // Both reads are raw and non-retrying, which is the point: after the settle
  // point they are reads at a named settle point (#50), and without it they are
  // reads of a screen that has drawn nothing at all.
  expect(await groupsOnScreen(page)).toEqual(
    SCORE_RATIOS.map(ratio => expect.stringContaining(ratio.category)),
  );

  // Counted as well as read (#164): an empty answer and an absent screen read
  // the same way round, and only the count tells them apart. The seed's one
  // deletable fixture is the `+ 1`, as `32a` row 1 counts it.
  expect(await namesOnScreen(page)).toHaveLength(ACTIVITIES.length + 1);
});

test('row 2: the list a delete reloads is read after it is drawn, not before', async ({ page }) => {
  await page.addInitScript(arriveLate, LATE);

  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);

  const answered = await (await openActivities(page, section)).json();

  // Retrying, deliberately, and the one read in this file that is: what row 2
  // is about is the reload, so its precondition must not rest on the settle
  // point row 1 is about. Read raw, the control for row 1 would kill this row
  // too and neither claim could be measured apart from the other.
  await expect(page.getByRole('listitem').getByRole('heading', { level: 3 })).toHaveCount(
    ACTIVITIES.length + 1,
  );

  // The seed's one deletable fixture, the only row on this screen nothing
  // points at - `32a` says why every other one is refused.
  const response = await removeActivity(
    page,
    unmarkedActivityName(answered.section.section_number, answered.section.academic_year),
  );
  expect(response.status()).toBe(204);

  // Without the settle point this reads the list from before the delete: it
  // stays drawn while the reload is out (#149), so what is wrong
  // here is a stale screen rather than an empty one, and a row that only
  // asserted *not empty* would pass on it.
  expect(await namesOnScreen(page)).toHaveLength(ACTIVITIES.length);
});
