'use strict';

const { expect } = require('@playwright/test');
const { importCsv } = require('./import-panel');
const { panel } = require('./confirm-dialog');
const { untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

/**
 * The accounts screen - #11.
 *
 * The first screen this system built an import for, and the one the shared
 * `ImportPanel` was written against, so its rows are the originals the other
 * screens' import rows are copies of.
 */

const USERS = '/main/users';
const API = '/api/users';

/**
 * Waits for the list the screen asks for, whatever the answer turns out to be.
 *
 * Matched on the exact path: the form's own `GET /api/users/grantable` and a
 * row's `GET /api/users/:userId` both live under this one, and a looser match
 * would return whichever of the three answered first.
 */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and waits for the list a passing row is about to assert on to be drawn. */
async function openUsers(page) {
  const response = await openAt(page, USERS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/**
 * Types into the screen's own search box and waits for the answer to the query
 * that box built.
 *
 * Since #272 (13 November 2569) the box is `components/SearchBox.js`, which
 * asks once typing pauses; until then the screen reloaded on every keystroke
 * and several requests were in flight about prefixes of the word. Either way
 * the wait is for the response whose own `q` is the whole term, not merely for
 * the next response to arrive.
 */
async function search(page, term) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === API &&
        new URL(answer.url()).searchParams.get('q') === term,
    ),
    page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill(term),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** This screen's import, bound to the endpoint it posts to. */
const importUsers = (page, text, name = 'users.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * One row of the table, found by the address in its own cell.
 *
 * By cell rather than by `hasText`, because every seeded address ends in the
 * same domain and `admin@kmitl.ac.th` is a substring of
 * `faculty.admin@kmitl.ac.th` - a row matched that loosely would make the
 * scope rows below true by accident, which is the one thing they must not be.
 */
const userRow = (page, email) =>
  page.getByRole('row').filter({ has: page.getByRole('cell', { name: email, exact: true }) });

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * Any table not inside a dialog: since #270 (12 November 2569) a refused
 * import's report is drawn in the import window, which is mounted *above* the
 * list, so the `first()` this used to be - when the report was a box under the
 * list - would have read the report while the window was open. `first()` stays
 * for nothing but a single answer.
 */
const listTable = page =>
  page.locator('xpath=//table[not(ancestor::*[@role="dialog"])]').first();

/**
 * The role column of one account's row, found through the header above it -
 * by header rather than by a number, which would expire the day the table
 * gains a column (#173).
 */
async function roleCell(page, email) {
  const headers = await listTable(page).getByRole('columnheader').allTextContents();
  const column = headers.indexOf('บทบาท');
  expect(column, 'the accounts table has no บทบาท column').toBeGreaterThanOrEqual(0);
  return userRow(page, email).getByRole('cell').nth(column);
}

/**
 * What each grant in a role cell says in full. Since #310 (the owner's answer
 * of 26 November 2569) the cell draws one abbreviation per grant and the role's
 * name with its scope is the abbreviation's `title`, which is where the words
 * of `docs/users-screen.md` rule 1 now live. Read once - callers that need a
 * retrying read wrap it in `expect.poll`.
 */
const grantTitles = cell =>
  cell.locator('abbr').evaluateAll(marks => marks.map(mark => mark.getAttribute('title')));

/** The route one row's switch writes to, which is also where it is held. */
const statusPath = userId => `${API}/${userId}/status`;

/**
 * The button that answers the question the switch asks since #86.
 *
 * It is the delivered screen's own word - `StatusConfirmModal` in
 * `DEEP-QA-FRONTEND` confirmed with `ยืนยันการเปลี่ยน`, and #86 restored a
 * control the rebuild had dropped rather than inventing one. It is an
 * instrument here, for the six files that only need to get *through* the box;
 * what the box *says* is `86a`'s own claim and is written out there as
 * literals, because a row that read its expected text from the helper the
 * screen is driven by would assert nothing (#104).
 */
const CONFIRM_STATUS = 'ยืนยันการเปลี่ยน';

/**
 * One row's status switch - #302.
 *
 * Since #302 (23 November 2569) the control is the delivered screen's switch in
 * the สถานะ column, a `<button role="switch">` named *สถานะ ‹ชื่อ›*, and which
 * way it points is `aria-checked` rather than a verb on a button. Found by role
 * inside the caller's row, so the name is not this helper's premise: `302a`
 * asserts it as a claim.
 */
const statusSwitch = (page, email) => userRow(page, email).getByRole('switch');

/**
 * One row's switch, found only while it offers the change named - #86's verb,
 * kept as the argument since #302.
 *
 * Until #302 this was a button whose name *was* the verb, so a row showing the
 * other direction had no such button and every caller's locator came back
 * empty. The switch keeps that property by being asked for its state:
 * `'ระงับ'` is a switch that is on (pressing it suspends), `'เปิดใช้งาน'` one
 * that is off. So a caller that asserts the direction still asserts it - the
 * row arriving the wrong way round still leaves nothing to find - and the
 * calls written in verbs - ten spec files on 23 November 2569 - did not have
 * to be rewritten as states.
 */
const statusButton = (page, email, label) => {
  if (label !== 'ระงับ' && label !== 'เปิดใช้งาน') {
    throw new Error(`statusButton: no switch state offers ${label}`);
  }
  return userRow(page, email).getByRole('switch', { checked: label === 'ระงับ' });
};

/**
 * One row's แก้ไข - #302: a grey icon named *แก้ไข ‹ชื่อ›*. The name begins
 * with the verb and a space, which is what this matches; `exact: true` on the
 * bare verb found it until that date.
 */
const EDIT_NAME = /^แก้ไข /;
const editButton = row => row.getByRole('button', { name: EDIT_NAME });

/**
 * One account's own page - #303. `GET /api/users/:userId` is what the page
 * reads, matched by the account's path so the list's read is not it.
 */
const EDIT = '/main/users/edit-user/';
const accountOf = answer =>
  /^\/api\/users\/[^/]+$/.test(new URL(answer.url()).pathname) &&
  !['grantable', 'import-template'].some(word => new URL(answer.url()).pathname.endsWith(word)) &&
  answer.request().method() === 'GET';

/**
 * Back to the list from an account's page, by its *แสดงรายชื่อผู้ใช้งานทั้งหมด*,
 * waiting for the list's read - #303. The list comes back at the page and
 * filter the account was opened from, which is what this returns to.
 */
async function backToList(page) {
  const [response] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'แสดงรายชื่อผู้ใช้งานทั้งหมด' }).click(),
  ]);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/**
 * Opens one person's page from the list by the row's แก้ไข, and waits for the
 * page's read of the account and for the details to be drawn - #303.
 *
 * Through the screen's own search box, because ten seeded accounts and a page
 * of ten mean the row being asked for is not necessarily on page one. From an
 * account's page it goes back to the list first. The box is typed into only
 * when it is not already showing this person: the filter survives a visit to
 * an account's page, in the address, so typing the same term a second time
 * changes nothing and fires no request to wait for.
 *
 * `searched` leaves the box as the caller set it, for a row that is about the
 * filter the account was opened from; the row must then be on screen.
 *
 * Lands on *ข้อมูลทั่วไป* in view mode, which is where the page opens.
 */
