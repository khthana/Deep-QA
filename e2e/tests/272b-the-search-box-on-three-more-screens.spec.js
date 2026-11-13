'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { DEPARTMENTS } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { hold } = require('../support/hold');
const { signIn } = require('../support/auth');
const { OUTSIDE_THE_FILTER, SOME_IMPORTED_OUTSIDE } = require('../support/outside-the-filter');
const { csv, importCsv, importedLine } = require('../support/import-panel');
const { untilDrawn, step, pagerLine } = require('../support/pager');
const users = require('../support/users-screen');
const enrolment = require('../support/enrolment-screen');
const groups = require('../support/groups-screen');
const { BACKEND_URL } = require('../support/env');
const {
  LAST_YEAR,
  DOCUMENT,
  markDocument,
  intoTheListedSectionScreen,
} = require('../support/section-jump');

/**
 * #272 ชิ้นที่สอง — ช่องค้นหาของ `Users` และของสองจอฝั่งอาจารย์
 *
 * คำตอบของเจ้าของงาน 13 พฤศจิกายน 2569 ข้อ 3: ช่องค้นหาของ *ข้อมูลผู้ใช้งาน* เหมือนสี่จอ
 * ของชิ้นแรกทั้งสามเรื่อง — หน่วงก่อนถาม มีแว่นขยาย และ `%` `_` เป็นตัวอักษรธรรมดา และคำตอบ
 * ข้อ 1 ของ 12 พฤศจิกายน 2569: จออาจารย์ที่ระบบที่ส่งมอบมีช่องค้นหาได้ช่องนั้นกลับมา —
 * *รายชื่อนักศึกษาของรายวิชา* (`SubjectStudents.js`) และ *กลุ่มงาน* (`StudentGroups.js`,
 * *ค้นทั้งชื่อกลุ่มและสมาชิก*) จอ CLO ไม่ได้ เพราะช่องของระบบเดิมไม่ได้ทำอะไร
 * (`onSearch={() => {}}`) และเจ้าของงานตอบว่าไม่ใส่
 *
 * ## สองกลไก
 *
 * *รายชื่อนักศึกษา* แบ่งหน้าที่เซิร์ฟเวอร์ (`?q=` ของ `backend/routes/enrolment.js`)
 * แถวแรกจึงหานักศึกษาที่อยู่หน้าสี่ของรายชื่อที่ยังไม่ค้น *กลุ่มงาน* ได้ทุกกลุ่มของตอนเรียน
 * ในคำตอบเดียวและไม่แบ่งหน้า จึงกรองในเบราว์เซอร์ — แถวของมันไม่ได้นับคำขอ นับการ์ด
 *
 * ## ตัวเลขบนหัวจอไม่ตามคำค้น
 *
 * *นักศึกษา N คน* ของรายชื่อ และ *N กลุ่ม* ของกลุ่มงาน เป็นของทั้งตอนเรียน ซึ่งการ์ดตอนเรียน
 * บนหน้าแรกก็แสดง (`SubjectStudents.js` §*The counts*) คำค้นจึงไม่ขยับมัน — บนรายชื่อนั่น
 * คือฟิลด์ใหม่ `enrolled` ในคำตอบ เพราะ `total` กลายเป็นยอดที่ค้นได้ ซึ่ง pager ใช้
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าแว่นขยายหน้าตาเป็นอย่างไร** — เป็นแถวเดินมือ แถวที่นี่อ่านว่าช่องเป็น
 *   `searchbox` ซึ่งคือ `components/SearchBox.js`
 * - **ไม่ได้พูดเรื่องจำนวนมิลลิวินาทีของการหน่วง** — `272a` ด้วยเหตุผลเดียวกัน (#52)
 * - **ไม่ได้พูดแทนหน้ารวมรายวิชาของอาจารย์ จอนักศึกษา และ `UserHistory`** ซึ่งเป็นชิ้นถัดไป ·
 *   `UserHistory` อยู่ที่ `272c-the-search-box-on-the-history-picker.spec.js` ตั้งแต่ 13 พ.ย. 2569
 *
 * `hold()` คืนสกีมาทั้งอัน · ไม่ใช่ `serial` เพราะแต่ละแถวเขียนของของตัวเอง (#67, #88)
 */

