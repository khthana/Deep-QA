'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { hold } = require('../support/hold');
const { signIn } = require('../support/auth');
const { OUTSIDE_THE_FILTER, SOME_IMPORTED_OUTSIDE } = require('../support/outside-the-filter');
const { downloadTemplate, headerOf, csv, importedLine } = require('../support/import-panel');
const { untilDrawn, step, pagerLine } = require('../support/pager');
const departments = require('../support/departments-screen');
const programs = require('../support/programs-screen');
const subjects = require('../support/subjects-screen');
const students = require('../support/students-screen');

/**
 * #272 — ช่องค้นหาของจอรายการฝั่งผู้ดูแล
 *
 * คำตอบของเจ้าของงานเมื่อ 12 พฤศจิกายน 2569 (ตามเสนอทั้งห้าข้อ): จอที่ระบบที่ส่งมอบมี
 * ช่องค้นหา ได้ช่องค้นหากลับมา · ค้นทุกคอลัมน์ที่ตารางแสดง ไม่สนตัวพิมพ์ เป็นสายย่อย ·
 * ค้นเมื่อพิมพ์ โดยหน่วงสั้น ๆ · แถวที่บันทึกหรือนำเข้าแล้วตกนอกคำค้น ได้ประโยคของ #247 ·
 * และที่ `Users` คำค้นอยู่ร่วมกับตัวกรองเดิม
 *
 * ชิ้นนี้คือกลุ่มแรกที่ตกลงกันไว้ — สี่จอของผู้ดูแล: ภาควิชา หลักสูตร รายวิชา นักศึกษากลาง
 * `Users` มีช่องค้นหาฝั่งเซิร์ฟเวอร์อยู่แล้วตั้งแต่ #20 และ `UserHistory` มีช่องค้นในตัวเลือก
 * ของมันเอง ฉะนั้นไม่อยู่ในแฟ้มนี้ · ช่องของ `Users` ได้การหน่วงและแว่นของแฟ้มนี้ในชิ้นที่สอง
 * 13 พ.ย. 2569 ซึ่งแถวของมันอยู่ที่ `272b-the-search-box-on-three-more-screens.spec.js` และช่องของ
 * `UserHistory` ได้ในชิ้นที่สาม วันเดียวกัน ที่ `272c-the-search-box-on-the-history-picker.spec.js`
 *
 * ## ทำไมการค้นอยู่ที่เซิร์ฟเวอร์
 *
 * ระบบที่ส่งมอบกรองแถวที่อยู่ในมือ (`SeachSection.js`, `toLowerCase().includes`) ส่วน
 * รายการของการสร้างใหม่แบ่งหน้าที่เซิร์ฟเวอร์ ถือทีละสิบแถว ช่องเดียวกันในเบราว์เซอร์จะ
 * หาเจอแค่หน้าปัจจุบัน — แถวของ `Students` จึงหานักศึกษาที่อยู่ **หน้าสุดท้าย** ของทะเบียน
 * ที่ยังไม่ได้ค้น ซึ่งเป็นจอเดียวในสี่จอที่ข้อมูลตั้งต้นมีเกินหนึ่งหน้า
 *
 * ## หกแถวต่อจอ และเหตุผลที่แยกกัน
 *
 * แต่ละจอเขียนกลไกของตัวเอง (ส่ง `q`, คีย์ของการอ่าน, ประโยคตอนว่าง, ประโยคตอนบันทึก,
 * ประโยคตอนนำเข้า) ฉะนั้นข้ออ้างของแต่ละจอแยกมัตแตนต์ได้ (#68, #104) และแต่ละข้ออ้างมี
 * แถวคุมที่ตอบว่า *ไม่* (#48) — แถวคุมคือสิ่งที่ฆ่ามัตแตนต์ *พูดทุกครั้ง*
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าถ้อยคำถูกต้องไหม** — *ไม่พบ…ตามคำค้น* เป็นรูปของ `Users`
 *   (*ไม่พบผู้ใช้งานตามเงื่อนไขที่เลือก*) ที่ระบบที่ส่งมอบไม่มี และเป็นของเจ้าของงาน
 * - **ไม่ได้พูดเรื่องการหน่วง** ว่ากี่มิลลิวินาที — มันไม่ได้ตัดสินว่าจะวาดอะไร (#52)
 * - **ไม่ได้พูดเรื่องคำตอบที่มาช้ากว่าคำค้นถัดไป** — ตัวป้องกัน `isCurrent` ของแต่ละจอถือไว้
 *   แล้ว และคีย์ของมันคือ `load` ที่สร้างใหม่ตาม `q` (#140)
 * - **ไม่ได้พูดแทนจอฝั่งอาจารย์ หน้าแรก และจอนักศึกษา** สิ่งเหล่านั้นคือชิ้นถัดไปของ #272
 *
 * `hold()` คืนสกีมาทั้งอัน · ไม่ใช่ `serial` เพราะทุกแถวเขียนรหัสของตัวเอง (#67, #88)
 */

