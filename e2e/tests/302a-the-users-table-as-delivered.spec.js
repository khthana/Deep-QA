'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS, IDS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { panel } = require('../support/confirm-dialog');
const { reading, step } = require('../support/pager');
const {
  openUsers,
  search,
  userRow,
  listTable,
  statusPath,
  statusSwitch,
  editButton,
  waitForList,
} = require('../support/users-screen');

/**
 * docs/acceptance/11-user-accounts.md §#302.
 *
 * The owner's answer of 22 November 2569 (`docs/users-screen.md` rules 1-3) put
 * the accounts table back in the delivered screen's shape
 * (`DEEP-QA-FRONTEND/.../UserMangement/UserTable.js`), and four questions of
 * 23 November 2569 settled the words it left open: the delivered headers word
 * for word, ดำเนินการ over the rule's own จัดการ, a ลำดับ that runs on across
 * pages, and the switch alone with no word beside it.
 *
 * What a browser can hold of that is below. The look of the switch and of the
 * grey icon - their colours, sizes and where they sit in the cell - is the
 * sheet's walked rows.
 *
 * `hold()`, because rows 4 and 5 really change an account's status through its
 * route, and a row that fails between its two arrangements would leave it
 * suspended for every file after this one (#134).
 */

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** The nine headers, in the order the owner's rule 1 puts them. */
const HEADERS = [
  'ลำดับ',
  'รหัสผู้ใช้งาน',
  'ชื่อ สกุล (ไทย)',
  'ชื่อ สกุล (อังกฤษ)',
  'อีเมล',
  'บทบาท',
  'ช่วงเวลาใช้งาน',
  'สถานะ',
  'ดำเนินการ',
];

/**
 * `teach01` as the seed writes it (`db/seed.js`, `U_TEACH`), each language
 * with its own title - and as literals, because a row that built its expected
 * name with the helper the screen draws it with would assert nothing (#104).
 */
const THAI = 'ดร. อนันต์ สอนดี';
const ENGLISH = 'Dr. Anan Sondee';

/** One cell of a row, by the header above it. */
const cellOf = (page, email, header) =>
  userRow(page, email).getByRole('cell').nth(HEADERS.indexOf(header));

/** The ordinal cell of every row the table is drawing, as numbers. */
async function ordinals(page) {
  const texts = await listTable(page).locator('tbody tr td:first-child').allInnerTexts();
  return texts.map(text => Number(text.trim()));
}

test('row 1: the nine columns, in the delivered words and the owner\'s order', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  const headers = await listTable(page).getByRole('columnheader').allInnerTexts();
  expect(headers.map(text => text.trim())).toEqual(HEADERS);
});

test('row 2: each name in its own language, in its own column', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherOne);

  await expect(cellOf(page, ACCOUNTS.teacherOne, 'รหัสผู้ใช้งาน')).toHaveText(IDS.teacherOne);
  await expect(cellOf(page, ACCOUNTS.teacherOne, 'ชื่อ สกุล (ไทย)')).toHaveText(THAI);
  await expect(cellOf(page, ACCOUNTS.teacherOne, 'ชื่อ สกุล (อังกฤษ)')).toHaveText(ENGLISH);
  await expect(cellOf(page, ACCOUNTS.teacherOne, 'อีเมล')).toHaveText(ACCOUNTS.teacherOne);
});

test('row 3: ลำดับ runs on across pages rather than starting again', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);

  const first = await reading(page, listTable(page));
  expect(first.pages, 'a page two to read the ordinal on').toBeGreaterThan(1);
  expect(await ordinals(page)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  // Page two is where the delivered screen's `index + 1` and the true ordinal
  // part company, so it is the page the claim is read on (#154).
  await step(page, 'forward', waitForList);
  expect((await reading(page, listTable(page))).shown).toBe(2);
  const second = await ordinals(page);
  expect(second.length, 'rows on page two').toBeGreaterThan(0);
  expect(second).toEqual(second.map((_, at) => 11 + at));
});

test('row 4: สถานะ is a switch named for the account, pointing the way the account is', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  // Arranged both ways at the route, so each direction is read on a row that
  // was put there rather than on whatever the files before left (#129).
  for (const [status, checked] of [
    ['inactive', false],
    ['active', true],
  ]) {
    const arranged = await page.request.put(`${BACKEND_URL}${statusPath(IDS.teacherTwo)}`, {
      data: { status },
    });
    expect(arranged.status(), `the account arranged ${status}`).toBe(200);

    await openUsers(page);
    await search(page, ACCOUNTS.teacherTwo);
    const toggle = statusSwitch(page, ACCOUNTS.teacherTwo);
    await expect(toggle, 'one switch in the row').toHaveCount(1);
    await expect(toggle).toHaveAccessibleName('สถานะ ดร. ภัทรา ว่างสอน');
    await expect(toggle, `the switch of an account that is ${status}`).toHaveAttribute(
      'aria-checked',
      String(checked),
    );
    await expect(toggle).toBeEnabled();
    // The switch alone: the owner's answer of 23 November 2569 kept the
    // delivered cell, which says nothing in words.
    await expect(cellOf(page, ACCOUNTS.teacherTwo, 'สถานะ')).toHaveText('');
  }
});

test('row 5: the switch does not move until the question is answered, nor when it is not', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  const arranged = await page.request.put(`${BACKEND_URL}${statusPath(IDS.teacherTwo)}`, {
    data: { status: 'active' },
  });
  expect(arranged.status()).toBe(200);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherTwo);

  const toggle = statusSwitch(page, ACCOUNTS.teacherTwo);
  await toggle.click();
  await expect(panel(page), 'the question #86 asks').toBeVisible();
  await expect(toggle, 'the switch while the question is open').toHaveAttribute(
    'aria-checked',
    'true',
  );

  await panel(page).getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(toggle, 'the switch after ยกเลิก').toHaveAttribute('aria-checked', 'true');
});

test('row 6: แก้ไข is an icon named for the account, with the name as its tooltip', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  await search(page, ACCOUNTS.teacherOne);

  const pencil = editButton(userRow(page, ACCOUNTS.teacherOne));
  await expect(pencil, 'one แก้ไข in the row').toHaveCount(1);
  await expect(pencil).toHaveAccessibleName(`แก้ไข ${THAI}`);
  await expect(pencil, 'its tooltip').toHaveAttribute('title', `แก้ไข ${THAI}`);
  expect((await pencil.textContent()).trim(), 'no word drawn beside it').toBe('');
  await expect(pencil.locator('svg'), 'it holds one icon').toHaveCount(1);

  // Since #303 the press opens the account's own page rather than a form.
  await pencil.click();
  await expect(page).toHaveURL(new RegExp(`/main/users/edit-user/${IDS.teacherOne}(\\?|$)`));
  await expect(page.getByRole('heading', { name: 'แก้ไขข้อมูลผู้ใช้งานระบบ', exact: true })).toBeVisible();
});