const db = createPool({ schema: E2E_SCHEMA });

let release;
let section;
let tail;
test.beforeAll(async ({ browser }) => {
  release = await hold();
  const page = await browser.newPage();
  await signIn(page, ACCOUNTS.teacherOne);
  [section] = await enrolment.mySectionIds(page);
  await page.close();
  // The students of the Section that no group holds - `26a`'s query.
  const { rows } = await db.query(
    `SELECT sc.student_id FROM student_course sc
      WHERE sc.section_id = $1
        AND NOT EXISTS (SELECT 1 FROM student_group_member m
                          JOIN student_group g ON g.group_id = m.group_id
                         WHERE g.section_id = sc.section_id AND m.student_id = sc.student_id)
      ORDER BY sc.student_id`,
    [section],
  );
  tail = rows.map(row => row.student_id);
});
test.afterAll(async () => {
  await release();
  await db.end();
});

/** The screen's own notice. */
const notice = page => page.getByRole('status');

/** The read of a list whose `q` is the term a row typed (#160, #116). */
const readWith = (page, matches, term) =>
  page.waitForResponse(answer => {
    const url = new URL(answer.url());
    return (
      answer.request().method() === 'GET' && matches(url.pathname) && url.searchParams.get('q') === term
    );
  });

// ---------------------------------------------------------------- Users

/** A term no seeded account holds, so a create under it lands outside. */
const NOBODY = 'zz_272';

test('Users: the box is the shared search box, and an underscore is a character', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await users.openUsers(page);
  // The shared box, read before it is typed into, so the plain input of #20
  // dies here at a claim and not at the fill's timeout (#139).
  const box = page.getByRole('searchbox', { name: 'ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้' });
  await expect(box, 'the search box of `components/SearchBox.js`').toBeVisible();
  // `teacher_one` is `teacher.one@kmitl.ac.th` to `ILIKE`'s `_`, and nothing as text.
  const [answer] = await Promise.all([
    readWith(page, path => path === users.API, 'teacher_one'),
    box.fill('teacher_one'),
  ]);
  expect(answer.status()).toBe(200);
  expect((await answer.json()).total, 'the server reads the underscore as itself').toBe(0);
});

/**
 * Fills the add-account form and sends it, waiting for the write and the read
 * after it - `247b`'s `createAccount`, for its reasons: the department is the
 * signed-in administrator's own (#251), and the sentence is said by the read.
 */
