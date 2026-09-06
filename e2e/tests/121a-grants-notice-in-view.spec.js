'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openUsers } = require('../support/users-screen');
const { ROLE_NAMES, openEditor, grantRow, revoke } = require('../support/grants-panel');

/**
 * The seventh screen with #55's defect — ticket #121.
 *
 * [#55](https://github.com/khthana/Deep-QA/issues/55) found that the content
 * pane in `pages/Mainpage.js` scrolls on its own while the banner is drawn at
 * the top of what it scrolls, so somebody working at the bottom of a long page
 * presses a button and is answered above the fold. Its own words for why the
 * red case is the one that matters: *a refusal nobody reads is a save the
 * person believes went through*. It fixed six screens by giving
 * `components/Notice.js` a `scrollIntoView`, and said so: *six screens had this
 * block byte for byte*.
 *
 * `components/users/GrantsPanel.js` was the seventh and was missed. It draws
 * its own banner from a near-byte-for-byte copy of that markup, so it never got
 * the scroll — and its controls sit *below* the banner: the revoke buttons are
 * in the table, and the add picker is below the table.
 *
 * ## This file is a measurement, and the numbers are the reason it exists
 *
 * #121 was opened during #111 with this half written down as a suspicion
 * rather than a finding — *ยังไม่ได้วัด*. **A ticket this repo wrote itself
 * gets the same treatment as one it did not**, so it was measured before
 * anything was changed, and the first attempt was wrong in a way worth
 * recording: at the 900×400 viewport `55a` uses, the panel's heading stayed
 * fully in view and there was nothing to catch.
 *
 * What the geometry actually says, read off the page:
 *
 *     visible pane           291px   (at a 400px window)
 *     banner → add button    264px
 *     one grant row           48px
 *
 * So at that window it fits **by 27px**, and one more grant row than the seed's
 * largest account holds pushes it over. The defect is real and the seeded data
 * is just under the line — which is exactly the kind of margin that stops being
 * a margin when somebody holds four roles instead of two.
 *
 * Rather than write grants into a shared schema to reach it, this drives the
 * same geometry from the other side: a shorter window, where the seeded two
 * grants already overflow. **A ticket about scrolling proved by making the
 * thing scroll, not by making the data bigger.** The threshold above is the
 * number to act on; the viewport below is only how it is reached cheaply.
 *
 * The assumption assertion before the click is `55a`'s and is load-bearing for
 * its reason: if the pane never scrolled, the banner was in view from the start
 * and `toBeInViewport()` would pass for the wrong reason.
 */

// Short enough that the panel alone overflows the pane - see the header.
test.use({ viewport: { width: 900, height: 300 } });

test('#121: the grants panel brings its refusal into view', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await openEditor(page, ACCOUNTS.departmentAdmin05);

  const own = grantRow(page, ROLE_NAMES.DEPT_ADMIN, '05');
  await expect(own).toHaveCount(1);

  // Work from the bottom of the panel, which is where the add picker is and
  // where somebody managing roles ends up.
  await page
    .getByRole('button', { name: 'เพิ่มบทบาท' })
    .scrollIntoViewIfNeeded();

  // The assumption: the pane really did scroll past the top of the panel, so
  // the banner has somewhere to be brought back from.
  await expect(
    page.getByRole('heading', { name: 'บทบาทที่ได้รับ' }),
  ).not.toBeInViewport();

  // Revoking your own grant is refused at the server - 12a row 6's driver, and
  // the one refusal this panel can be given without writing anything.
  const refused = await revoke(page, ROLE_NAMES.DEPT_ADMIN, '05');
  expect(refused.status()).toBe(403);

  const banner = page.getByText(REFUSALS.forbidden);
  await expect(banner).toBeVisible();
  await expect(banner).toBeInViewport();

  // And the grant is still held: a panel that switched the row off and then
  // complained would lock this account out on its next request.
  await expect(own).toHaveCount(1);
});
