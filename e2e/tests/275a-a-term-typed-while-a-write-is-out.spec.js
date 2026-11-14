'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { gate, isGet, isWrite } = require('../support/gate');
const { OUTSIDE_THE_FILTER, SOME_IMPORTED_OUTSIDE } = require('../support/outside-the-filter');
const { csv, importCsv } = require('../support/import-panel');
const enrolment = require('../support/enrolment-screen');
const groups = require('../support/groups-screen');
const {
  LAST_YEAR,
  header,
  markDocument,
  intoTheListedSectionScreen,
  yearOf,
} = require('../support/section-jump');

/**
 * #275 — a term typed while a write, or an import's reload, is still out.
 *
 * `272b` holds what each sentence says when the term was already in the box.
 * These rows change the term **between the send and the answer**, which is the
 * window #275 named in three places:
 *
 * 1. **The class list** (`SubjectStudents.js`) — `q` in `readOf`'s key is what
 *    keeps a sentence judged under the old term from being said over the list
 *    of the new one. The add's request is held with `support/gate.js`, the
 *    term typed, and the request let go.
 * 2. **The groups import across a jump** (`StudentGroups.js`, `onImported`'s
 *    `onScreen.current === drawing`) — `drawing` answers `true` from inside its
 *    `try` whatever `isCurrent()` said (#152), so after a jump the second
 *    question is the only thing between `drawn`, still the Section that was
 *    left, and a term typed on the Section the jump went to.
 * 3. **The groups' sentence** — the owner's answer of 14 November 2569 (#275,
 *    ข้อ 3): it is judged by the term in the box when the answer lands, not by
 *    the term of the render that sent the write. Rows G1–G3, both directions
 *    for a write and one for an import.
 *
 * ## What this file does not say
 *
 * - **What the class list says after a term changed under its add.** Today it
 *   says nothing - the read the sentence was keyed for was replaced - and row
 *   S1 asserts only that the sentence judged by the old term is not said. That
 *   is the claim the key holds; silence is today's consequence and not the
 *   row's claim (#88), so a later answer that says the sentence judged by the
 *   new term leaves S1 true.
 * - **The window as a person meets it.** The gate holds a request until the row
 *   lets it go (#142), so these are the sequences and not their likelihood.
 */

const MARK = 'ทดสอบ275';
const NOTHING = 'zz275-nothing';
const GROUP_BOX = 'ค้นหากลุ่มหรือสมาชิก';
const CLASS_BOX = 'ค้นหานักศึกษา';

/** The screen's own notice. */
const notice = page => page.getByRole('status');

/** The groups route of one Section, exactly - a member's route is longer. */
const groupsOf = sectionId => new RegExp(`^/api/teaching/sections/${sectionId}/groups$`);

/** The group cards drawn, by name. */
const cardNames = page => groups.groupNames(page);
const cardsAre = (page, names) => expect.poll(() => cardNames(page)).toEqual(names);

/** Types into the groups box; nothing is asked of the server. */
const searchGroups = (page, term) => page.getByRole('searchbox', { name: GROUP_BOX }).fill(term);

/** An enrolled student of the Section in no group, read now rather than from the seed (#129). */
async function freeStudent(page, sectionId) {
  const answer = await page.request.get(`${BACKEND_URL}/api/teaching/sections/${sectionId}/groups`);
  expect(answer.status()).toBe(200);
  const body = await answer.json();
  const free = body.students.filter(one => one.group_id === null);
  // Asserted where it is used (#51): anybody else refuses the file.
  expect(free.length, 'an enrolled student in no group of this Section').toBeGreaterThan(0);
  return { body, studentId: free[0].student_id };
}

let release;
let section;
test.beforeAll(async ({ browser }) => {
  release = await hold();
  const page = await browser.newPage();
  await signIn(page, ACCOUNTS.teacherOne);
  [section] = await enrolment.mySectionIds(page);
  await page.close();
});
test.afterAll(() => release());

// ------------------------------------------------- รายชื่อนักศึกษาของรายวิชา

test('S1: the class list does not say an add judged by the term it was sent under', async ({ page }) => {
  const [code] = enrolment.SPARE_CODES;
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  const held = await gate(page, enrolment.API, isWrite);

  await page.getByLabel('รหัสนักศึกษา', { exact: true }).fill(code);
  const written = page.waitForResponse(
    answer => enrolment.API.test(new URL(answer.url()).pathname) && answer.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'เพิ่มนักศึกษา' }).click();
  await held.sent;

  // Under no term the add is found, so its sentence is the bare one; the term
  // typed now finds nobody, so that sentence over this list would be false.
  const isSearched = answer => {
    const url = new URL(answer.url());
    return (
      enrolment.API.test(url.pathname) &&
      answer.request().method() === 'GET' &&
      url.searchParams.get('q') === NOTHING
    );
  };
  const searched = page.waitForResponse(isSearched);
  await page.getByRole('searchbox', { name: CLASS_BOX }).fill(NOTHING);
  expect((await searched).status()).toBe(200);

  const reloaded = page.waitForResponse(isSearched);
  held.open();
  await held.answered;
  const answer = await written;
  expect(answer.status(), `the enrolment of ${code}`).toBe(201);
  const { student } = await answer.json();
  await reloaded;
  // The settle point: the field opens in the add's `finally`, which runs after
  // the read the sentence was handed to has drawn and said whatever it says.
  await expect(page.getByLabel('รหัสนักศึกษา', { exact: true })).toBeEnabled();

  await expect(
    page.getByText(`เพิ่ม ${student.student_id} ${student.full_name_th} เข้าตอนเรียนแล้ว`, { exact: true }),
    'the sentence of the term the add was sent under',
  ).toHaveCount(0);
});

