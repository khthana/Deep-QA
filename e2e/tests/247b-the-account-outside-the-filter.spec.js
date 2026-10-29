'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { DEPARTMENTS } = require('../../db/seed');
const { hold } = require('../support/hold');
const { signIn } = require('../support/auth');
const { OUTSIDE_THE_FILTER } = require('../support/outside-the-filter');
const { API, openUsers, search, userRow } = require('../support/users-screen');

/**
 * #247 — ประโยคของบัญชีที่ตกนอกตัวกรองของทะเบียนผู้ใช้
 *
 * `247a` ถือกฎร่วมของ #247 ที่ `Plos` และสำมะโนถืออีกห้าจอที่ถามคำถามเดียวกัน
 * ด้วย `outsideFilter(filter, saved)` — ตัวกรองหนึ่งค่า เทียบกับค่าหนึ่งค่าที่ฟอร์มเขียน
 *
 * **แฟ้มนี้ถือจอที่เจ็ด ซึ่งสำมะโนอ่านไม่ได้** `pages/Users.js` ไม่มีตัวกรองรูปนั้นเลย:
 * ตัวกรองของมันคือ *คำค้น* *บทบาท* และ *สถานะ* และแต่ละอย่างถามด้วยกลไกที่เซิร์ฟเวอร์
 * กรองจริง ไม่ใช่ด้วยช่องที่ฟอร์มถือ (#174) — `outsideTheFilters` ใน `pages/Users.js`
 * เขียนไว้ว่าอันไหนถามอะไร และอันไหนถามเฉพาะตอน *สร้าง*
 *
 * ฉะนั้นกฎที่นี่เป็นโค้ดของจอนี้เอง ไม่ใช่การเรียกใช้กฎร่วม และกฎของจอหนึ่งจอที่ไม่มีแถว
 * ถืออยู่คือข้ออ้างที่ไม่มีอะไรวัด (#68 อ่านจากอีกด้าน: สำมะโนถือจอที่ *ใช้กลไกร่วม*
 * ไม่ใช่จอที่เขียนกลไกของตัวเอง)
 *
 * ## ห้าแถว หนึ่งแถวต่อหนึ่งกิ่ง และสองแถวคุม
 *
 * - **คำค้น** — `ILIKE '%' || $3 || '%'` เหนืออีเมล รหัสผู้ใช้ และชื่อสองคู่
 *   (`backend/routes/users.js` ตรง `ILIKE`) ถามทั้งตอนสร้างและตอนแก้
 * - **บทบาท** — `EXISTS` เหนือ `user_roles` และบัญชีที่สร้างถือสิทธิ์เดียวคือสิทธิ์แรกที่
 *   ฟอร์มส่งมา — `backend/routes/users.js` ตรง `if (!role)` ปฏิเสธการสร้างที่ไม่มีสิทธิ์เลยด้วยคำว่า
 *   *ไม่มีสิทธิ์ก็เข้าระบบไม่ได้* ฉะนั้นกิ่งนี้คือ *สิทธิ์ที่เลือกไม่ใช่สิทธิ์ที่กรองอยู่*
 *   ไม่ใช่ *ไม่มีสิทธิ์* (วัดเมื่อ 29 ตุลาคม 2569 จากแถวที่ล้ม ไม่ใช่จากการอ่านโค้ด)
 * - **สถานะ** — `INSERT` เขียน `'active'` ตายตัว ฉะนั้นตัวกรอง *ถูกระงับ* กันแถวที่เพิ่ง
 *   สร้างออกไปทุกครั้ง
 * - **แถวคุม** คือคำค้นเดียวกันกับแถวแรก ต่างกันที่อีเมลถือคำนั้น — เกณฑ์ที่ตอบว่า *ไม่*
 *   ต้องมีแถวเท่ากับเกณฑ์ที่ตอบว่า *ใช่* (#48) และเป็นแถวที่ฆ่ามัตแตนต์ *พูดทุกครั้ง*
 * - **แถวคุมที่สอง** คือคำค้นเดียวกันนั้นที่มีช่องว่างขนาบหน้าหลัง เซิร์ฟเวอร์อ่านคำค้นผ่าน
 *   `blankToNull` ซึ่ง trim ก่อน ฉะนั้นแถวอยู่ในรายการ และจอต้องไม่ต่อประโยคร่วม นี่คือ
 *   ข้อบกพร่องของการแก้ของตั๋วนี้เอง ที่รีวิวของ 29 ตุลาคม 2569 จับได้: จอ restate กฎของ
 *   เซิร์ฟเวอร์ไม่ตรง จึงต่อประโยคเหนือรายการที่ **ถือ** แถวนั้นอยู่ ซึ่งเป็นทางที่ดัง (#96)
 *
 * ทุกแถวตั้งตัวกรองก่อนเปิดฟอร์ม เพราะนั่นคือลำดับที่คน ๆ หนึ่งทำ และเพราะกุญแจของ
 * ประโยคคือหน้าและตัวกรองที่ `save` ถูกส่งออกไปจาก (#207, #239)
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่า `%` หรือ `_` ในคำค้นจะว่าอะไร** `ILIKE` อ่านมันเป็นตัวแทน ส่วน
 *   `matchesSearch` อ่านเป็นอักษรจริง จึงตอบ *อยู่ใน* และไม่ต่อประโยค — ทิศที่เงียบ
 *   ซึ่งเขียนไว้ที่ `outsideTheFilters` พร้อมเหตุผล
 * - **ไม่ได้พูดเรื่องขอบเขตสิทธิ์** บัญชีที่สร้างนอกขอบเขตของคนที่สร้างหายจากรายการ
 *   ด้วยกลไกอื่นและด้วยประโยคอื่น ซึ่งเป็น #251 ทุกแถวที่นี่จึงกรอก **รหัสภาควิชา**
 *   เป็นภาควิชาของผู้ดูแลที่ลงชื่อเข้าใช้ เพื่อให้กลไกนั้นไม่มาปนกับสิ่งที่วัด
 * - **ไม่ได้พูดว่าถ้อยคำถูกต้องไหม** ถ้อยคำเป็นของเจ้าของงาน (`docs/06` §Out of Scope)
 *
 * `hold()` คืนสกีมาทั้งอัน เพราะทะเบียนผู้ใช้ไม่มีการลบผ่านจอ ฉะนั้นสี่บัญชีที่แถวเหล่านี้
 * สร้างต้องออกใต้ตะเข็บ (#134, #233)
 *
 * **ไม่ใช่ `serial`** ทั้งที่แฟ้มของตระกูลนี้ส่วนใหญ่เป็น: แต่ละแถวลงชื่อเข้าใช้เอง ตั้งตัวกรอง
 * ของตัวเอง และสร้างบัญชีคนละใบ ส่วนสิ่งที่คืนโลกให้แถวถัดไปคือ `hold()` ของทั้งแฟ้ม
 * ไม่ใช่การลบของแถวที่ผ่าน ฉะนั้นแถวแดงหนึ่งแถวไม่ได้ทำให้โลกของแถวถัดไปผิด — และ
 * สิ่งที่ `serial` จะเอาไป คือการอ่านว่ามัตแตนต์ตัวไหนฆ่าแถวไหน เพราะแถวแรกที่ตายใน
 * แฟ้ม `serial` ทำให้ที่เหลือไม่ถูกรันเลย (#67, #88)
 */

