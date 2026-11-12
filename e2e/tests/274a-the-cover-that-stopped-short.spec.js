'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { openImport, importWindow } = require('../support/import-panel');
const { openDepartments, departmentRow } = require('../support/departments-screen');

/**
 * #274 - the cover of a window stopped 24 px short of the top of the screen.
 *
 * `ConfirmDialog` and `ImportPanel` draw a `fixed inset-0` cover, and both are
 * mounted inside the page's own `<div className="space-y-6">`. Tailwind 3
 * writes that as `.space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top }`,
 * so the cover took a 24 px top margin and began at `top: 24`, leaving the
 * strip above it - the logo, which is a link, and the profile button - under
 * the mouse while a window was open. Found walking `270` row 11 on 12
 * November 2569; `ConfirmDialog` had it before #270 added the second cover.
 *
 * What is read is the drawing and not the class: the cover's own box, and what
 * the browser hands a press at a point in that strip. The two points are the
 * two controls the walk found there, at the two ends of the bar. Departments is
 * the screen the walk found it on and the one both windows open from with no
 * data of their own (#68, #171).
 */

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);
});

/**
 * The cover's box, and whether a press at each end of the top strip lands on
 * it. The cover is the dialog's parent - the `fixed inset-0` element both
 * components draw around the box.
 */
function coverReading(dialog) {
  return dialog.evaluate(box => {
    const cover = box.parentElement;
    const lands = x => cover.contains(document.elementFromPoint(x, 10));
    return {
      top: Math.round(cover.getBoundingClientRect().top),
      left: lands(100),
      right: lands(window.innerWidth - 40),
    };
  });
}

const WHOLE = { top: 0, left: true, right: true };

test('the import window covers the top of the screen', async ({ page }) => {
  await openImport(page);
  const dialog = importWindow(page);
  await expect(dialog).toBeVisible();

  // Read as a poll, because the cover fades in (`ContentMotionDIV`); what is
  // asserted is where it settles, and a cover that stops short settles short.
  await expect.poll(() => coverReading(dialog)).toEqual(WHOLE);
});

test('the confirmation covers the top of the screen', async ({ page }) => {
  await departmentRow(page, '01').getByRole('button', { name: 'ลบ' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await expect.poll(() => coverReading(dialog)).toEqual(WHOLE);

  // Nothing is removed: the row asks the question and walks away from it.
  await dialog.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