async function openAccount(page, email, { searched = false } = {}) {
  if (new URL(page.url()).pathname.startsWith(EDIT)) await backToList(page);
  const box = page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้');
  if (!searched && (await box.inputValue()) !== email) await search(page, email);
  const [response] = await Promise.all([
    page.waitForResponse(accountOf),
    editButton(userRow(page, email)).click(),
  ]);
  expect(response.status()).toBe(200);
  // The form is drawn empty for a frame before the account seeds it (#301):
  // wait for the e-mail it was opened by.
  await expect(page.getByLabel('อีเมล', { exact: true })).toHaveValue(email);
  return response;
}

/**
 * Opens one person's details for editing - #303: their page, then
 * *แก้ไขข้อมูล*, which is what opens the fields and puts *บันทึกข้อมูล* on the
 * tab bar.
 */
async function openDetails(page, email, options) {
  const response = await openAccount(page, email, options);
  await page.getByRole('button', { name: 'แก้ไขข้อมูล', exact: true }).click();
  await expect(page.getByLabel('อีเมล', { exact: true })).toBeEnabled();
  return response;
}

/** The edit page's *บันทึกข้อมูล* - #303. The add form's is *บันทึก*. */
const saveDetails = page => page.getByRole('button', { name: 'บันทึกข้อมูล', exact: true });

