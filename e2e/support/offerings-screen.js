'use strict';

const { expect } = require('@playwright/test');
const { reading, untilDrawn } = require('./pager');
const { openAt } = require('./navigation');

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

/** Opens the screen and asserts the list a passing row is about to read, once it is drawn. */
async function openOfferings(page) {
  const response = await openAt(page, OFFERINGS, waitForList);
  expect(response.status()).toBe(200);
  return untilDrawn(page, response);
}

const yearFilter = page => page.getByPlaceholder('ทุกปี');

const semesterFilter = page => page.locator('select:has(option:text-is("ทุกภาค"))');

/**
 * The list's own curriculum filter, drawn only when more than one is reached.
 *
 * A committee grant's scope is one curriculum, so for every account the seed
 * holds this control is a `<span>` and not a select — which is what `openSubject`
 * below leans on. `234a` row 4 reaches the select by granting `PROG_MANAGER` at
 * a **department**, a state `assignable` permits (28 ตุลาคม 2569).
 *
 * Located by `ทุกหลักสูตร`, the one option nothing else on the screen carries:
 * the ภาคการศึกษา filter has a blank option too, so `option[value=""]` finds two.
 */
const programFilter = page => page.locator('select:has(option:text-is("ทุกหลักสูตร"))');

/** Narrows the list to one curriculum through the screen's own filter. */
async function filterToProgram(page, programId) {
  await Promise.all([waitForList(page), programFilter(page).selectOption(programId)]);
}

/**
 * Waits for the form's read of what may be opened in one curriculum.
 *
 * Matched by the request and never by what the answer turns out to be, so a row
 * asking *which curriculum was this read about* fails at its own `expect` rather
 * than at the timeout a value-filtered waiter would die at (#116).
 */
function waitForOfferable(page) {
  return page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === `${API}/subjects` &&
      answer.request().method() === 'GET',
  );
}

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

/**
 * The screen's own list, told apart from the copy panel's report.
 *
 * `first()` for `departments-screen.js`'s reason: `CopyTermPanel` is drawn
 * below the list and draws a table of its own once a copy has run.
 */
const listTable = page => page.locator('table').first();

/**
 * One row of a single term, found by its year cell as well as its code.
 *
 * The unfiltered list draws one code in several terms, so `offeringRow` alone
 * hands back as many rows as the term has; a caller that means *the one row in
 * that year* says so.
 */
const offeringTermRow = (page, { code, year }) =>
  offeringRow(page, code).filter({
    has: page.getByRole('cell', { name: String(year), exact: true }),
  });

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

/**
 * The code of a subject the form says this curriculum may open, read off the
 * open form.
 *
 * The options are drawn from `GET /offerings/subjects`, which `openForm` does
 * not wait for - it reads the heading - and `waitForOfferable` cannot close
 * that window from here, a `waitForResponse` having to be armed before the
 * click. So the settle point is a **retrying read of the drawing** (#132), and
 * it is a read of the option count rather than of the picker's value, because a
 * sampler that reads what a control holds cannot tell an absent control from an
 * empty one (#164). A screen that really has nothing to offer then fails here,
 * on this message, instead of at the first submit's timeout (#139, #209).
 */
async function oneOfferableSubjectCode(page) {
  const choices = subjectPicker(page).locator('option:not([value=""])');
  await expect(
    choices,
    'a subject this curriculum may open, whose terms the fixture varies',
  ).not.toHaveCount(0);
  const offerable = await choices.evaluateAll(options =>
    options.map(option => option.value),
  );
  return offerable[0];
}

/**
 * Opens one subject in as many terms as it takes for the unfiltered list to
 * have a second page, and says what it built.
 *
 * #267's answer ง (5 พ.ย. 2569): the second page this screen's pager rows need
 * is a **fixture** and not a seed change. `semester_courses` is unique on
 * `(program_id, subject_id, academic_year, semester)`
 * (`db/migrations/0002_offerings_and_learning_outcomes.sql:96`), so eleven rows
 * come out of one placed pair by varying the term — no new subject, no new
 * pair, nothing a `PRIMARY KEY` refuses, which is where `ProgramSubjects` and
 * this screen part company. And the list is unfiltered on arrival
 * (`Offerings.js` opens with `year = ''` and `semester = ''`), so every row
 * this builds is in the list the screen draws first.
 *
 * The rows go out again with the schema the calling file holds (#132, #134):
 * each is an Offering with no section at all, which `DELETE /offerings/:id`
 * answers `204` for.
 *
 * Two things are the caller's, so that two files cannot collide in one term:
 * the years, and the knowledge that **the last of them is kept for one row of
 * its own**. That row is what a caller presses — a year holding exactly one
 * Offering is found by its year cell whatever else the list is showing — and it
 * is the first row the list draws, the order being `academic_year DESC`.
 *
 * The subject is read out of the form's own picker rather than from the seed,
 * because what may be opened here is what `GET /offerings/subjects` says is
 * placed and still switched on, and an earlier file in the run can have closed
 * the seeded entry (`16a` row 82). An empty picker fails an assertion rather
 * than the timeout the first submit would die at (#139).
 */
async function moreThanOnePage(page, { years, perPage = 10 }) {
  const table = listTable(page);
  const spareYear = years[years.length - 1];
  const terms = [
    { year: spareYear, semester: 1 },
    ...years
      .slice(0, -1)
      .flatMap(year => [1, 2, 3].map(semester => ({ year, semester }))),
  ];

  const start = await reading(page, table);
  expect(
    terms.length,
    'enough terms of its own to fill a page, with one kept for the row that is pressed',
  ).toBeGreaterThan(perPage - start.total);

  let code;
  let made = start.total;
  for (const term of terms) {
    // Stop as soon as there is a second page. The second clause reads as a
    // guard on every pass and can only hold on the first one, the spare being
    // `terms[0]`: it says *build the spare whatever the list already holds*, so
    // that a run whose earlier files left a full page still leaves this file a
    // row of its own to press.
    if (made > perPage && term.year !== spareYear) break;
    await openForm(page);
    code = code ?? (await oneOfferableSubjectCode(page));
    await openSubject(page, { subject: code, ...term });
    await backToList(page);
    made += 1;
  }

  await expect
    .poll(async () => (await reading(page, table)).total, {
      message: 'the total the line reads out, once this file has its own terms',
    })
    .toBe(made);

  const spare = { code, year: spareYear, semester: 1 };
  await expect(
    offeringTermRow(page, spare),
    'one row in the spare year, which is what the caller presses - a sibling file writing that year would make this an arrangement failure and not a red claim (#129)',
  ).toHaveCount(1);

  return { total: made, spare };
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
  programFilter,
  filterToProgram,
  waitForOfferable,
  filterToTerm,
  offeringRow,
  offeringTermRow,
  listTable,
  openForm,
  subjectPicker,
  openSubject,
  oneOfferableSubjectCode,
  moreThanOnePage,
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