/** The screen's own sentence, which all four rows read and three add to. */
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

const ADD = 'เพิ่มผู้ใช้งาน';

/** The department the signed-in administrator holds, so that #251 is not in the way. */
const DEPARTMENT = DEPARTMENTS[0].id;

/**
 * A term no seeded account holds, in any of the four columns the server searches.
 *
 * Asserted rather than assumed below: a term the seed happens to hold would make
 * the first row's *the list does not hold it* true for the wrong reason.
 */
const TERM = 'zz247';

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * The list the screen asks for, by the filter it is asking with.
 *
 * Matched on the exact path and on the parameter the row has just set, for
 * `users-screen.js`'s reason: the form's own `grantable` and a row's detail both
 * live under this path, and a looser match returns whichever answered first.
 */
const listedWith = (page, matches) =>
  page.waitForResponse(answer => {
    const url = new URL(answer.url());
    return url.pathname === API && answer.request().method() === 'GET' && matches(url.searchParams);
  });

/** The two filter boxes, told apart by the sentinel option each one carries. */
const roleBox = page => page.locator('select:has(option:text-is("ทุกบทบาท"))');
const statusBox = page => page.locator('select:has(option:text-is("ทุกสถานะ"))');

/** The add-account form's two grant boxes, found the same way. */
const rolePicker = page => page.locator('select:has(option:text-is("— เลือกบทบาท —"))');
const scopePicker = page => page.locator('select:has(option:text-is("— เลือกขอบเขต —"))');

/** The grant every row creates its account with, and the one row 3 filters away from. */
const GRANTED = 'TEACHER';
const FILTERED_AWAY = 'PROG_MANAGER';

/**
 * Fills the add-account form and sends it, waiting for both the write and the
 * read that follows it.
 *
 * The read is waited for as well as the write because the sentence is handed
 * over for `load` to say (#203, #238): a row that read the notice behind the
 * `POST` alone would be reading the screen one turn too early.
 */
