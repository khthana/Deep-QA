'use strict';

const { expect } = require('@playwright/test');

/**
 * ผลการเรียนรู้ระดับหลักสูตร — #19, as a browser reaches it.
 *
 * Two things make these helpers different from #18's, and they are the two the
 * route file names.
 *
 * *There is no pager and no import.* The whole tree for the chosen curriculum
 * arrives at once, so a row that wants to see the last outcome does not have to
 * walk to it — `listedCodes` reads every row there is.
 *
 * *A row is named by its code, but a code is not an identifier.* Two curricula
 * may each hold a `PLO-1`, which is the ticket. So every helper that finds a
 * row takes the list to be narrowed to one curriculum — which since #101 it
 * always is: the screen lands on the first curriculum in reach and offers no
 * way to ask for two at once. `filterTo` moves between them, where this
 * sentence used to say it was what saved an administrator from a mixed list.
 *
 * The pickers are located by an option only each of them has rather than by
 * their labels, for `program-subjects-screen`'s reason: `Field` wraps the
 * control inside the `<label>`, so a select's accessible name is its label
 * *and* every option's text.
 *
 * #101 took the list filter's old option away, and the replacement is
 * deliberately not the inverse of it. It used to be found by `value=""` —
 * ทุกหลักสูตร — and the obvious move was to find it by *not* having one.
 * That would put #85's trap under this file: the presence of that option is
 * what two of #101's rows are about, so a locator built on its absence turns
 * those rows into rows that cannot fail for the reason they name — restore the
 * option and the control is simply not found, whatever the assertion said.
 *
 * So both curriculum selects are found the same way, by an option carrying a
 * curriculum code, and what tells them apart is that they are never drawn at
 * the same time: the form replaces the table rather than sitting beside it.
 */

const PLOS = '/main/plos';
const API = '/api/plos';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer => new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/**
 * Waits for the reach — which curricula this account may maintain.
 *
 * Since #101 this is the screen's *first* question and the one everything else
 * waits on: no outcomes are asked for until it answers, because there is no
 * request for outcomes that does not name a curriculum. It is therefore also
 * where an account that may not be here is refused, and the row about that
 * waits here rather than on the list.
 */
function waitForReach(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === `${API}/programs` && answer.request().method() === 'GET',
  );
}

/** Opens the screen and asserts the list a passing row is about to read. */
async function openPlos(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(PLOS)]);
  expect(response.status()).toBe(200);
  return response;
}

/**
 * One row of the table, found by the code in its first cell.
 *
 * `hasText` rather than an exact cell name, because the code cell also carries
 * the ข้อย่อย marker — and scoped to the list's own table so the confirmation
 * dialog, which repeats a code in a sentence, cannot be matched instead.
 *
 * The lookahead is doing real work. A ข้อย่อย's cell reads `PLO-2-1ข้อย่อย`
 * with no space, so anchoring on whitespace would find no sub-outcome at all;
 * and a plain prefix would make `PLO-1` match `PLO-13` and `PLO-1-2` as well,
 * which on a screen whose whole point is codes that repeat would be the worst
 * kind of false pass. `\w` covers neither Thai nor the marker, so the match
 * ends exactly where the code does.
 */
