'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  openRegister,
  total,
  addStudent,
  filterProgram,
  registerRow,
} = require('../support/students-screen');

/**
 * docs/acceptance/17-students.md, rows 10 and 11 — the filter and the code
 * that is already taken.
 *
 * Only these two of the register's rows are here. Rows 1 to 9 and 18 state
 * what the screen *draws* — a grey box with no options, a field that refuses
 * keystrokes, a disabled button, the programmes a dropdown offers — and #65 is
 * explicit that such halves stay with the person walking. What rows 10 and 11
 * state is a count, an absence and a refusal, which is the same shape as the
 * import rows next door.
 *
 * Both rows are written against the register as this run leaves it rather than
 * against the seed's 173, because 17b writes students too and the file order
 * is not a thing to depend on.
 *
 * `mode: 'serial'` because row 11 is about the student row 10 added.
 */
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openRegister(page);
});

test('row 10: the หลักสูตร filter filters, and the total follows it', async ({ page }) => {
  const before = await total(page);

  // The two students rows 5 and 9 of the checklist add, added here because
  // this row is about telling them apart, not about the banner either of them
  // raises.
  expect((await addStudent(page, {
    code: '61010001',
    first: 'สมหญิง',
    last: 'เรียนดี',
    program: '0501',
  })).status()).toBe(201);
  expect((await addStudent(page, {
    code: '67010002',
    first: 'ชาย',
    last: 'ทดสอบ',
    program: '0503',
  })).status()).toBe(201);

  await expect.poll(() => total(page)).toBe(before + 2);
  // Newest added first: `61010001` is older than every seeded code and still
  // reached page 1. Sorted by code it would be on the last page.
  await expect(page.locator('tbody tr').first()).toContainText('67010002');
  await expect(registerRow(page, '61010001')).toHaveCount(1);

  await filterProgram(page, '0501');
  await expect(registerRow(page, '67010002')).toHaveCount(0);
  await expect(registerRow(page, '61010001')).toHaveCount(1);
  expect(await total(page)).toBe(before + 1);

  await filterProgram(page, '0503');
  await expect(registerRow(page, '67010002')).toHaveCount(1);
  expect(await total(page)).toBe(1);
});

test('row 11: a code the register already holds is refused, and the student it holds is untouched', async ({
  page,
}) => {
  const before = await total(page);

  const refused = await addStudent(page, {
    code: '61010001',
    first: 'คนละคน',
    last: 'ไม่ควรทับ',
    program: '0501',
  });
  expect(refused.status()).toBe(409);

  // The whole rule is in what did not happen: the form's add path must not be
  // the import's overwrite path. If it were, this would answer 200 and the
  // register would quietly hold a different person under the same code.
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  expect(await total(page)).toBe(before);
  await expect(registerRow(page, '61010001')).toContainText('สมหญิง เรียนดี');
  await expect(registerRow(page, '61010001')).not.toContainText('ไม่ควรทับ');
});