// ------------------------------------------------------------- กลุ่มงาน

test('G1: a group created under no term, with a term typed before it lands, says it is outside', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await expect.poll(() => cardNames(page)).toContain('กลุ่มที่ 1');
  const held = await gate(page, groupsOf(section), isWrite);

  await page.getByLabel('ชื่อกลุ่มงาน', { exact: true }).fill(`${MARK} ก`);
  await page.getByRole('button', { name: 'สร้างกลุ่ม' }).click();
  await held.sent;
  await searchGroups(page, 'กลุ่มที่ 1');
  await cardsAre(page, ['กลุ่มที่ 1']);

  held.open();
  await expect(notice(page), 'judged by the term in the box').toHaveText(
    `สร้างกลุ่ม ${MARK} ก แล้ว ${OUTSIDE_THE_FILTER}`,
  );
  await cardsAre(page, ['กลุ่มที่ 1']);
});

test('G2: a group created under a term that hid it, with one typed that finds it, says only its own sentence', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await searchGroups(page, 'กลุ่มที่ 1');
  await cardsAre(page, ['กลุ่มที่ 1']);
  const held = await gate(page, groupsOf(section), isWrite);

  await page.getByLabel('ชื่อกลุ่มงาน', { exact: true }).fill(`${MARK} ข`);
  await page.getByRole('button', { name: 'สร้างกลุ่ม' }).click();
  await held.sent;
  // Nothing drawn holds it yet, so the cards empty: the term has been taken.
  await searchGroups(page, `${MARK} ข`);
  await cardsAre(page, []);

  held.open();
  await expect(notice(page), 'judged by the term in the box').toHaveText(`สร้างกลุ่ม ${MARK} ข แล้ว`);
  await cardsAre(page, [`${MARK} ข`]);
});

test("G3: a file imported under no term, with a term typed before its reload lands, says the import's sentence", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const { studentId } = await freeStudent(page, section);
  await groups.openGroups(page, section);
  await expect.poll(() => cardNames(page)).toContain('กลุ่มที่ 1');
  const reload = await gate(page, groupsOf(section), isGet);

  const answered = await importCsv(page, {
    path: `${groups.API(section)}/import`,
    text: csv('group_name,student_id', `${MARK} ค,${studentId}`),
    name: 'groups.csv',
  });
  expect(answered.status(), 'an import the server does not refuse').toBe(201);
  await reload.sent;
  await searchGroups(page, 'กลุ่มที่ 1');
  await cardsAre(page, ['กลุ่มที่ 1']);

  reload.open();
  await expect(notice(page), 'judged by the term in the box').toHaveText(SOME_IMPORTED_OUTSIDE);
});

test("G4: an import's reload that lands after a jump says nothing on the ตอนเรียน the jump went to", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const landedYear = await yearOf(page, LAST_YEAR);
  // A group of this Section that already holds somebody and has room, so the
  // answer the screen drew before the import holds it - `drawn`, which is what
  // the sentence would be judged against if the second question went.
  const { body, studentId } = await freeStudent(page, section);
  const group = body.groups.find(one => one.member_count > 0 && one.member_count < body.max_group_size);
  expect(group, 'a group with members and room').toBeTruthy();

  await groups.openGroups(page, LAST_YEAR);
  await markDocument(page);
  await intoTheListedSectionScreen(page, section, '/studentGroups', p =>
    p.waitForResponse(answer => new URL(answer.url()).pathname === groups.API(section) && answer.request().method() === 'GET'),
  );
  await expect.poll(() => cardNames(page)).toContain(group.group_name);

  const reload = await gate(page, groupsOf(section), isGet);
  const landed = await gate(page, groupsOf(LAST_YEAR), isGet);

  const answered = await importCsv(page, {
    path: `${groups.API(section)}/import`,
    text: csv('group_name,student_id', `${group.group_name},${studentId}`),
    name: 'groups.csv',
  });
  expect(answered.status(), 'an import the server does not refuse').toBe(201);
  await reload.sent;

  await page.evaluate(() => window.history.go(-3));
  await landed.sent;
  // Typed on the Section the jump went to, while the one that was left is
  // still drawn: a term that hides every card, the group the file filled
  // among them.
  await searchGroups(page, NOTHING);
  await cardsAre(page, []);

  reload.open();
  await reload.answered;
  landed.open();
  await landed.answered;
  // The settle point: the Section the jump went to is drawn.
  await expect(header(page).filter({ hasText: landedYear })).toHaveCount(1);

  await expect(
    page.getByText(SOME_IMPORTED_OUTSIDE, { exact: true }),
    "the import's sentence, about the ตอนเรียน that was left",
  ).toHaveCount(0);
});