const ploRow = (page, code) =>
  page
    .locator('table tbody tr')
    .filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${code}(?![\\w-])`) }) });

/** The columns, by what the table's header calls them. */
const CELL = { code: 0, title: 1, type: 2, order: 3, program: 4, status: 5 };

/**
 * A curriculum select — the only kind offering a curriculum code.
 *
 * Both seeded curricula, not just `0501`, and that is not belt and braces. The
 * rows about a committee member assert that this control is *not drawn*, and
 * `กรรมการหลักสูตร` of `0503` would be offered a dropdown holding `0503`
 * alone. A locator that only knew `0501` would answer *not drawn* for a
 * dropdown that was, and `alwaysadropdown` would stop proving anything.
 */
const CURRICULA = 'option[value="0501"], option[value="0503"]';

const curriculumSelect = page =>
  page.getByRole('combobox').filter({ has: page.locator(CURRICULA) });

/** The form's curriculum picker. Drawn only while the form is. */
const programPicker = curriculumSelect;

/**
 * The list's own curriculum filter, drawn only when more than one is reached.
 *
 * The same query as the form's picker, for the reason in the header: the two
 * are never on screen together, and anything that told them apart would have
 * to be the option #101 is about.
 */
const programFilter = curriculumSelect;

/** The form's ประเภท picker. */
const typePicker = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="knowledge"]') });

/** The form's ข้อหลัก picker — the one whose empty option says so in words. */
const parentPicker = page =>
  page.getByRole('combobox').filter({ hasText: 'ไม่มี — เป็นข้อหลัก' });

/** The edit form's status picker, which is the way back from a deactivation. */
const statusPicker = page =>
  page.getByRole('combobox').filter({ has: page.locator('option[value="active"]') });

/** The labels a picker offers, in the order it offers them. */
const offeredLabels = picker =>
  picker.locator('option').evaluateAll(options => options.map(option => option.textContent.trim()));

/** Opens *เพิ่มผลการเรียนรู้*. */
const openAddForm = page =>
  page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้', exact: true }).click();

/**
 * Opens the editor on one row and waits for the outcome to be read back.
 *
 * The path is matched whole rather than by its start: `${API}/programs` is
 * fetched when the screen mounts, and a prefix would let that answer stand in
 * for this one if it were still in flight when the แก้ไข click landed.
 */
async function openEditor(page, code) {
  const reading = new RegExp(`^${API}/[0-9]+$`);
  await Promise.all([
    page.waitForResponse(
      answer =>
        reading.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
    ),
    ploRow(page, code).getByRole('button', { name: 'แก้ไข' }).click(),
  ]);
  await expect(page.getByRole('heading', { name: 'แก้ไขผลการเรียนรู้ของหลักสูตร' })).toBeVisible();
}

/**
 * Chooses a ข้อหลัก by its code, or none at all.
 *
 * By value found from the option's text rather than by the label, because the
 * option's value is the outcome's identifier and nothing on screen shows it -
 * and by the code *exactly* rather than as a prefix, because `PLO-Z1-2` starts
 * with `PLO-Z1` and picking the wrong one would build a different tree from
 * the one the row then asserts on. The leading `— ` marks are the indent the
 * picker draws its own nesting with.
 */
async function selectParent(page, code) {
  if (!code) return parentPicker(page).selectOption('');
  const value = await parentPicker(page)
    .locator('option')
    .evaluateAll(
      (options, wanted) =>
        options.find(
          option =>
            option.textContent.trim().replace(/^(—\s*)+/, '').split(/\s+/)[0] === wanted,
        )?.value ?? '',
      code,
    );
  expect(value, `the parent picker does not offer ${code}`).not.toBe('');
  return parentPicker(page).selectOption(value);
}

/** Fills the add form and presses บันทึก, waiting for the list the save reloads. */
async function addOutcome(page, { program, code, title, type, order, parent }) {
  await openAddForm(page);
  if (program) await programPicker(page).selectOption(program);
  await page.getByPlaceholder(/เช่น PLO-1/).fill(code);
  await page.getByPlaceholder('สิ่งที่ผู้สำเร็จการศึกษาทำได้').fill(title);
  if (type) await typePicker(page).selectOption(type);
  await selectParent(page, parent);
  await page.locator('input[type="number"]').fill(String(order));
  return save(page);
}

/** Presses *บันทึก* and waits for the list the save reloads. */
async function save(page) {
  const [reloaded] = await Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return reloaded;
}

/** Presses *ลบ* on a row; the dialog is left open for the caller to answer. */
const startRemoval = (page, code) =>
  ploRow(page, code).getByRole('button', { name: 'ลบ', exact: true }).click();

/** Answers the removal dialog. The list may or may not reload — the caller says. */
const confirmRemoval = page =>
  page.getByRole('button', { name: 'ลบผลการเรียนรู้', exact: true }).click();

/**
 * The codes the table is showing, in the order it draws them.
 *
 * The ข้อย่อย marker is stripped rather than split on: it sits in a sibling
 * `<span>` whose gap is a margin, and inline elements separated by margin come
 * back from `innerText` with no whitespace between them - so a ข้อย่อย's cell
 * reads `PLO-2-1ข้อย่อย` and splitting on spaces would return the whole of it.
 */
const listedCodes = page =>
  page
    .locator('table tbody tr td:first-child')
    .allInnerTexts()
    .then(cells => cells.map(cell => cell.replace('ข้อย่อย', '').trim().split(/\s+/)[0]));

/**
 * Makes sure the list is showing one curriculum, through the screen's own filter.
 *
 * *Showing*, rather than *press the control*, and the difference began with
 * #101. Selecting the value a `<select>` already holds fires no `change`, so
 * nothing reloads and a wait for the reload hangs until the row times out.
 * That could not happen while the screen opened on ทุกหลักสูตร - every
 * curriculum was a move away from it - and it can now that the screen opens on
 * one of them.
 *
 * Reading the value once and comparing it, rather than pressing and hoping, is
 * also what keeps the rows apart: *which* curriculum the screen lands on is one
 * row's claim, and a helper that failed whenever the landing moved would make
 * every row that uses it fail for that row's reason instead of its own.
 */
async function filterTo(page, programId) {
  if ((await programFilter(page).inputValue()) === programId) return;
  await Promise.all([waitForList(page), programFilter(page).selectOption(programId)]);
}

module.exports = {
  PLOS,
  API,
  CELL,
  waitForList,
  waitForReach,
  openPlos,
  ploRow,
  programPicker,
  programFilter,
  typePicker,
  parentPicker,
  statusPicker,
  offeredLabels,
  openAddForm,
  openEditor,
  selectParent,
  addOutcome,
  save,
  startRemoval,
  confirmRemoval,
  listedCodes,
  filterTo,
};