const db = createPool({ schema: E2E_SCHEMA });

/**
 * A second subject of department 05, which the Subjects term does not find.
 * The seed holds one subject, so without it a server that ignored the term
 * still counts one and row a asks nothing there (the 12 November 2569 sweep:
 * `s272searchignored` and `s272searchcase` both left Subjects' row a green).
 * `hold()` gives the schema back whole, so it goes with everything else.
 */
const SUBJECT_BYSTANDER = 'K2720005';

let release;
test.beforeAll(async () => {
  release = await hold();
  await db.query(
    `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
     VALUES ($1, $2, $3, 3, '05', $4)`,
    [SUBJECT_BYSTANDER, `วิชาข้างเคียง ${SUBJECT_BYSTANDER}`, `BYSTANDER ${SUBJECT_BYSTANDER}`, byAlias('U_ADMIN')],
  );
});
test.afterAll(async () => {
  await release();
  await db.end();
});

/** The screen's own notice. */
const notice = page => page.getByRole('status');

/** One data line, in whatever order the screen's own template puts the columns. */
const lineFor = (header, fields) =>
  header
    .split(',')
    .map(column => fields[column.trim()] ?? '')
    .join(',');

/** Fills one labelled field of the open form. */
const fill = (page, label, value) => page.getByLabel(label, { exact: true }).fill(value);

/**
 * Types a term and waits for the read it asks for - matched by the request's
 * own `q`, so an answer to the list as it was before the term is never the one
 * handed back (#160, #116).
 */
async function search(page, { label, path }, term) {
  const [answer] = await Promise.all([
    page.waitForResponse(response => {
      const url = new URL(response.url());
      return (
        url.pathname === path &&
        response.request().method() === 'GET' &&
        url.searchParams.get('q') === term
      );
    }),
    page.getByRole('searchbox', { name: label }).fill(term),
  ]);
  expect(answer.status(), `the read the term ${term} asked for`).toBe(200);
  return answer;
}

/**
 * Searches and waits for the answer to be what the screen shows: the pager's
 * line when the term holds anything, the screen's own empty sentence when it
 * holds nothing - which the pager does not draw (#132).
 */
async function searchAndDraw(page, screen, term) {
  const answer = await search(page, screen, term);
  const { total } = await answer.json();
  if (total > 0) await untilDrawn(page, answer);
  else await expect(page.getByText(screen.nothing, { exact: true })).toBeVisible();
  return answer;
}

/**
 * The four screens, each with what its six rows need. `outside` and `inside`
 * are records the form or the file writes: one the screen's term does not find
 * and one it does.
 */