async function createAccount(page, { id, email }) {
  const department = DEPARTMENTS[0].id;
  await page.getByRole('button', { name: 'เพิ่มผู้ใช้งาน' }).click();
  await page.getByLabel('รหัสผู้ใช้', { exact: true }).fill(id);
  await page.getByLabel('อีเมล', { exact: true }).fill(email);
  await page.getByLabel('ชื่อ (ไทย)', { exact: true }).fill('ค้นหา');
  await page.getByLabel('นามสกุล (ไทย)', { exact: true }).fill('ผู้ทดสอบ');
  await page.getByLabel('รหัสภาควิชา', { exact: true }).fill(department);
  await page.locator('select:has(option:text-is("— เลือกบทบาท —"))').selectOption('TEACHER');
  await page.locator('select:has(option:text-is("— เลือกขอบเขต —"))').selectOption(department);
  const [written] = await Promise.all([
    page.waitForResponse(
      answer => new URL(answer.url()).pathname === users.API && answer.request().method() === 'POST',
    ),
    page.waitForResponse(
      answer => new URL(answer.url()).pathname === users.API && answer.request().method() === 'GET',
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  expect(written.status()).toBe(201);
}

test('Users: an account created under a term holding an underscore is said to be outside it', async ({
  page,
}) => {
  // Until 13 November 2569 the screen answered *inside* for any term holding
  // `%` or `_`, the route reading them as wildcards; the route reads them as
  // characters now, so the screen has to say what the route does.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await users.openUsers(page);
  const answered = await users.search(page, NOBODY);
  expect((await answered.json()).users, 'the precondition: nobody holds the term').toHaveLength(0);
  await createAccount(page, { id: 'z272u', email: 'z272.under@kmitl.ac.th' });
  await expect(notice(page)).toHaveText(`บันทึกข้อมูลเรียบร้อยแล้ว ${OUTSIDE_THE_FILTER}`);
  await expect(users.userRow(page, 'z272.under@kmitl.ac.th')).toHaveCount(0);
});

// ------------------------------------------------- รายชื่อนักศึกษาของรายวิชา

const CLASS_BOX = 'ค้นหานักศึกษา';
const isClassList = path => enrolment.API.test(path);

/** Types a term into the class list's box and waits for the read it asked for. */
async function searchClass(page, term) {
  const [answer] = await Promise.all([
    readWith(page, isClassList, term),
    page.getByRole('searchbox', { name: CLASS_BOX }).fill(term),
  ]);
  expect(answer.status()).toBe(200);
  const { total } = await answer.json();
  if (total > 0) await untilDrawn(page, answer);
  // Nothing found: the settle point is that no student's row is left, and not
  // the empty sentence, which is C3's own claim - the review of 13 November
  // 2569 found the helper reading it for every caller (#81, #233).
  else
    await expect(
      enrolment.listTable(page).locator('tbody tr').filter({ hasText: /\d{8}/ }),
    ).toHaveCount(0);
  return answer;
}

/** The class list's own row for one code. */
const classRow = (page, code) => enrolment.listTable(page).locator('tbody tr').filter({ hasText: code });

test('the class list: the term is asked of the server and finds a student four pages in', async ({
  page,
}) => {
  const { rows } = await db.query(
    `SELECT student_id FROM student_course WHERE section_id = $1 ORDER BY student_id OFFSET 31 LIMIT 1`,
    [section],
  );
  const [{ student_id: far }] = rows;
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await expect(classRow(page, far), 'the precondition: not on page one').toHaveCount(0);
  const answer = await searchClass(page, far);
  expect((await answer.json()).total).toBe(1);
  await expect(classRow(page, far)).toHaveCount(1);
});

test("the class list: the heading's count is the whole class, not what the term found", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const opened = await enrolment.openEnrolment(page, section);
  const { total: enrolled } = await opened.json();
  await searchClass(page, '66010001');
  await expect(page.getByText(`นักศึกษา ${enrolled} คน`), 'the class size stands').toBeVisible();
});

test('the class list: a term nothing holds says so', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await searchClass(page, 'zz272-nothing');
  await expect(page.getByText('ไม่พบนักศึกษาตามคำค้น', { exact: true })).toBeVisible();
});

test('the class list: a term typed on page two asks for page one', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await untilDrawn(page, await step(page, 'forward', each => enrolment.waitForList(each)));
  const answer = await searchClass(page, '6601');
  expect(new URL(answer.url()).searchParams.get('page'), 'the read the term asked for').toBe('1');
  await expect(pagerLine(page)).toContainText('หน้า 1 จาก');
});

/** Enrols a code and hands back the student the server answered with. */
async function enrolCode(page, code) {
  const [written] = await Promise.all([
    enrolment.enrol(page, code),
    // The read the sentence is said by - page one, under the term (#238).
    page.waitForResponse(
      answer => isClassList(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
    ),
  ]);
  expect(written.status(), `the enrolment of ${code}`).toBe(201);
  return (await written.json()).student;
}

test('the class list: an enrolment the term does not find says #247’s sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await searchClass(page, 'zz272-nothing');
  const student = await enrolCode(page, '65010001');
  await expect(notice(page)).toHaveText(
    `เพิ่ม ${student.student_id} ${student.full_name_th} เข้าตอนเรียนแล้ว ${OUTSIDE_THE_FILTER}`,
  );
  await expect(classRow(page, '65010001')).toHaveCount(0);
});

