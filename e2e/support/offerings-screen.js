'use strict';

const { expect } = require('@playwright/test');

/**
 * การเปิดรายวิชาในภาคการศึกษา — #23, as a browser reaches it.
 *
 * Two things make this screen's helpers unlike every one before it.
 *
 * *There are two views behind one address.* The list is the term being planned;
 * `openSections` goes from a row to that Offering's ตอนเรียน and `back` returns.
 * Nothing navigates, so a helper that waited for a URL would wait for ever.
 *
 * *There are two grains, and one subject code names several rows.* The seed
 * opens `01076105` in two terms and this suite opens it in more, so a row is
 * found by its code only after the year and semester filters have narrowed the
 * list to one term. `filterToTerm` is that, and every row helper assumes it has
 * been called.
 *
 * The pickers are located by an option only each of them has rather than by
 * their labels, for #18's reason: `Field` wraps the control inside the
 * `<label>`, so a select's accessible name is its label *and* every option's
 * text. `ทุกภาค` belongs to the list's filter and to nothing else; the copy
 * panel's two selects and the form's have no blank option.
 */

const OFFERINGS = '/main/course-in-term';
const API = '/api/offerings';

/** Waits for the list the screen asks for, whatever the answer turns out to be. */
function waitForList(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API && answer.request().method() === 'GET',
  );
}

/** Waits for one Offering being read back — every section write ends in one. */
function waitForDetail(page) {
  return page.waitForResponse(
    answer =>
      /^\/api\/offerings\/\d+$/.test(new URL(answer.url()).pathname) &&
      answer.request().method() === 'GET',
  );
}

/** Opens the screen and asserts the list a passing row is about to read. */
async function openOfferings(page) {
  const [response] = await Promise.all([waitForList(page), page.goto(OFFERINGS)]);
  expect(response.status()).toBe(200);
  return response;
}

const yearFilter = page => page.getByPlaceholder('ทุกปี');

const semesterFilter = page => page.locator('select:has(option:text-is("ทุกภาค"))');

/**
 * Narrows the list to one term.
 *
 * Both controls refetch, so both are awaited: setting the year and then reading
 * the table before the semester's request has answered is reading the previous
 * term's rows.
 */
async function filterToTerm(page, year, semester) {
  await Promise.all([waitForList(page), yearFilter(page).fill(String(year))]);
  await Promise.all([
    waitForList(page),
    semesterFilter(page).selectOption(String(semester)),
  ]);
}

/**
 * One row of the table, found by the code in its first cell.
 *
 * By cell rather than by `hasText`, for #18's reason: a code is a substring of
 * nothing else on the row, but the confirmation dialog quotes the code too and
 * a text match would find the row underneath it as well.
 */
const offeringRow = (page, code) =>
  page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: code, exact: true }) });

/** The form that opens a subject for a term. */
async function openForm(page) {
  await page.getByRole('button', { name: 'เปิดรายวิชา', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'เปิดรายวิชาในภาคการศึกษา' })).toBeVisible();
}

const subjectPicker = page => page.locator('form select:has(option:text-is("เลือกรายวิชา"))');

/**
 * Fills the form and submits it, waiting for the list the page reloads after.
 *
 * The subject picker is filled after the programme, because it is reloaded
 * whenever the programme changes and a value set before that answer arrives is
 * a value the reload throws away. A committee member has no programme control
 * at all, so the wait is on the picker having options rather than on a request.
 */
async function openSubject(page, { subject, year, semester }) {
  await expect(subjectPicker(page).locator(`option[value="${subject}"]`)).toHaveCount(1);
  await subjectPicker(page).selectOption(subject);
  await page.locator('form input[inputmode="numeric"]').fill(String(year));
  await page.locator('form select:has(option:text-is("1 — ภาคต้น"))').selectOption(String(semester));

  await Promise.all([
    waitForDetail(page),
    page.getByRole('button', { name: 'เปิดรายวิชา', exact: true }).click(),
  ]);
}

/** From a row to that Offering's sections. */
async function openSections(page, code) {
  await Promise.all([
    waitForDetail(page),
    offeringRow(page, code).getByRole('button', { name: 'ตอนเรียนและผู้สอน' }).click(),
  ]);
  await expect(page.getByRole('button', { name: 'กลับไปหน้ารายการ' })).toBeVisible();
}

