'use strict';

/**
 * #293's probe: does a `GET /api/me` leave *after* `expireSession` when a
 * screen was opened with a given settle?
 *
 * Kept because no row can read this again (#169): the rows of `10a` assert
 * what the person sees after the reload, and a stray bootstrap read changes
 * that only when it wins a race with the reload, so a row is red on some runs
 * and green on others over the same arrangement. This counts the reads
 * themselves.
 *
 * Run it by copying it into `e2e/tests/` (the runner only looks there), then
 * `npx playwright test tests/293-stray-bootstrap-read.spec.js --reporter=line`
 * from `e2e/`, and delete the copy. Each line prints the settle, the CPU
 * rate, how many `/api/me` left before and after the forgery, whether the
 * cookie survived the four seconds after it, and whether the reload drew the
 * box.
 *
 * Measured 20 November 2569:
 * Three rounds of `networkidle`, 9 runs each at rates 1, 4 and 8:
 * - round 1 (an earlier form of this probe, counting before the reload):
 *   9 of 9 `meBeforeExpire=0 meAfterExpire=2 cookieLeft=false dialog=false`.
 * - round 2 (counting *after* the reload, so its own pair is in the after
 *   count): 7 of 9 after=4, i.e. two stray, all with `cookieLeft=false` and
 *   no box; the other 2 after=2 with the cookie left and the box drawn.
 * - round 3 (this file, counting before the reload): 6 of 9 stray.
 * In all 27, stray <=> `cookieLeft=false` <=> no box.
 * - `drawn`, first version (counting from before `goto`): 8 of 8 at rate 4
 *   and 8 of 9 across rates with before=2 and after=2 - the reload's pair,
 *   counted after it - cookie left, box drawn; the ninth stuck at two
 *   requests that never finished.
 * - `drawn`, round 3: 9 of 9 `meBeforeExpire=2 meAfterExpire=0
 *   cookieLeft=true dialog=true`.
 * - `drawn` as it is now (counting from the commit), round 4: 9 of 9, the
 *   same line.
 * Record: `docs/acceptance/10-application-shell.md` §#293.
 *
 * What it cannot say: whether a *person* meets this. In use the document whose
 * bootstrap read meets a dead token is the one being looked at, and that
 * read's 401 draws the box on it; the read is only wasted here because the
 * arrangement throws that document away.
 */
const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { expireSession, sessionCookie } = require('../support/expired-session');
const { PROGRAM_SUBJECTS, actingButton, expiryDialog } = require('../support/shell');

const SETTLES = {
  networkidle: async page => {
    await page.goto(PROGRAM_SUBJECTS);
    await page.waitForLoadState('networkidle');
  },
  // A copy of `openAndSettle` in `10a-shell.spec.js`, kept here rather than
  // exported because a probe nothing runs must not become a caller whose
  // needs shape the rows' helper (#81), and because what this measures is the
  // settle as it stood on the day, which an edit to the rows' helper would
  // otherwise change under the recorded numbers. The 9 runs recorded below
  // were taken with a first version that counted from before `goto` and
  // cleared on `framenavigated`; this is the version the rows now use.
  drawn: async page => {
    await page.goto(PROGRAM_SUBJECTS, { waitUntil: 'commit' });
    const stillOut = new Set();
    const onSent = request => {
      if (new URL(request.url()).pathname.startsWith('/api/')) stillOut.add(request);
    };
    const onEnded = request => stillOut.delete(request);
    page.on('request', onSent);
    page.on('requestfinished', onEnded);
    page.on('requestfailed', onEnded);
    try {
      await expect(actingButton(page)).toBeVisible();
      await expect
        .poll(() => stillOut.size, { message: 'requests still out after opening' })
        .toBe(0);
    } finally {
      page.off('request', onSent);
      page.off('requestfinished', onEnded);
      page.off('requestfailed', onEnded);
    }
  },
};

for (const settle of Object.keys(SETTLES)) {
  for (const rate of [1, 4, 8]) {
    for (let i = 0; i < 3; i += 1) {
      test(`probe ${settle} rate ${rate} #${i}`, async ({ page }) => {
        await signIn(page, ACCOUNTS.teacherOne);
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });

        const me = [];
        page.on('request', r => {
          if (new URL(r.url()).pathname === '/api/me' && r.method() === 'GET') me.push(Date.now());
        });

        const t0 = Date.now();
        await SETTLES[settle](page);
        const settled = Date.now();
        await expireSession(page);
        const expiredAt = Date.now();
        await page.waitForTimeout(4000);
        const cookieLeft = Boolean(await sessionCookie(page));
        // Counted here, before the reload, which asks twice of its own.
        const before = me.filter(t => t <= expiredAt).length;
        const stray = me.filter(t => t > expiredAt).length;

        await page.reload();
        let dialog = true;
        try {
          await expect(expiryDialog(page)).toBeVisible({ timeout: 15000 });
        } catch {
          dialog = false;
        }
        console.log(
          `PROBE settle=${settle} rate=${rate} took=${settled - t0}ms ` +
            `meBeforeExpire=${before} meAfterExpire=${stray} ` +
            `cookieLeft=${cookieLeft} dialog=${dialog}`,
        );
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      });
    }
  }
}
