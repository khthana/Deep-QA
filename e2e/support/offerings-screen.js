'use strict';

const { expect } = require('@playwright/test');
const { reading, untilDrawn } = require('./pager');
const { openAt } = require('./navigation');
const { byAlias, CURRENT_YEAR, SEMESTER, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('./env');

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
 *
 * Since 17 พ.ย. 2569 the list's pickers are found by their names instead (#279): there
 * is no `ทุกภาค`, `ทุกปี` or `ทุกหลักสูตร` left to build a locator on, the
 * term is one `<select>` written `ภาค/ปี`, and the screen's own pickers are not
 * wrapped in a `Field`. The copy is a popup with one picker, its source.
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

/**
 * The term picker - one `<select>` written `ภาค/ปี` since 17 พ.ย. 2569 (#279), where
 * there were a year box and a semester picker, each with a blank for *every*.
 * Found by its name: the old locators were built on the blank options, which
 * the screen no longer draws, so they would match nothing and every negative
 * read through them would pass for nothing.
 */
const termFilter = page => page.getByRole('combobox', { name: 'ภาคการศึกษา', exact: true });

/**
 * The term after a term, by the server's own rule (`nextTerm` in
 * `backend/routes/offerings.js`): ภาคต้น is followed by ภาคปลาย of the same
 * year, ภาคปลาย by ภาคต้น of the next. Two semesters since #279.
 */
const nextTerm = ({ year, semester }) =>
  Number(semester) === 1
    ? { year: String(year), semester: 2 }
    : { year: String(Number(year) + 1), semester: 1 };

/**
 * The term after the current one - one of the two terms the picker offers
 * whether or not anything was opened in it (#279), so the one a row can open a
 * subject in through the form. Derived from the seed's term, which is the
 * server's (`db/term.js`), never written as a literal: which term is next
 * changes with the date.
 */
const NEXT = nextTerm({ year: CURRENT_YEAR, semester: SEMESTER });

/** `ภาค/ปี`, the way the picker writes a term. */
const termOf = (year, semester) => `${semester}/${year}`;


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
// By its name since 17 พ.ย. 2569: there is no ทุกหลักสูตร to build it on (#279).
const programFilter = page => page.getByRole('combobox', { name: 'หลักสูตร', exact: true });

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
  // A term the picker already shows is no move and no read, so it is not
  // waited for - waiting would hang on a read nobody is going to make (#77).
  const wanted = termOf(year, semester);
  await expect(
    termFilter(page).locator(`option[value="${wanted}"]`),
    `the term picker offers ${wanted}: a term this curriculum ran, or the current or the next`,
  ).toHaveCount(1);
  if ((await termFilter(page).inputValue()) === wanted) return;
  await Promise.all([waitForList(page), termFilter(page).selectOption(wanted)]);
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
// The list has no year column since 17 พ.ย. 2569 (#279): the term is the picker's,
// so a row of a term is a row of the list once the picker is on that term.
const offeringTermRow = (page, { code }) => offeringRow(page, code);

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
  // The form has no term fields since 17 พ.ย. 2569 (#279): it opens a subject in the
  // term the list shows, so a caller filters to the term first, and the
  // heading is read here so an arrangement that did not is an arrangement
  // failure and not a row of the wrong term.
  if (year !== undefined) {
    await expect(
      page.getByRole('heading', { name: `เปิดรายวิชาในภาคการศึกษา ${termOf(year, semester)}` }),
      'the form opens in the term the caller filtered to',
    ).toBeVisible();
  }
  await expect(subjectPicker(page).locator(`option[value="${subject}"]`)).toHaveCount(1);
  await subjectPicker(page).selectOption(subject);

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
 * Opens more Offerings than a page holds in **one** term, moves the list to
 * that term, and says what it built.
 *
 * #267's answer ง (5 พ.ย. 2569): the second page this screen's pager rows need
 * is a **fixture** and not a seed change. Until 17 พ.ย. 2569 it came out of one placed
 * pair opened in eleven terms, the list being unfiltered on arrival. Since #279
 * the list is one term and has no *every term*, so eleven terms are eleven
 * lists of one row each and none of them has a page two; and a term nobody ran
 * is not offered by the picker, so the form cannot open one either. The rows
 * are therefore eleven **subjects** in one term, written straight into the
 * schema: `semester_courses` is unique on
 * `(program_id, subject_id, academic_year, semester)`
 * (`db/migrations/0002_offerings_and_learning_outcomes.sql:96`), so one term
 * holds one row per subject and the subjects have to be the caller's own.
 *
 * Two things are the caller's, so that two files cannot collide: the year,
 * which is ภาคต้น of it, and `codes`, which are made subjects of department 05
 * and placed in 0501. The first code is the row the caller presses, the list
 * ordering a term's rows by `subject_id`. They go out again with the schema
 * the calling file holds (#132, #134), which is why the caller must hold it.
 */
async function moreThanOnePage(page, { year, codes, perPage = 10 }) {
  expect(codes.length, 'more codes than a page holds').toBeGreaterThan(perPage);
  const db = createPool({ schema: E2E_SCHEMA });
  try {
    const admin = byAlias('U_ADMIN');
    for (const code of codes) {
      await db.query(
        `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
         VALUES ($1, $2, $3, 3, '05', $4)`,
        [code, `วิชาของตัวแบ่งหน้า ${code}`, `Paging subject ${code}`, admin],
      );
      await db.query(
        `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
         VALUES ($1, $2, 'required', $3)`,
        [PROGRAM, code, admin],
      );
      await db.query(
        `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
         VALUES ($1, $2, $3, 1)`,
        [PROGRAM, code, String(year)],
      );
    }
  } finally {
    await db.end();
  }

  // The picker read its terms when the screen opened, before this term had a
  // row, so the screen is opened again to be offered it.
  await openOfferings(page);
  await filterToTerm(page, String(year), 1);
  const table = listTable(page);
  await expect
    .poll(async () => (await reading(page, table)).total, {
      message: 'the total the line reads out, once this file has its own term',
    })
    .toBe(codes.length);

  const spare = { code: [...codes].sort()[0], year: String(year), semester: 1 };
  await expect(
    offeringTermRow(page, spare),
    'the row the caller presses, on page one',
  ).toHaveCount(1);
  return { total: codes.length, spare };
}

/** From a row to that Offering's sections. */
async function openSections(page, code) {
  await Promise.all([
    waitForDetail(page),
    offeringRow(page, code).getByRole('button', { name: 'กลุ่มเรียนและผู้สอน' }).click(),
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
  page.getByRole('listitem', { name: `กลุ่มเรียน ${number}`, exact: true });

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
    page.getByRole('button', { name: 'เพิ่มกลุ่มเรียน' }).click(),
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
/**
 * The copy popup - #279, 17 พ.ย. 2569: a button on the top bar opens it, its target is
 * the term the list shows and its source is picked from the terms this
 * curriculum ran before that one.
 */
const copyDialog = page => page.getByRole('dialog', { name: 'คัดลอกจากภาคการศึกษาก่อน' });

const copySource = page => copyDialog(page).getByRole('combobox', { name: 'จากภาคการศึกษา' });

async function openCopy(page) {
  await page.getByRole('button', { name: 'คัดลอกจากภาคการศึกษาก่อน', exact: true }).click();
  await expect(copyDialog(page)).toBeVisible();
}

/** Closes the popup once the copy has answered and `busy` is down. */
async function closeCopy(page) {
  const close = copyDialog(page).getByRole('button', { name: 'ปิด', exact: true });
  await expect(close).toBeEnabled();
  await close.click();
  await expect(copyDialog(page)).toHaveCount(0);
}

/**
 * Copies `from` onto `to`: filters the list to `to`, opens the popup, picks
 * `from` and presses คัดลอก. The popup is left open with its report, for the
 * caller to read and then `closeCopy`.
 */
async function copyFromTerm(page, from, to) {
  await filterToTerm(page, to.year, to.semester);
  await openCopy(page);
  await copySource(page).selectOption(`${from.year}:${from.semester}`);

  await Promise.all([
    page.waitForResponse(answer => new URL(answer.url()).pathname === `${API}/copy`),
    copyDialog(page).getByRole('button', { name: 'คัดลอก', exact: true }).click(),
  ]);
}

module.exports = {
  OFFERINGS,
  API,
  waitForList,
  waitForDetail,
  openOfferings,
  termFilter,
  termOf,
  nextTerm,
  NEXT,
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
  copyDialog,
  copySource,
  openCopy,
  closeCopy,
  copyFromTerm,
};