test('the class list: an enrolment the term finds says only its own sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await searchClass(page, '65010002');
  const student = await enrolCode(page, '65010002');
  await expect(classRow(page, '65010002'), 'the list holds the student').toHaveCount(1);
  await expect(notice(page)).toHaveText(
    `เพิ่ม ${student.student_id} ${student.full_name_th} เข้าตอนเรียนแล้ว`,
  );
});

test('the class list: a file the term does not find says the import’s sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await searchClass(page, 'zz272-nothing');
  const answered = await importCsv(page, {
    path: enrolment.IMPORT(section),
    text: csv('student_id', '65010003'),
    name: 'students.csv',
  });
  expect(answered.status()).toBe(201);
  await expect(notice(page)).toHaveText(SOME_IMPORTED_OUTSIDE);
});

test('the class list: a file the term finds says nothing', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, section);
  await searchClass(page, '65010004');
  const answered = await importCsv(page, {
    path: enrolment.IMPORT(section),
    text: csv('student_id', '65010004'),
    name: 'students.csv',
  });
  expect(answered.status()).toBe(201);
  await expect(importedLine(page), "the panel's own report").toBeVisible();
  await expect(classRow(page, '65010004'), 'the list was redrawn with the student').toHaveCount(1);
  await expect(notice(page), 'and the screen adds nothing').toHaveCount(0);
});

// ------------------------------------------------------------- กลุ่มงาน

const GROUP_BOX = 'ค้นหากลุ่มหรือสมาชิก';
const MARK = 'ทดสอบ272';

/**
 * Types into the groups box. Nothing is asked of the server - the filter is in
 * the browser - so each row waits for the cards instead, read back as a whole
 * list of names so that a filter that hid too much and one that hid too little
 * are both red.
 */
async function searchGroups(page, term) {
  await page.getByRole('searchbox', { name: GROUP_BOX }).fill(term);
}

/** The group cards drawn, by name. */
const cardNames = page => groups.groupNames(page);

test('the groups: a group name finds that group and no other', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await expect.poll(() => cardNames(page), 'the seeded groups').toContain('กลุ่มที่ 2');
  await searchGroups(page, 'กลุ่มที่ 2');
  await expect.poll(() => cardNames(page)).toEqual(['กลุ่มที่ 2']);
});

test("the groups: a member's code finds the group they are in", async ({ page }) => {
  const { rows } = await db.query(
    `SELECT g.group_name, m.student_id FROM student_group g
       JOIN student_group_member m ON m.group_id = g.group_id
      WHERE g.section_id = $1 AND g.group_name = 'กลุ่มที่ 3'
      ORDER BY m.student_id LIMIT 1`,
    [section],
  );
  const [{ student_id: code }] = rows;
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await expect.poll(() => cardNames(page)).toContain('กลุ่มที่ 3');
  await searchGroups(page, code);
  await expect.poll(() => cardNames(page)).toEqual(['กลุ่มที่ 3']);
});

test("the groups: a member's name finds the group they are in", async ({ page }) => {
  // A name no other student of the Section has, so one group holds it.
  const { rows } = await db.query(
    `SELECT g.group_name, s.full_name_th FROM student_group g
       JOIN student_group_member m ON m.group_id = g.group_id
       JOIN student s ON s.student_id = m.student_id
      WHERE g.section_id = $1
        AND (SELECT count(*) FROM student_course sc JOIN student o ON o.student_id = sc.student_id
              WHERE sc.section_id = $1 AND o.full_name_th = s.full_name_th) = 1
      ORDER BY g.group_name, s.student_id LIMIT 1`,
    [section],
  );
  const [{ group_name: group, full_name_th: name }] = rows;
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await expect.poll(() => cardNames(page)).toContain(group);
  await searchGroups(page, name);
  await expect.poll(() => cardNames(page)).toEqual([group]);
});