const SCREENS = [
  {
    name: 'Departments',
    account: ACCOUNTS.facultyAdmin,
    open: departments.openDepartments,
    path: '/api/departments',
    label: 'ค้นหาภาควิชา',
    term: 'civil',
    found: '01',
    hidden: '05',
    rowOf: departments.departmentRow,
    nothing: 'ไม่พบภาควิชาตามคำค้น',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    add: async (page, record) => {
      await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
      await fill(page, 'รหัสภาควิชา', record.department_id);
      await fill(page, 'ชื่อภาควิชา (ไทย)', record.department_name_th);
      await fill(page, 'ชื่อภาควิชา (อังกฤษ)', record.department_name_en);
      await departments.save(page);
    },
    importer: departments.importDepartments,
    record: (id, matching) => ({
      department_id: id,
      department_name_th: `ภาควิชาทดสอบ ${id}`,
      department_name_en: matching ? `Civil Search ${id}` : `Search ${id}`,
    }),
    ids: { saveOutside: 'K7', saveInside: 'K8', importOutside: 'K5', importInside: 'K6' },
    idOf: record => record.department_id,
  },
  {
    name: 'Programs',
    account: ACCOUNTS.facultyAdmin,
    open: programs.openPrograms,
    path: '/api/programs',
    label: 'ค้นหาหลักสูตร',
    term: 'civil',
    found: '0101',
    hidden: '0501',
    rowOf: programs.programRow,
    nothing: 'ไม่พบหลักสูตรตามคำค้น',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    add: async (page, record) => {
      await page.getByRole('button', { name: 'เพิ่มหลักสูตร' }).click();
      await fill(page, 'รหัสหลักสูตร', record.program_id);
      // By role: the label wraps the select, so its text carries the options (#180).
      await page.getByRole('combobox', { name: 'ภาควิชา' }).selectOption(record.department_id);
      await fill(page, 'ชื่อหลักสูตร (ไทย)', record.program_name_th);
      await fill(page, 'ชื่อหลักสูตร (อังกฤษ)', record.program_name_en);
      await fill(page, 'ปีหลักสูตร (พ.ศ.)', record.revision_year);
      await programs.save(page);
    },
    importer: programs.importPrograms,
    record: (id, matching) => ({
      program_id: id,
      program_name_th: `หลักสูตรทดสอบ ${id}`,
      program_name_en: matching ? `Civil Search ${id}` : `Search ${id}`,
      department_id: '05',
      revision_year: '2569',
    }),
    ids: { saveOutside: 'K271', saveInside: 'K272', importOutside: 'K273', importInside: 'K274' },
    idOf: record => record.program_id,
  },
  {
    name: 'Subjects',
    // The two registers below belong to the department administrators.
    account: ACCOUNTS.departmentAdmin05,
    open: subjects.openSubjects,
    path: '/api/subjects',
    label: 'ค้นหารายวิชา',
    term: 'object',
    // Row a types the term in the other case from the record it finds, and the
    // seeded English name is already upper case (`OBJECT ORIENTED PROGRAMMING`),
    // so here it types lower case - upper case would match a case-blind search
    // and a case-sensitive one alike (the 12 November 2569 sweep).
    asked: 'object',
    found: '01076105',
    hidden: SUBJECT_BYSTANDER,
    rowOf: subjects.subjectRow,
    nothing: 'ไม่พบรายวิชาตามคำค้น',
    saved: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    add: async (page, record) => {
      await subjects.fillNewSubject(page, record);
      await subjects.save(page);
    },
    importer: subjects.importSubjects,
    record: (id, matching) => ({
      subject_id: id,
      subject_name_th: `วิชาทดสอบ ${id}`,
      subject_name_en: matching ? `OBJECT SEARCH ${id}` : `SEARCH ${id}`,
      credits: 3,
      department_id: '05',
    }),
    ids: {
      saveOutside: 'K2720001',
      saveInside: 'K2720002',
      importOutside: 'K2720003',
      importInside: 'K2720004',
    },
    idOf: record => record.subject_id,
  },
  {
    name: 'Students',
    account: ACCOUNTS.departmentAdmin05,
    open: students.openRegister,
    path: '/api/students',
    label: 'ค้นหานักศึกษา',
    term: '65010003',
    found: '65010003',
    hidden: null,
    rowOf: students.registerRow,
    nothing: 'ไม่พบนักศึกษาตามคำค้น',
    saved: 'บันทึกข้อมูลนักศึกษาเรียบร้อยแล้ว',
    add: async (page, record) => {
      const answer = await students.addStudent(page, {
        code: record.student_id,
        first: record.first_name_th,
        last: record.last_name_th,
        program: record.program_id,
      });
      expect(answer.status(), `the add of ${record.student_id}`).toBe(201);
    },
    importer: students.importCsv,
    // The seeded term is a code no record here holds, so these rows search on
    // `termFor` instead, which the inside records hold in their full name.
    record: (id, matching) => ({
      student_id: id,
      first_name_th: 'ค้นหา',
      last_name_th: matching ? 'ตรงคำค้น' : 'นอกคำค้น',
      program_id: PROGRAM,
    }),
    termFor: 'ตรงคำค้น',
    ids: {
      saveOutside: '69272001',
      saveInside: '69272002',
      importOutside: '69272003',
      importInside: '69272004',
    },
    idOf: record => record.student_id,
  },
];

