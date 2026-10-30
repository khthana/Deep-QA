'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { PROGRAMS } = require('../../db/seed');
const { hold } = require('../support/hold');
const { signIn } = require('../support/auth');
const { SOME_IMPORTED_OUTSIDE } = require('../support/outside-the-filter');
// `downloadTemplate` is the panel's own, taken from here rather than from
// `users-screen.js`, which does not re-export it: the users template is the one
// `11b` reads straight out of the shared helper too.
const { importedLine, downloadTemplate: downloadUsersTemplate } = require('../support/import-panel');
const {
  openRegister,
  downloadTemplate,
  headerOf,
  csv,
  importCsv: importStudents,
  filterProgram,
  registerRow,
} = require('../support/students-screen');
const { openUsers, search, userRow, importUsers } = require('../support/users-screen');

/**
 * #252 — ประโยคของแฟ้มที่ตกนอกตัวกรองของตาราง
 *
 * #247 ลงกฎข้อ จ ของเจ้าของงานไว้เจ็ดจอ ว่าจอที่ตารางถูกกรองและฟอร์มเขียนออกนอกตัวกรองได้
 * ต่อประโยคร่วมหนึ่งประโยค · สิ่งที่สำมะโนของตั๋วนั้นมองไม่เห็น และ docblock ของมันเขียนไว้เอง
 * คือ **ประโยคที่อยู่ในมอดูลอื่น**: `ImportPanel` พูด *นำเข้าสำเร็จ N รายการ* ด้วยตัวเอง และ
 * ถูกเมานต์บนสี่จอในเจ็ดจอนั้น เหนือแถวที่ CSV วางไว้นอกตัวกรองของจอแม่ได้
 *
 * **เจ้าของงานตอบเมื่อ 30 ตุลาคม 2569 ว่า ข้อ ง** — จอแม่พูด ผ่าน `onImported` ที่แผงเรียก
 * อยู่แล้ว ไม่ใช่ผ่าน prop ใหม่บนแผงที่มีสิบจุดเมานต์ (ข้อ ข และ ค ของใบ) ข้อ ง ไม่อยู่ในสามข้อ
 * ที่ใบเขียนไว้ และมาจากการวัดว่าแผงเรียก `onImported` อยู่แล้วและทั้งสี่จอส่งมันลงไปแล้ว
 * ฉะนั้นกลไกยังถูกคัดลอกต่อจอ ไม่ใช่แชร์กัน และข้ออ้างของแต่ละจอยังแยกมัตแตนต์ได้ (#68, #104)
 *
 * ## สองกลไก สี่แถว
 *
 * ประโยคเดียวกัน แต่คำถามที่ถามแถวที่แฟ้มเขียนนั้นไม่ใช่กลไกเดียวกัน:
 *
 * - **คีย์เดียว** — `ProgramSubjects`, `Students`, `Subjects` ส่งคำถามเข้า
 *   `someImportedOutside(filter, values)` ซึ่งเป็น `outsideFilter` ของ #247 ถามทีละแถว
 *   แฟ้มนี้ถือ `Students` ไว้เป็นตัวแทน เพราะทั้งสามเรียกกฎร่วมอันเดียวกัน (#68: สำมะโนถือจอ
 *   ที่ใช้กลไกร่วม)
 * - **สามคำถาม** — `Users` ไม่มีตัวกรองรูปนั้นเลย `importedOutsideTheFilters` ในแฟ้มของจอ
 *   เองถามคำค้นและสถานะกับแถวที่เขียน และ **ถามบทบาทไม่ได้** เพราะคำตอบของการนำเข้า
 *   ไม่ถือบทบาทมา (`COLUMNS` ของ `backend/auth/administration.js` คัดไว้โดยเจตนา) —
 *   ครึ่งที่เงียบนั้นลงวันไว้ที่ docblock ของมันและคิวของมันคือ #256 (#119)
 *
 * แถวคุมของแต่ละกลไกคือแฟ้มเดียวกันที่แถวอยู่ **ใน** รายการ — เกณฑ์ที่ตอบว่า *ไม่* ต้องมีแถว
 * เท่ากับเกณฑ์ที่ตอบว่า *ใช่* (#48) และแถวคุมคือสิ่งที่ฆ่ามัตแตนต์ *พูดทุกครั้ง*
 *
 * แถวคุมอ่านประโยค **หลัง** จากที่แถวที่นำเข้าถูกวาดลงรายการแล้ว ไม่ใช่หลังเส้นเขียวของแผง:
 * `load` เรียก `setData` แล้ว `setNotice` ในจังหวะเดียวกัน ฉะนั้นแถวที่ถูกวาดคือจุดนิ่งที่การอ่าน
 * จำนวนประโยคครั้งเดียวเชื่อถือได้ (#50) ส่วนเส้นเขียวถูกอ่านก่อน เพราะข้ออ้างที่เป็นลบต้องมี
 * เงื่อนไขนำของมันเอง — ถ้าการนำเข้าถูกปฏิเสธ แถวคุมจะเขียวเพราะไม่มีอะไรเกิดขึ้นเลย
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดถึง `ProgramSubjects` กับ `Subjects`** ทั้งสองเรียกกฎร่วมอันเดียวกับ `Students`
 *   และสำมะโน `frontend/scripts/rows-outside-the-filter.js` ถือไว้ตั้งแต่ 30 ตุลาคม 2569
 *   ว่าทั้งสี่จุดเมานต์พูดประโยคนี้
 * - **ไม่ได้พูดเรื่องบทบาทของ `Users`** นั่นคือ #256 และเป็นครึ่งที่เงียบ ไม่ใช่ครึ่งที่ผิด
 * - **ไม่ได้พูดว่าถ้อยคำถูกต้องไหม** ถ้อยคำเป็นของเจ้าของงาน (`docs/06` §Out of Scope) และ
 *   ประโยคนี้เป็นประโยคที่สองของตระกูล เพราะประโยคของ #247 พูดว่า *แถวนี้* ซึ่งแฟ้ม N แถว
 *   ถือไม่ได้
 * - **ไม่ได้พูดเรื่องหน้า** แถวที่อยู่หน้าอื่นของตัวกรองเดียวกันเป็นคำถามของ #209 และ #239
 *   ทุกแถวที่นี่อยู่หน้าหนึ่ง ซึ่งเป็นหน้าที่ `onImported` พากลับไป
 *
 * `hold()` คืนสกีมาทั้งอัน เพราะทะเบียนทั้งสองไม่มีการลบแถวที่แฟ้มนี้เขียนผ่านจอ (#134, #233)
 *
 * **ไม่ใช่ `serial`** แต่ละแถวลงชื่อเข้าใช้เอง ตั้งตัวกรองของตัวเอง และเขียนรหัสของตัวเอง
 * ส่วนสิ่งที่คืนโลกคือ `hold()` ของทั้งแฟ้ม ไม่ใช่การลบของแถวที่ผ่าน ฉะนั้นแถวแดงหนึ่งแถวไม่ได้
 * ทำให้โลกของแถวถัดไปผิด และมัตแตนต์ตัวไหนฆ่าแถวไหนยังอ่านได้ (#67, #88)
 */