test("the groups: a term nothing holds says so, and the heading's count stands", async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const opened = await groups.openGroups(page, section);
  const { groups: all } = await opened.json();
  await searchGroups(page, 'zz272-nothing');
  await expect(page.getByText('ไม่พบกลุ่มงานตามคำค้น', { exact: true })).toBeVisible();
  await expect(page.getByText(`${all.length} กลุ่ม`, { exact: false })).toBeVisible();
  await expect.poll(() => cardNames(page)).toEqual([]);
});

/** Waits until the cards the term leaves are `names`, before a write is pressed. */
const cardsAre = (page, names) => expect.poll(() => cardNames(page)).toEqual(names);

/**
 * Waits until a term holding `MARK` has taken the seeded cards away, for the
 * rows whose term finds only what they are about to write. The box asks once
 * typing pauses (`components/SearchBox.js`), and a write pressed inside that
 * pause is sent from a render whose term is still empty - which made G6 pass
 * under `s272bgroupssavealways`, swept 13 November 2569. No seeded group holds
 * `MARK`.
 */
const seedHidden = page => expect.poll(() => cardNames(page)).not.toContain('กลุ่มที่ 1');

test('the groups: a group created outside the term says #247’s sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await searchGroups(page, 'กลุ่มที่ 1');
  await cardsAre(page, ['กลุ่มที่ 1']);
  const written = await groups.createGroup(page, section, `${MARK} ก`);
  expect(written.status()).toBe(201);
  await expect(notice(page)).toHaveText(`สร้างกลุ่ม ${MARK} ก แล้ว ${OUTSIDE_THE_FILTER}`);
  await cardsAre(page, ['กลุ่มที่ 1']);
});

test('the groups: a group created inside the term says only its own sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await searchGroups(page, MARK);
  await seedHidden(page);
  const written = await groups.createGroup(page, section, `${MARK} ข`);
  expect(written.status()).toBe(201);
  await expect.poll(() => cardNames(page)).toContain(`${MARK} ข`);
  await expect(notice(page)).toHaveText(`สร้างกลุ่ม ${MARK} ข แล้ว`);
});

test('the groups: a rename the term does not find says #247’s sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  expect((await groups.createGroup(page, section, `${MARK} ค`)).status()).toBe(201);
  await searchGroups(page, `${MARK} ค`);
  await cardsAre(page, [`${MARK} ค`]);
  await page.getByRole('button', { name: `เปลี่ยนชื่อ ${MARK} ค` }).click();
  await page.getByLabel(`ชื่อใหม่ของ ${MARK} ค`).fill(`${MARK} ง`);
  const [renamed] = await Promise.all([
    page.waitForResponse(answer => answer.request().method() === 'PUT'),
    page.getByRole('button', { name: 'บันทึกชื่อ' }).click(),
  ]);
  expect(renamed.status()).toBe(200);
  await expect(notice(page)).toHaveText(`เปลี่ยนชื่อกลุ่มเป็น ${MARK} ง แล้ว ${OUTSIDE_THE_FILTER}`);
  await cardsAre(page, []);
});

test('the groups: taking out the only member the term found says #247’s sentence', async ({
  page,
}) => {
  const [code] = tail;
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  expect((await groups.createGroup(page, section, `${MARK} จ`)).status()).toBe(201);
  expect((await groups.place(page, section, `${MARK} จ`, code, 'add')).status()).toBe(201);
  await searchGroups(page, code);
  await cardsAre(page, [`${MARK} จ`]);
  const out = await groups.takeOut(page, section, `${MARK} จ`, code);
  expect(out.status()).toBe(204);
  const { rows } = await db.query('SELECT full_name_th FROM student WHERE student_id = $1', [code]);
  await expect(notice(page)).toHaveText(
    `นำ ${rows[0].full_name_th} ออกจาก ${MARK} จ แล้ว ${OUTSIDE_THE_FILTER}`,
  );
});