async function createAccount(page, { id, email, first }) {
  await page.getByRole('button', { name: ADD }).click();
  await expect(page.getByRole('heading', { name: ADD })).toBeVisible();

  await page.getByLabel('รหัสผู้ใช้', { exact: true }).fill(id);
  await page.getByLabel('อีเมล', { exact: true }).fill(email);
  await page.getByLabel('ชื่อ (ไทย)', { exact: true }).fill(first);
  await page.getByLabel('นามสกุล (ไทย)', { exact: true }).fill('ผู้ทดสอบ');
  await page.getByLabel('รหัสภาควิชา', { exact: true }).fill(DEPARTMENT);

  // The grant the account is created with. Not optional: the route refuses a
  // create that carries none, and `placeAllowed` refuses one placed outside the
  // signing-in administrator's own scope - which is why the department above is
  // theirs. Both pickers are found by the sentinel option they carry, because a
  // label that wraps its `<select>` reads as the label plus every option (#180).
  await rolePicker(page).selectOption(GRANTED);
  await scopePicker(page).selectOption(DEPARTMENT);

  const [written] = await Promise.all([
    page.waitForResponse(
      answer => new URL(answer.url()).pathname === API && answer.request().method() === 'POST',
    ),
    listedWith(page, () => true),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  expect(written.status()).toBe(201);
}

test('row 1: a search term the new account does not hold', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  const answered = await search(page, TERM);
  const { users } = await answered.json();
  expect(users, 'the precondition of the claim: no seeded account holds the term').toHaveLength(0);

  await createAccount(page, {
    id: 'z247a',
    email: 'row.one.247@kmitl.ac.th',
    first: 'หนึ่ง',
  });

  await expect(
    page.getByRole('status'),
    "the screen's own sentence, and the shared one saying where the row is not",
  ).toHaveText(`${SAVED} ${OUTSIDE_THE_FILTER}`);
  await expect(
    userRow(page, 'row.one.247@kmitl.ac.th'),
    'the list the sentence stands over does not hold the account that was created',
  ).toHaveCount(0);
});

test('row 2: the same term, held by the new account, says only what the screen said before', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);
  await search(page, TERM);

  await createAccount(page, {
    id: 'z247b',
    email: `row.two.${TERM}@kmitl.ac.th`,
    first: 'สอง',
  });

  await expect(
    page.getByRole('status'),
    'nothing added to a sentence whose own list holds the row',
  ).toHaveText(SAVED);
  await expect(
    userRow(page, `row.two.${TERM}@kmitl.ac.th`),
    'which the list does',
  ).toHaveCount(1);
});

test('row 3: a role filter the new account does not hold', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  expect(FILTERED_AWAY, 'the precondition: the filter is not the grant').not.toBe(GRANTED);
  await Promise.all([
    listedWith(page, params => params.get('role') === FILTERED_AWAY),
    roleBox(page).selectOption(FILTERED_AWAY),
  ]);

  await createAccount(page, {
    id: 'z247c',
    email: 'row.three.247@kmitl.ac.th',
    first: 'สาม',
  });

  await expect(
    page.getByRole('status'),
    'an account granted one role is outside a list of another',
  ).toHaveText(`${SAVED} ${OUTSIDE_THE_FILTER}`);
  await expect(userRow(page, 'row.three.247@kmitl.ac.th'), 'and is not in it').toHaveCount(0);
});

test('row 4: a status filter the insert cannot satisfy', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  await Promise.all([
    listedWith(page, params => params.get('status') === 'inactive'),
    statusBox(page).selectOption('inactive'),
  ]);

  await createAccount(page, {
    id: 'z247d',
    email: 'row.four.247@kmitl.ac.th',
    first: 'สี่',
  });

  await expect(
    page.getByRole('status'),
    "a created account is `'active'`, so a list of suspended ones never holds it",
  ).toHaveText(`${SAVED} ${OUTSIDE_THE_FILTER}`);
  await expect(userRow(page, 'row.four.247@kmitl.ac.th'), 'and is not in it').toHaveCount(0);
});

/**
 * The same term with a space on each side of it.
 *
 * The route reads the term through `blankToNull`, which trims before it decides
 * whether there is a filter at all, so this is the bare term to the server and
 * the account it creates is in the list. The screen has to read it the same way
 * (#96): restating it loosely added the shared sentence over a list that did
 * hold the row - the noisy direction, found by the review of 29 ตุลาคม 2569 and
 * not by a row, because no row had asked.
 *
 * The precondition is the text and not the answer: row 2 above has already
 * created an account holding the bare term, so the list is not empty by the time
 * this row runs, and *the list holds the row this row created* is the claim.
 */
const PADDED = ` ${TERM} `;

test('row 5: a search term with a space around it, which the route trims', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openUsers(page);

  expect(PADDED, 'the precondition of the claim: the term is not the one the route reads').not.toBe(
    TERM,
  );
  await search(page, PADDED);

  await createAccount(page, {
    id: 'z247e',
    email: `row.five.${TERM}@kmitl.ac.th`,
    first: 'ห้า',
  });

  await expect(
    page.getByRole('status'),
    'the route trims the term, so the row is in the list and there is nothing to add',
  ).toHaveText(SAVED);
  await expect(
    userRow(page, `row.five.${TERM}@kmitl.ac.th`),
    'which the list holds',
  ).toHaveCount(1);
});