/** The two programmes the register rows filter between, both inside department 05. */
const FILTERED_TO = PROGRAMS[1].id;
const WRITTEN_TO = PROGRAMS[0].id;

/** A term no seeded account holds, asserted in the rows that are about it. */
const TERM = 'zz252';

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** One data line, in whatever order the screen's own template puts the columns. */
const lineFor = (header, fields) =>
  header
    .split(',')
    .map(column => fields[column.trim()] ?? '')
    .join(',');

/** What every account this file imports shares, so each row states only its own. */
const account = fields => ({
  title_th: 'นาย',
  first_name_th: 'ทดสอบ',
  last_name_th: 'นำเข้า',
  department_id: '05',
  role_id: 'TEACHER',
  scope_id: '05',
  ...fields,
});

/** The screen's own notice, which the panel's green line is not part of. */
const notice = page => page.getByRole('status');

/** The สถานะ filter, found by the sentinel option it carries (#180). */
const statusBox = page => page.locator('select:has(option:text-is("ทุกสถานะ"))');

test('row 1: a file whose students belong to another programme', async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openRegister(page);
  const header = headerOf(await downloadTemplate(page));
  await filterProgram(page, FILTERED_TO);

  const answered = await importStudents(
    page,
    csv(
      header,
      lineFor(header, {
        student_id: '66252001',
        first_name_th: 'หนึ่ง',
        last_name_th: 'นำเข้า',
        program_id: WRITTEN_TO,
      }),
    ),
  );
  expect(answered.status()).toBe(201);

  await expect(
    notice(page),
    'the screen says where the rows the file wrote are not',
  ).toHaveText(SOME_IMPORTED_OUTSIDE);
  await expect(
    registerRow(page, '66252001'),
    'the list the sentence stands over does not hold the student the file made',
  ).toHaveCount(0);
});