test('the groups: a file the term does not find says the import’s sentence', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await searchGroups(page, 'กลุ่มที่ 1');
  await cardsAre(page, ['กลุ่มที่ 1']);
  const answered = await importCsv(page, {
    path: `${groups.API(section)}/import`,
    text: csv('group_name,student_id', `${MARK} ฉ,${tail[1]}`),
    name: 'groups.csv',
  });
  expect(answered.status()).toBe(201);
  await expect(notice(page)).toHaveText(SOME_IMPORTED_OUTSIDE);
});

test('the groups: a file the term finds says nothing', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await groups.openGroups(page, section);
  await searchGroups(page, `${MARK} ช`);
  await seedHidden(page);
  const answered = await importCsv(page, {
    path: `${groups.API(section)}/import`,
    text: csv('group_name,student_id', `${MARK} ช,${tail[2]}`),
    name: 'groups.csv',
  });
  expect(answered.status()).toBe(201);
  await expect(importedLine(page), "the panel's own report").toBeVisible();
  await expect.poll(() => cardNames(page), 'the cards were redrawn with the group').toContain(`${MARK} ช`);
  await expect(notice(page), 'and the screen adds nothing').toHaveCount(0);
});

// ------------------------------------------------- a jump to another ตอนเรียน

/**
 * The owner's answer of 13 November 2569: a jump to another Section clears the
 * term. The only jump that keeps these screens mounted is the history list
 * (#141's way in, `support/section-jump.js`): last year's Section by its
 * address, the dashboard, this year's Section, the screen, and back three in
 * one move. Going through the dashboard unmounts the screen and clears the term
 * by itself, which is why the question needed asking twice.
 *
 * The request is read before the box, so a term held across the jump dies at
 * the read and a box that kept what was typed dies at the box - the two
 * mutants of each screen.
 */
async function jumpBack(page, isRead) {
  const read = page.waitForResponse(answer => isRead(new URL(answer.url())));
  await page.evaluate(() => window.history.go(-3));
  const answer = await read;
  expect(answer.status()).toBe(200);
  expect(await page.evaluate(() => window.__document), 'the screen was never remounted').toBe(DOCUMENT);
  return answer;
}

test('the class list: a jump to another ตอนเรียน clears the term', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  await enrolment.openEnrolment(page, LAST_YEAR);
  await markDocument(page);
  await intoTheListedSectionScreen(page, section, '/subjectStudents', p =>
    p.waitForResponse(answer => isClassList(new URL(answer.url()).pathname)),
  );
  await searchClass(page, 'zz272-nothing');

  const answer = await jumpBack(
    page,
    url => url.pathname === `/api/teaching/sections/${LAST_YEAR}/students`,
  );
  expect(new URL(answer.url()).searchParams.get('q'), 'the read the jump made').toBeNull();
  await expect(page.getByRole('searchbox', { name: CLASS_BOX })).toHaveValue('');
});

test('the groups: a jump to another ตอนเรียน clears the term', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  // A group last year's Section holds whatever the seed gives it, so that a
  // term left standing has something to hide (#129). `hold()` takes it out.
  const made = await page.request.post(`${BACKEND_URL}${groups.API(LAST_YEAR)}`, {
    data: { group_name: `${MARK} ซ` },
  });
  expect(made.status()).toBe(201);
  await groups.openGroups(page, LAST_YEAR);
  await markDocument(page);
  await intoTheListedSectionScreen(page, section, '/studentGroups', p =>
    p.waitForResponse(answer => new URL(answer.url()).pathname === groups.API(section)),
  );
  await searchGroups(page, 'zz272-nothing');
  await expect.poll(() => cardNames(page)).toEqual([]);

  const answer = await jumpBack(page, url => url.pathname === groups.API(LAST_YEAR));
  const { groups: all } = await answer.json();
  await expect
    .poll(() => cardNames(page), 'every group of the Section the jump went to')
    .toEqual(all.map(group => group.group_name));
  await expect(page.getByRole('searchbox', { name: GROUP_BOX })).toHaveValue('');
});