/**
 * Which cell of a row is its user id - #302.
 *
 * `support/pager.js`'s `keysOn` reads the first cell as a row's key, and since
 * #302 the first cell is ลำดับ, which two pages never share either - so a read
 * left on the first cell would still find page two disjoint from page one and
 * say nothing about who is on it. Every `keysOn` of this table passes this.
 */
const CODE_CELL = 'td:nth-child(2)';

/**
 * Presses it, which since #86 asks rather than writes.
 *
 * The row is found by the caller's address and not again here: the screen
 * reloads the list on the same search term after a status change, so the row is
 * still on screen with its switch pointing the other way (until #302, the
 * other verb on its button) - and typing the term a
 * second time would set the box to what it already holds, fire no change event
 * and wait for a request that is never sent.
 */
const startStatusChange = (page, email, label) => statusButton(page, email, label).click();

/**
 * Answers the question. Scoped to the dialog's own box rather than to the page,
 * because the table underneath it is live the whole time (#204, whose
 * announcing half landed on 18 ตุลาคม 2569; #217 contained the focus the
 * same day, which stops the keyboard reaching that table but leaves it drawn,
 * so the scoping is still what tells the two ยืนยัน buttons apart).
 */
const confirmStatusChange = page =>
  panel(page).getByRole('button', { name: CONFIRM_STATUS, exact: true }).click();

/**
 * The whole change as a person performs it - ask, confirm, and wait for the
 * answer to the one write it makes.
 *
 * The `PUT` is waited for from behind the confirming press rather than before
 * it, because nothing is sent until the question is answered: that is #86's
 * first claim, and a helper that waited for the write around the *first* press
 * would hang on the fixed code and pass on the broken one.
 */
async function setStatusByHand(page, email, userId, label) {
  await startStatusChange(page, email, label);
  const [answer] = await Promise.all([
    page.waitForResponse(
      response =>
        new URL(response.url()).pathname === statusPath(userId) &&
        response.request().method() === 'PUT',
    ),
    confirmStatusChange(page),
  ]);
  return answer;
}

/** The list's one form since #303, and the heading it is drawn under. */
const ADD = 'เพิ่มผู้ใช้งาน';

/**
 * Opens เพิ่มผู้ใช้งาน and fills what a create needs, leaving บันทึก unpressed -
 * #303, for the rows that used the list's edit form as an instrument for *a
 * save the list reloads after*. Since #303 the add is the only such save the
 * list has, so those rows press this one; `247b`'s `createAccount` is the
 * same steps with the waits of its own claim.
 *
 * The grant is not optional - the route refuses a create carrying none - and
 * the department and the scope have to be the signed-in administrator's own,
 * which is why both are arguments. The pickers are found by the sentinel option
 * each carries, a label wrapping a `<select>` reading as every option (#180).
 */
async function fillNewAccount(
  page,
  { id, email, first },
  { department = '05', role = 'TEACHER', scope = department } = {},
) {
  await page.getByRole('button', { name: ADD, exact: true }).click();
  await expect(page.getByRole('heading', { name: ADD, exact: true })).toBeVisible();
  await page.getByLabel('รหัสผู้ใช้', { exact: true }).fill(id);
  await page.getByLabel('อีเมล', { exact: true }).fill(email);
  await page.getByLabel('ชื่อ (ไทย)', { exact: true }).fill(first);
  await page.getByLabel('นามสกุล (ไทย)', { exact: true }).fill('ผู้ทดสอบ');
  await page.getByRole('combobox', { name: 'ภาควิชา', exact: true }).selectOption(department);
  await page.locator('select:has(option:text-is("— เลือกบทบาท —"))').selectOption(role);
  const scopes = page.locator('select:has(option:text-is("— เลือกขอบเขต —"))');
  await expect(scopes.locator(`option[value="${scope}"]`)).toHaveCount(1);
  await scopes.selectOption(scope);
}

module.exports = {
  USERS,
  ADD,
  fillNewAccount,
  API,
  CONFIRM_STATUS,
  waitForList,
  openUsers,
  search,
  importUsers,
  userRow,
  listTable,
  roleCell,
  grantTitles,
  statusPath,
  statusButton,
  statusSwitch,
  editButton,
  EDIT_NAME,
  EDIT,
  backToList,
  openAccount,
  openDetails,
  saveDetails,
  CODE_CELL,
  startStatusChange,
  confirmStatusChange,
  setStatusByHand,
};