test('row 2: the same file, written to the programme the register is filtered to, says nothing', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await openRegister(page);
  const header = headerOf(await downloadTemplate(page));
  await filterProgram(page, FILTERED_TO);

  const answered = await importStudents(
    page,
    csv(
      header,
      lineFor(header, {
        student_id: '66252002',
        first_name_th: 'สอง',
        last_name_th: 'นำเข้า',
        program_id: FILTERED_TO,
      }),
    ),
  );
  expect(answered.status()).toBe(201);

  await expect(importedLine(page), "the panel's own report, which is the").toBeVisible();
  await expect(
    registerRow(page, '66252002'),
    'precondition of the claim below: the file was written and the list redrawn',
  ).toHaveCount(1);
  await expect(
    notice(page),
    'and the screen adds nothing over a list that holds every row the file made',
  ).toHaveCount(0);
});

test('row 3: a file whose account does not hold the search term the register is on', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  const header = headerOf(await downloadUsersTemplate(page));

  const answered = await search(page, TERM);
  const { users } = await answered.json();
  expect(users, 'the precondition of the claim: no seeded account holds the term').toHaveLength(0);

  const written = await importUsers(
    page,
    csv(
      header,
      lineFor(
        header,
        account({ user_id: '91252003', email: 'row.three.252@kmitl.ac.th' }),
      ),
    ),
  );
  expect(written.status()).toBe(201);

  await expect(
    notice(page),
    "the screen's own three questions, asked of the rows the file wrote",
  ).toHaveText(SOME_IMPORTED_OUTSIDE);
  await expect(
    userRow(page, 'row.three.252@kmitl.ac.th'),
    'over a list that does not hold the account',
  ).toHaveCount(0);
});

test('row 4: the same file, whose account holds that term, says nothing', async ({ page }) => {
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  const header = headerOf(await downloadUsersTemplate(page));
  await search(page, TERM);

  const written = await importUsers(
    page,
    csv(
      header,
      lineFor(
        header,
        account({ user_id: '91252004', email: `row.four.${TERM}@kmitl.ac.th` }),
      ),
    ),
  );
  expect(written.status()).toBe(201);

  await expect(importedLine(page), "the panel's own report, which is the").toBeVisible();
  await expect(
    userRow(page, `row.four.${TERM}@kmitl.ac.th`),
    'precondition of the claim below: the file was written and the list redrawn',
  ).toHaveCount(1);
  await expect(
    notice(page),
    'and the screen adds nothing over a list that holds the account the file made',
  ).toHaveCount(0);
});

test('row 5: the สถานะ filter, which every imported account is outside', async ({ page }) => {
  // The second of this screen's two answerable questions, and the one the
  // search rows above cannot reach: `insertAccount` writes `'active'` as a
  // literal, so a register filtered to *ถูกระงับ* - `'inactive'` in the request -
  // can never hold a row a file
  // made. A row of its own because a mutant that breaks one clause of
  // `importedOutsideTheFilters` must be able to leave the other standing (#97).
  await signIn(page, ACCOUNTS.systemAdmin);
  await openUsers(page);
  const header = headerOf(await downloadUsersTemplate(page));

  await Promise.all([
    page.waitForResponse(
      answer => new URL(answer.url()).searchParams.get('status') === 'inactive',
    ),
    statusBox(page).selectOption('inactive'),
  ]);

  const written = await importUsers(
    page,
    csv(
      header,
      lineFor(
        header,
        account({ user_id: '91252005', email: 'row.five.252@kmitl.ac.th' }),
      ),
    ),
  );
  expect(written.status()).toBe(201);

  await expect(
    notice(page),
    'an account a file wrote is active, and the register is on the other status',
  ).toHaveText(SOME_IMPORTED_OUTSIDE);
  await expect(
    userRow(page, 'row.five.252@kmitl.ac.th'),
    'over a list that does not hold it',
  ).toHaveCount(0);
});
