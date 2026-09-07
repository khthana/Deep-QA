'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  openClos,
  mySectionIds,
  cloCard,
  codesOnScreen,
  submitClo,
  removeClo,
} = require('../support/clos-screen');

/**
 * docs/acceptance/27-course-learning-outcomes.md — the ordering row, #96.
 *
 * ## Why this is its own file rather than a row in `27a`
 *
 * Every other row in `27a` runs against the seeded nine, and this one has to
 * put an eleven-outcome set on the screen and take it away again. Appending it
 * to `27a` would put a fixture with cleanup in the middle of a file whose rows
 * all assume the same nine cards, and #85's lesson about inserting tests
 * mid-file — every citation below the insertion moves — applies to a sheet that
 * cites `27a` rows by number in ten places.
 *
 * ## What makes this row able to fail
 *
 * `db/seed.js` builds `CLO-1..CLO-9`, and **on nine single-digit codes,
 * ordering as text and ordering as a number are the same order**. That is the
 * whole reason #96 survived from #27 to now with two green suites over it: no
 * assertion anywhere was in a position to tell the two rules apart. `CLO-10` is
 * the first code that is, so this row brings it.
 *
 * The expected sequence is written out literally. The four backend tests that
 * used to make this claim built their expectation from a copy of the route's
 * own `ORDER BY`, which passes whatever that rule becomes; `inCloOrder` in
 * `backend/test/helpers.js` is where that was undone, and the note there says
 * what it still cannot prove.
 *
 * ## Nothing is left behind
 *
 * The two codes are added through the form and removed through the bin, so the
 * screen does the cleanup the same way a person would. The removal runs in a
 * `finally` because a failed assertion must not leave an eleven-outcome set for
 * the next spec — `27a` row 6 asserts the list is exactly nine.
 */

const ADDED = ['CLO-11', 'CLO-10'];

/** The nine the seed leaves, then the two this row brings, in number order. */
const EXPECTED = [
  'CLO-1', 'CLO-2', 'CLO-3', 'CLO-4', 'CLO-5',
  'CLO-6', 'CLO-7', 'CLO-8', 'CLO-9', 'CLO-10', 'CLO-11',
];

const draftFor = code => ({
  รหัสผลการเรียนรู้: code,
  รายละเอียดผลการเรียนรู้: `ผลการเรียนรู้สำหรับตรวจลำดับ ${code}`,
  วิธีการสอน: 'บรรยาย',
  วิธีการวัดผล: 'ตรวจผลงาน',
});

test('row 1: CLO-10 is drawn after CLO-9, not between CLO-1 and CLO-2', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openClos(page, section);

  // Nine before anything is added, so a failure below is about the order and
  // not about a set some earlier spec left in a state nobody expected.
  expect(await codesOnScreen(page)).toEqual(EXPECTED.slice(0, 9));

  try {
    // Added highest-first: a screen that simply drew them in the order they
    // were created would fail this row too.
    for (const code of ADDED) {
      await page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้รายวิชา' }).click();
      const written = await submitClo(page, draftFor(code), 'POST');
      expect(written.status()).toBe(201);
      // The list redraws after the write, and `codesOnScreen` reads once
      // rather than retrying — read it mid-redraw and it answers []. Wait for
      // the card the write was about, the way 27a row 8 does.
      await expect(cloCard(page, code)).toHaveCount(1);
    }

    expect(await codesOnScreen(page)).toEqual(EXPECTED);
  } finally {
    for (const code of ADDED) {
      await removeClo(page, code);
      await expect(cloCard(page, code)).toHaveCount(0);
    }
  }

  // Back to the nine the rest of the store expects.
  expect(await codesOnScreen(page)).toEqual(EXPECTED.slice(0, 9));
});
