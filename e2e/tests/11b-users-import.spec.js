'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  downloadTemplate,
  headerOf,
  csv,
  total,
  reportTable,
  reportedLines,
  reportedReason,
} = require('../support/import-panel');
const { openUsers, search, importUsers, userRow } = require('../support/users-screen');

/**
 * docs/acceptance/11-user-accounts.md, rows 6-7 and the import half of row 8 -
 * the original import, the one `lib/importer` and `ImportPanel` were written
 * for and that every other screen's import rows are copies of.
 *
 * What is different here is the size of a row: fifteen columns, of which two
 * are dates, one is a role, one is that role's scope and one is a password. So
 * the rows below are built by naming the fields and letting the screen's own
 * template say where each one goes - a spec that counted commas would be
 * asserting the order of the columns, which is not what any of these rows is
 * about.
 *
 * `mode: 'serial'` because they share one table and one address space: the
 * counts below are only meaningful if nothing else is writing to it.
 */
test.describe.configure({ mode: 'serial' });

/** One data line, in whatever order the screen's own template puts the columns. */
const lineFor = (header, fields) =>
  header
    .split(',')
    .map(column => fields[column.trim()] ?? '')
    .join(',');

/** What every good row below shares, so each row states only what is its own. */
const account = fields => ({
  title_th: 'นาย',
  first_name_th: 'ทดสอบ',
  last_name_th: 'นำเข้า',
  department_id: '05',
  role_id: 'TEACHER',
  scope_id: '05',
  ...fields,
});

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
});

test('row 6: a good file creates every account, and one of them signs in', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const created = [
    { user_id: '91100001', email: 'e2e.import.one@kmitl.ac.th', password: 'ImportedOne1' },
    { user_id: '91100002', email: 'e2e.import.two@kmitl.ac.th', password: 'ImportedTwo2' },
    // No password, which a teacher does not need: the column is required only
    // of the two roles that sign in with one.
    { user_id: '91100003', email: 'e2e.import.three@kmitl.ac.th' },
  ];

  await importUsers(page, csv(header, ...created.map(one => lineFor(header, account(one)))));

  await expect(page.getByText('นำเข้าสำเร็จ 3 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 3);
  for (const one of created) {
    await search(page, one.email);
    await expect(userRow(page, one.email)).toHaveCount(1);
  }

  // The row that makes the import worth having: an account that is listed but
  // cannot sign in is not an account. The grant rides in the same file, so
  // this proves the second write of `insertAccount` happened too - an account
  // created without its grant is admitted and then has no menu at all.
  await page.context().clearCookies();
  await signIn(page, created[0].email, created[0].password);
});

test('row 7: every bad row is reported at once, and nothing is written', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const good = { user_id: '91100011', email: 'e2e.import.good@kmitl.ac.th' };

  await importUsers(
    page,
    csv(
      header,
      lineFor(header, account(good)),
      // An address the seed already holds.
      lineFor(header, account({ user_id: '91100012', email: ACCOUNTS.teacherOne })),
      // No address at all.
      lineFor(header, account({ user_id: '91100013', email: '' })),
      // A window that ends before it starts.
      lineFor(
        header,
        account({
          user_id: '91100014',
          email: 'e2e.import.window@kmitl.ac.th',
          valid_from: '2026-05-01',
          valid_until: '2026-04-01',
        }),
      ),
    ),
  );

  // Two tables are on the screen once an import is refused. If the filter
  // matched both, the list's own first column would join the reported lines
  // and the assertion below would be a coincidence.
  await expect.poll(() => reportTable(page).count()).toBe(1);

  // Line 1 is the header, so the four data rows are lines 2 to 5 and the three
  // bad ones are 3, 4 and 5 - all of them, in line order, rather than stopping
  // at the first row that is wrong. Otherwise a file with three mistakes in it
  // is three uploads.
  await expect.poll(() => reportedLines(page)).toEqual([3, 4, 5]);
  await expect(reportedReason(page, 3)).toContainText(REFUSALS.duplicateEmail);
  await expect(reportedReason(page, 4)).toContainText(REFUSALS.invalidUser);
  await expect(reportedReason(page, 5)).toContainText(REFUSALS.invalidValidity);

  // Nothing was written - not even line 2, which was fine. That is the rule:
  // an import applies whole or not at all.
  await page.reload();
  await openUsers(page);
  expect(await total(page)).toBe(before);
  await search(page, good.email);
  await expect(userRow(page, good.email)).toHaveCount(0);
});

test('row 7: two rows of one file claiming one address name each other', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const shared = 'e2e.import.twice@kmitl.ac.th';
  const name = 'users-repeat.csv';

  await importUsers(
    page,
    csv(
      header,
      lineFor(header, account({ user_id: '91100021', email: shared })),
      lineFor(header, account({ user_id: '91100022', email: shared })),
    ),
    name,
  );

  // The database can say that line 3 collides; only the importer can say what
  // it collides with, and that is what makes the file fixable without guessing
  // which of the two rows to change.
  await expect.poll(() => reportedLines(page)).toEqual([3]);
  await expect(reportedReason(page, 3)).toContainText('ซ้ำกับบรรทัดที่ 2');
  expect(await total(page)).toBe(before);

  // The same file name again, once it has been corrected. The input's value is
  // cleared after every upload, so choosing the file that was just refused
  // starts a new upload rather than doing nothing at all.
  await importUsers(
    page,
    csv(
      header,
      lineFor(header, account({ user_id: '91100021', email: shared })),
      lineFor(header, account({ user_id: '91100022', email: 'e2e.import.once@kmitl.ac.th' })),
    ),
    name,
  );
  await expect(page.getByText('นำเข้าสำเร็จ 2 รายการ')).toBeVisible();
  await expect.poll(() => total(page)).toBe(before + 2);
});

test('row 7: a file with nothing but a header says so', async ({ page }) => {
  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);

  await importUsers(page, csv(header));

  await expect(page.getByText(REFUSALS.importEmpty)).toBeVisible();
  // An empty file is a refusal, not a success with a count of zero: the two
  // read very differently to somebody who uploaded the wrong file.
  await expect(page.getByText(/นำเข้าสำเร็จ/)).toHaveCount(0);
  expect(await total(page)).toBe(before);
});

test('row 8: the import is bounded by the same scope the list is', async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  const header = headerOf(await downloadTemplate(page));
  const before = await total(page);
  const outside = 'e2e.import.outside@kmitl.ac.th';

  await importUsers(
    page,
    csv(
      header,
      // Department 01, which is the other department administrator's to fill.
      lineFor(
        header,
        account({
          user_id: '91100031',
          email: outside,
          department_id: '01',
          scope_id: '01',
        }),
      ),
    ),
  );

  // A rule the form enforces and the file does not is a rule with a way around
  // it, and a hundred rows at once is exactly when nobody is checking.
  await expect.poll(() => reportedLines(page)).toEqual([2]);
  await expect(reportedReason(page, 2)).toContainText(REFUSALS.scopeNotYours);
  expect(await total(page)).toBe(before);

  // And not merely absent from this account's own list, which is filtered by
  // the same scope and would hide the row either way: the Central Admin, which
  // sees every account there is, cannot find it either.
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, outside);
  await expect(userRow(page, outside)).toHaveCount(0);
});
