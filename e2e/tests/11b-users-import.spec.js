'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  BOM,
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
 * docs/acceptance/11-user-accounts.md, row 5, rows 6-7 and the import half of
 * row 8 -
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
  await expect.poll(() => total(page)).toBe(before);
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

  // No count is read here, and that is deliberate. `ImportPanel` re-fetches the
  // list only when an import succeeds, so after a refusal the number on the
  // screen is the one from before the upload whatever the server did with the
  // file - it reads the same whether the rollback held or leaked, and no
  // mutation can make it fail. The row above is where the rollback is proved,
  // by a read taken afresh from the server, and it proves it for this file too:
  // a duplicate within the file is an entry in the same `errors` array, and
  // `backend/lib/importer.js` rolls the transaction back on `errors.length > 0`
  // once, for every refusal there is.

  // The same file name again, once it has been corrected. The input's value is
  // cleared after every upload, so choosing the file that was just refused
  // starts a new upload rather than doing nothing at all. The count below is
  // read against the same unfiltered list `before` was read from; anything
  // inserted above that narrows the list - a `search`, a page - makes it wrong
  // rather than flaky.
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

  await importUsers(page, csv(header));

  await expect(page.getByText(REFUSALS.importEmpty)).toBeVisible();
  // An empty file is a refusal, not a success with a count of zero: the two
  // read very differently to somebody who uploaded the wrong file. There is no
  // count read after it: a file with no rows in it has nothing to write, so
  // there is no mutation that could move the number, and an assertion nothing
  // can kill is not proof of anything.
  await expect(page.getByText(/นำเข้าสำเร็จ/)).toHaveCount(0);
});

test('row 8: the import is bounded by the same scope the list is', async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  const header = headerOf(await downloadTemplate(page));
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

  // That the row was not written is asked of the server rather than read off
  // the screen, and asked of the one account that could not be fooled by the
  // asking. This account's own list is filtered by the same scope and would
  // hide a leaked row either way; the Central Admin sees every account there
  // is, and cannot find it.
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, outside);
  await expect(userRow(page, outside)).toHaveCount(0);
});

/*
 * The two rows below are #124's and were appended rather than filed beside the
 * other row-5 row, because this file is `mode: 'serial'` and every citation in
 * `docs/acceptance/11-user-accounts.md` names a row by its position. Inserting
 * mid-file moves all of them, which is the drift `50-sign-in-screens.md` paid
 * for three times in one day.
 */

test('row 5: the template names nobody, and uploading it unchanged creates nobody', async ({
  page,
}) => {
  // #124. The example row was a whole account - `66010001`,
  // `somchai.ja@kmitl.ac.th`, active, with a `TEACHER` grant on department 05 -
  // so the first thing anybody does with a template answered `201 created=1`
  // and wrote it into a register this application has no route to remove a row
  // from.
  //
  // Driven from the screen and not from the endpoint on purpose: what the
  // criterion says is *the file the button gives me, sent back through the box
  // beside it*, and the client re-adds the byte-order mark the Fetch
  // specification strips (#62), so the endpoint's answer and the file that
  // reaches the disk are not the same bytes.
  const template = await downloadTemplate(page);
  expect(template.name).toBe('users-template.csv');

  // `17b` and `18b` assert this byte for their own templates and this file did
  // not - it had no row about the download at all until #124 - so the row that
  // downloads the file the sheet describes as carrying a BOM is the row that
  // should look at it. What it is at risk from is in the other seam: deleting
  // the server's mark at `csv.js:140` leaves this green, because the client
  // re-adds one (#62). `18:nobom` is what can fail this.
  expect(template.text.startsWith(BOM)).toBe(true);

  const lines = template.text.replace(BOM, '').split(/\r?\n/).filter(Boolean);
  expect(lines).toEqual([headerOf(template)]);
  // Counting the lines is not the claim. A file may carry an address in a
  // comment row, or in a second header, and still be one line long by that
  // count, so the two things the sample was made of are asked for by shape.
  expect(template.text).not.toMatch(/@/);
  expect(template.text).not.toMatch(/\d{8}/);

  await importUsers(page, template.text);
  await expect(page.getByText(REFUSALS.importEmpty)).toBeVisible();

  // No count is read after a refused import. `ImportPanel` calls `onImported`
  // on success alone, so the list is not fetched again and the number on
  // screen is the number from before the upload - an assertion that cannot
  // fail, which is what #64 deleted four of from this file and from `14b`.
  // What is asked instead goes back to the server: the account the sample used
  // to make, by name.
  await search(page, 'somchai.ja@kmitl.ac.th');
  await expect(userRow(page, 'somchai.ja@kmitl.ac.th')).toHaveCount(0);
});

test('row 5: the screen states the rules the header cannot', async ({ page }) => {
  // The other half of #124, and the reason the sample could be taken out at
  // all. The header still carries all fifteen column names; what went with the
  // example row is how to fill them, and these three are the ones no header
  // could have stated. Three of the seven notes are asserted here, chosen as the
  // three a person is most likely to get wrong - which language a name may be in, an era that is not the
  // one a Thai form usually asks for (#125), and a password that is required
  // for two role codes and useless for the rest (nothing on this path refuses
  // one; `accounts.js:275` turns it away at sign-in).
  //
  // Asserted before the template is downloaded, in the order a person meets
  // them: guidance that arrives after the file has been filled in is guidance
  // that arrived too late.
  await expect(page.getByRole('heading', { name: 'รูปแบบข้อมูลในไฟล์' })).toBeVisible();

  for (const rule of ['ภาษาไทยหรือภาษาอังกฤษก็ได้', 'ปี ค.ศ.', 'FULL_ADMIN และ EXT_ASSESSOR']) {
    await expect(page.getByRole('listitem').filter({ hasText: rule })).toHaveCount(1);
  }
});