for (const screen of SCREENS) {
  // The term the write rows search on: Students' seeded term is a code nothing
  // written here holds, so those rows search on a name instead.
  const writeTerm = screen.termFor ?? screen.term;

  test(`${screen.name}: the term is asked of the server, and the list draws what holds it`, async ({
    page,
  }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    if (screen.name === 'Students') {
      await expect(
        screen.rowOf(page, screen.found),
        'the precondition: the student is not on the first page of the unsearched register',
      ).toHaveCount(0);
    }

    const answer = await search(page, screen, screen.asked ?? screen.term.toUpperCase());
    // The count before the drawing: a server that found nothing draws no pager,
    // and waiting for one first would die at the wait, not at the claim (#139).
    const body = await answer.json();
    expect(body.total, 'the server counted only what holds the term, in any case').toBe(1);
    await untilDrawn(page, answer);
    await expect(screen.rowOf(page, screen.found), 'and the list draws it').toHaveCount(1);
    if (screen.hidden) {
      await expect(screen.rowOf(page, screen.hidden), 'and not what does not').toHaveCount(0);
    }
  });

  test(`${screen.name}: a term nothing holds says so`, async ({ page }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    await search(page, screen, 'zz272-nothing');
    await expect(page.getByText(screen.nothing, { exact: true })).toBeVisible();
  });

  test(`${screen.name}: a save the term does not find says #247's sentence`, async ({ page }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    await searchAndDraw(page, screen, writeTerm);
    const record = screen.record(screen.ids.saveOutside, false);
    await screen.add(page, record);
    await expect(notice(page), 'the screen’s own sentence, and the shared one').toHaveText(
      `${screen.saved} ${OUTSIDE_THE_FILTER}`,
    );
    await expect(screen.rowOf(page, screen.idOf(record)), 'over a list without it').toHaveCount(0);
  });

  test(`${screen.name}: a save the term finds says only the screen's sentence`, async ({
    page,
  }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    await searchAndDraw(page, screen, writeTerm);
    const record = screen.record(screen.ids.saveInside, true);
    await screen.add(page, record);
    await expect(screen.rowOf(page, screen.idOf(record)), 'the list holds it').toHaveCount(1);
    await expect(notice(page), 'and nothing is added to the sentence').toHaveText(screen.saved);
  });

  test(`${screen.name}: a file the term does not find says the import's sentence`, async ({
    page,
  }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    const header = headerOf(await downloadTemplate(page));
    await searchAndDraw(page, screen, writeTerm);
    const record = screen.record(screen.ids.importOutside, false);
    const answered = await screen.importer(page, csv(header, lineFor(header, record)));
    expect(answered.status(), 'the import, which is the way in').toBe(201);
    await expect(notice(page), 'the screen says the rows are not here').toHaveText(
      SOME_IMPORTED_OUTSIDE,
    );
    await expect(screen.rowOf(page, screen.idOf(record))).toHaveCount(0);
  });

  test(`${screen.name}: a file the term finds says nothing`, async ({ page }) => {
    await signIn(page, screen.account);
    await screen.open(page);
    const header = headerOf(await downloadTemplate(page));
    await searchAndDraw(page, screen, writeTerm);
    const record = screen.record(screen.ids.importInside, true);
    const answered = await screen.importer(page, csv(header, lineFor(header, record)));
    expect(answered.status(), 'the import, which is the way in').toBe(201);
    await expect(importedLine(page), "the panel's own report").toBeVisible();
    await expect(
      screen.rowOf(page, screen.idOf(record)),
      'precondition of the claim below: the file was written and the list redrawn',
    ).toHaveCount(1);
    await expect(notice(page), 'and the screen adds nothing').toHaveCount(0);
  });
}

test('the box comes back holding the term the list is on when a form closes', async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await departments.openDepartments(page);
  await searchAndDraw(page, SCREENS[0], 'civil');
  await page.getByRole('button', { name: 'เพิ่มภาควิชา' }).click();
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(page.getByRole('searchbox', { name: 'ค้นหาภาควิชา' })).toHaveValue('civil');
  await expect(departments.departmentRow(page, '05'), 'and the list is still the searched one').toHaveCount(0);
});

test('Subjects: a save the credits find says only the screen\'s sentence', async ({ page }) => {
  // The table draws the credits and the delivered table searched them with the
  // rest of the record (`SubjectTable.js`, `Object.values`) - the review of
  // 12 November 2569. `9` is held by no code or name here, and by no seeded
  // subject's credits, so the list starts empty and the record is found by its
  // credits alone.
  const screen = SCREENS.find(each => each.name === 'Subjects');
  await signIn(page, screen.account);
  await screen.open(page);
  await searchAndDraw(page, screen, '9');
  const record = { ...screen.record('K2720006', false), credits: 9 };
  await screen.add(page, record);
  await expect(screen.rowOf(page, record.subject_id), 'the server finds it by its credits').toHaveCount(1);
  await expect(notice(page), 'and the screen does too').toHaveText(screen.saved);
});

/** Whether a request is a read of the register. */
const isRegisterRead = response => {
  const url = new URL(response.url());
  return response.request().method() === 'GET' && url.pathname === '/api/students';
};

test('a term the list is already on, once trimmed, leaves the page where it is', async ({ page }) => {
  // The review of 12 November 2569: a space added to the term is the same
  // search to the server, so handing it on would only send the person back to
  // page one. The register is the one list the seed fills past a page.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await students.openRegister(page);
  await untilDrawn(page, await step(page, 'forward', each => each.waitForResponse(isRegisterRead)));

  const asked = [];
  page.on('response', response => {
    if (isRegisterRead(response)) asked.push(response.url());
  });
  await page.getByRole('searchbox', { name: 'ค้นหานักศึกษา' }).fill(' ');
  // A bound on a negative, not a settle point: three times the box's delay
  // (`SEARCH_DELAY`, 300 ms), after which a box that hands the term on has
  // already asked. Nothing is decided by it (#52) - the read below is the claim.
  await page.waitForTimeout(900);
  expect(asked, 'no read was asked for').toEqual([]);
  await expect(pagerLine(page), 'and the list is still on page two').toContainText('หน้า 2 จาก');
});
