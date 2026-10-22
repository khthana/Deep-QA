'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  openDepartments,
  openEditor,
  statusField,
} = require('../support/departments-screen');

/**
 * #180 — the status field at creation, on the one screen that offered it.
 *
 * Five forms carry a status field. Four of them draw it only on an edit, each
 * saying so at the `editing &&` that hides it; ภาควิชา drew it at creation too,
 * and its route was the only one of the five that read `is_active` on an
 * INSERT. That was the shape the delivered backend had — `departmentModel.js`
 * and `programsModel.js` both write the column on a creation — kept here by
 * #14 and diverged from, with a reason written at the site, by the four routes
 * that came after it. The owner answered on 22 October 2569 that the field
 * comes off the create form like the other four.
 *
 * ## What this row is, and what it is not
 *
 * It is the **absence**, read where a person meets it, with the same read taken
 * green one line later on the form that does carry the field: a locator scoped
 * to a label the screen never draws reads empty on a broken screen and on a
 * fixed one alike, so ten reds of ten can mean nothing (#171).
 *
 * It is *not* a row about what a creation stores. That claim —
 * *a department is created open, whatever the body says* — is
 * `backend/test/departments.test.js`'s, because it is the route's, and at this
 * seam it could not be put at risk: the form's own `EMPTY` has `is_active`
 * true, so a screen with the field back would still create an open department
 * and the row would pass against the unfixed code (#203). A row bought for free
 * is a row that measures nothing, so it is not written here.
 */

/** The seeded department this row edits: any department with a form will do. */
const DEPARTMENT = '05';

test('14 item 1: the create form offers no status, and the edit form does', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await openDepartments(page);

  await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
  // The settle point, so the count below is read of a form and not of the
  // moment before one was drawn.
  await expect(page.getByRole('heading', { name: 'เพิ่มภาควิชา' })).toBeVisible();
  await expect(statusField(page)).toHaveCount(0);

  // The same read, green, on the form that does carry it - which is what makes
  // the count above a measurement.
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await openEditor(page, DEPARTMENT);
  await expect(statusField(page)).toHaveCount(1);
  // And it is drawn from the department, not from a default: `05` is open.
  // That is a condition on the world this file is handed, not something it
  // arranges (#129): on 22 October 2569 nothing before this file closes `05`
  // - `16a` closes `01`, and `181a` closes `05` but sorts after it and puts
  // it back in `afterAll`. A file that closed it earlier would make this
  // line red with both values printed, which is the report, not a silence.
  await expect(statusField(page)).toHaveValue('active');
});