const backToList = page =>
  Promise.all([
    waitForList(page),
    page.getByRole('button', { name: 'กลับไปหน้ารายการ' }).click(),
  ]);

/** One section's card, named by its number — see the note in SectionsPanel. */
const sectionCard = (page, number) =>
  page.getByRole('listitem', { name: `ตอนเรียน ${number}`, exact: true });

/**
 * Adds a section and waits for the panel to have been read back.
 *
 * A refusal reads the panel back too, so this resolves either way and the row
 * asserts which happened.
 */
async function addSection(page, number) {
  await page.getByPlaceholder('เช่น 1 หรือ พ1').fill(number);
  await Promise.all([
    waitForDetail(page),
    page.getByRole('button', { name: 'เพิ่มตอนเรียน' }).click(),
  ]);
}

/** Opens one section's teacher box, ticks exactly these people, and saves. */
async function assignTeachers(page, number, names) {
  const card = sectionCard(page, number);
  await card.getByRole('button', { name: 'กำหนดผู้สอน' }).click();

  const box = card.getByRole('checkbox');
  await expect(box.first()).toBeVisible();

  // Every tick is set to what it should be rather than clicked blindly: this is
  // a replacement, so a person left ticked is a person still teaching.
  // Matched on the row containing the name rather than equalling it: each row
  // reads out the person's name *and* their stored id, and a whole-string
  // comparison silently ticks nobody - which saves an empty set and passes
  // every assertion about the request having been made.
  for (const tick of await box.all()) {
    const row = await tick.locator('xpath=..').innerText();
    const wanted = names.some(name => row.includes(name));
    if ((await tick.isChecked()) !== wanted) await tick.setChecked(wanted);
  }

  await Promise.all([
    waitForDetail(page),
    card.getByRole('button', { name: 'บันทึกผู้สอน' }).click(),
  ]);
}

/** The chips under one section's heading — who the screen says teaches it. */
const teachersOf = (page, number) =>
  sectionCard(page, number).locator('span.rounded-full');

const startRemoval = (page, label) =>
  page.getByRole('button', { name: label }).first().click();

const confirmDialog = page => page.getByRole('heading', { name: /^ยืนยันการ/ });

/**
 * The copy panel's four controls, in the order they are read.
 *
 * The two ภาคการศึกษา boxes are told from the list's filter by what the
 * filter has and they do not: a blank option. All three carry `1 — ภาคต้น`,
 * so a plain `select:has(...)` picks the filter up as well and hands back three
 * - which shifts the pair by one and silently copies a term nobody asked about,
 * reporting nothing and failing an assertion three lines further down.
 */
async function copyControls(page) {
  const [fromYear, toYear] = await page.getByPlaceholder('ปีการศึกษา').all();
  const [fromTerm, toTerm] = await page
    .locator('select:has(option:text-is("1 — ภาคต้น")):not(:has(option[value=""]))')
    .all();
  return { fromYear, toYear, fromTerm, toTerm };
}

/** Fills both ends and presses คัดลอก, waiting for the report to have arrived. */
async function copyFromTerm(page, from, to) {
  const { fromYear, toYear, fromTerm, toTerm } = await copyControls(page);
  await fromYear.fill(String(from.year));
  await fromTerm.selectOption(String(from.semester));
  await toYear.fill(String(to.year));
  await toTerm.selectOption(String(to.semester));

  await Promise.all([
    page.waitForResponse(answer => new URL(answer.url()).pathname === `${API}/copy`),
    page.getByRole('button', { name: 'คัดลอก' }).click(),
  ]);
}

module.exports = {
  OFFERINGS,
  API,
  waitForList,
  waitForDetail,
  openOfferings,
  yearFilter,
  semesterFilter,
  filterToTerm,
  offeringRow,
  openForm,
  subjectPicker,
  openSubject,
  openSections,
  backToList,
  sectionCard,
  addSection,
  assignTeachers,
  teachersOf,
  startRemoval,
  confirmDialog,
  copyControls,
  copyFromTerm,
};
