'use strict';

const { expect } = require('@playwright/test');
const { importCsv, downloadTemplate, headerOf, csv } = require('./import-panel');
const { untilDrawn, reading } = require('./pager');
const { openAt } = require('./navigation');

const DEPARTMENTS = '/main/departments';
const API = '/api/departments';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Opens the screen and waits for the list a passing row is about to assert on to be drawn. */
async function openDepartments(page) {
  const response = await openAt(page, DEPARTMENTS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

/** This screen's import, bound to the endpoint it posts to. */
const importDepartments = (page, text, name = 'departments.csv') =>
  importCsv(page, { path: `${API}/import`, text, name });

/**
 * One row of the table, found by the identifier in its first cell.
 *
 * By cell rather than by `hasText`, because a two-character identifier such as
 * `05` appears inside other rows' text and inside the pager's line, and a row
 * matched that loosely would make a count assertion true by accident.
 */
const departmentRow = (page, departmentId) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: departmentId, exact: true }) });

/**
 * Opens the editor on one row and waits for the department to be read back.
 *
 * The screen asks for the record again when the pencil is pressed rather than
 * drawing the form from the row in hand, so the status box below is showing
 * what the server holds and not what the list happened to carry.
 */
async function openEditor(page, departmentId) {
  await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `${API}/${departmentId}` &&
        answer.request().method() === 'GET',
    ),
    departmentRow(page, departmentId).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไขภาควิชา' })).toBeVisible();
}

/**
 * The form's status control.
 *
 * A `select` since #180, which the owner answered on 22 October 2569 in favour
 * of the shape two of the five forms already had and of the words the table's
 * own badge uses. It was a checkbox reading *เปิดใช้งาน* until then. In this
 * file that answer is one line; across the suite it was nine rows at nine
 * sites, which is what sheet `14`'s §#181 had predicted otherwise.
 *
 * Found by its accessible name, which is the only name it has: the hint
 * paragraph and the `disabled` the other two forms carry are #228, a separate
 * ticket by the same answer. By the **role** and not by `getByLabel`, because `Field`
 * wraps the control in the `<label>` and a wrapping label's text content
 * carries the `<option>`s with it - the name is `สถานะ` and the label's text is
 * `สถานะใช้งานอยู่ปิดใช้งาน`.
 */
const statusField = page => page.getByRole('combobox', { name: 'สถานะ' });

/** Presses *บันทึก* and waits for the list the save reloads. */
async function save(page) {
  const [reloaded] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return reloaded;
}

/**
 * The status badge of one row - the fourth cell, as the table's own header
 * orders them (รหัส · ชื่อ (ไทย) · ชื่อ (อังกฤษ) · สถานะ · จัดการ).
 */
const statusOf = (page, departmentId) =>
  departmentRow(page, departmentId).getByRole('cell').nth(3);

/**
 * The screen's own list, told apart from the rejection report's table.
 *
 * `first()` because the list is drawn above the import panel, and a refused
 * import puts the report's table on the screen underneath it.
 */
const listTable = page => page.locator('table').first();

/**
 * Deletes one department through the screen's own confirmation, and waits for
 * the list that follows.
 *
 * The wait is for a list request rather than for the banner, because the row
 * this serves — `57-pager.md` row 3 — is about *which page* the screen lands
 * on afterwards, and that is decided by the request it sends.
 */
async function removeDepartment(page, departmentId) {
  await departmentRow(page, departmentId).getByRole('button', { name: 'ลบ' }).click();
  const [answer] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'ลบภาควิชา' }).click(),
  ]);
  expect(answer.status()).toBe(200);
  return answer;
}

/**
 * The letters the imported codes are built from, in the order they sort in.
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Imports enough departments for a third page holding exactly `rows` of them,
 * and answers how many there are afterwards.
 *
 * Counted from what is in the table rather than written down, because what the
 * files before this one left there decides it (#132) - and idempotent, so a
 * second row of the same file finds the first row's import rather than adding
 * to it. The rows go in through the screen's own panel, the only way the
 * administrator accounts write departments, and the total the pager reads out
 * is the evidence the import landed (`14b` is the file that asserts the panel's
 * own sentence).
 *
 * Here rather than in a spec because three files need it - `206a`, `207a` and
 * `208a` - and a fixture built inside one test file is one no other file has
 * (#96). It is an instrument and not an assertion, so #68's rule about shared
 * code does not bite: no row's claim lives here, only the situation (#171).
 *
 * `prefix` is the caller's, and it is what keeps one file's imported codes from
 * being another's duplicate: the codes outlive the rows that made them, `hold`
 * putting the schema back when a file ends rather than between its rows. Every
 * prefix in use sorts after the two seeded departments, so the imported rows
 * are the ones on the later pages.
 */
async function threePagesEndingIn(page, { rows, prefix, note }) {
  const { total: before, pages } = await reading(page, listTable(page));
  if (before % 10 === rows % 10 && pages >= 3) return before;

  const header = headerOf(await downloadTemplate(page));
  let add = (((rows - before) % 10) + 10) % 10;
  if (add === 0) add = 10;
  while (before + add < 20 + rows) add += 10;
  const codes = Array.from({ length: add }, (unused, i) => `${prefix}${ALPHABET[i]}`);

  await importDepartments(
    page,
    csv(header, ...codes.map((code, i) => `${code},ภาควิชาทดสอบแบ่งหน้า ${i},${note} ${i}`)),
  );
  await expect
    .poll(async () => (await reading(page, listTable(page))).total)
    .toBe(before + add);
  return before + add;
}

/**
 * One row imported through the panel, which is the way in that survives #210.
 *
 * `ImportPanel` keeps its own flag and the screen's `busy` does not reach it,
 * so the file input is live while a write of the person's own is still out; and
 * `onImported` goes to page one - or hand-reloads page one when that is where
 * they already are. It is therefore a read of the list a person can start while
 * a removal is held, which is what `206a` and `208a` arranged with the pager
 * until 19 ตุลาคม 2569 - the day the six administration pagers took `busy` and
 * closed that way in (#210). Measured by a probe on this screen that day,
 * before either file was re-aimed, and the probe deleted once it had answered
 * (#207).
 *
 * Answers the import's own response. The list read it starts belongs to the
 * caller, which waits for it or holds it at the route - and the template is
 * fetched here because nothing in the panel but the file input is disabled
 * while an import is out, read from `ImportPanel.js` on 19 ตุลาคม 2569. Here
 * rather than in a spec for `threePagesEndingIn`'s reason: no row's claim lives
 * in it, only the situation (#171).
 */
async function importOneRow(page, { code, name, note }) {
  const header = headerOf(await downloadTemplate(page));
  const answer = await importDepartments(page, csv(header, `${code},${name},${note}`));
  // Read here, because a refused import calls no `onImported` and the caller
  // would meet it as a timeout in a list waiter instead of a red at the
  // import - measured on 19 ตุลาคม 2569 with a code `threePagesEndingIn` had
  // already written, which is why callers pass two letters after the prefix.
  expect(answer.ok(), `the import of ${code}, which is the way in`).toBe(true);
  return answer;
}

module.exports = {
  DEPARTMENTS,
  API,
  waitForList,
  openDepartments,
  importDepartments,
  departmentRow,
  openEditor,
  statusField,
  save,
  statusOf,
  listTable,
  removeDepartment,
  ALPHABET,
  threePagesEndingIn,
  importOneRow,
};
