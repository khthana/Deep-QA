'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { byAlias, CURRENT_YEAR, PROGRAM } = require('../../db/seed');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { gate, isGet } = require('../support/gate');
const { hold } = require('../support/hold');
const offerings = require('../support/offerings-screen');

/**
 * #250 — ตาข่ายที่บอกว่าหน้าต่างของใบนี้ไปถึงไม่ได้
 *
 * ## สิ่งที่ใบนี้อ้าง และสิ่งที่การวัดตอบ
 *
 * `Offerings.js` เป็นจอเดียวในเก้าจอของตระกูล #246 ที่มี **สองกิ่ง** ที่ `return` แทนตาราง
 * คือฟอร์ม และ `<SectionsPanel>` กลไกของ #246 (`formShown.current = Boolean(opening)`)
 * อ่านกิ่งแรกอย่างเดียว ใบนี้จึงอ้างว่าประโยคที่ฝากไว้กับการอ่านรายการถูกพูดทับแผงได้ ถ้า
 * กด *ตอนเรียนและผู้สอน* ระหว่างที่การอ่านรายการของการยกเลิกยังค้างอยู่
 *
 * วัดเมื่อ 30 ตุลาคม 2569 ด้วยแถวที่พยายามสร้างสถานการณ์นั้นจริง ๆ: มันตายที่การกด เพราะ
 * **ไม่มีแถวในตารางให้กด** `<tbody>` วาด `{loading && 'กำลังโหลด…'}` แล้ว
 * `{!loading && data.offerings.map(...)}` และ `load` ตั้ง `setLoading(true)` ตั้งแต่บรรทัดแรก
 * ระหว่างที่การอ่านค้างอยู่จึงนับได้ว่า: แถวในตาราง 2 (หัวตารางกับบรรทัด กำลังโหลด…),
 * ปุ่ม ตอนเรียนและผู้สอน **0**, ปุ่ม ยกเลิกการเปิด **0**
 *
 * **และนี่ไม่ใช่ข้อจำกัดของ seam** — `gate` ถือคำขอไว้ที่ route ซึ่งเป็นสิ่งเดียวกับที่
 * เซิร์ฟเวอร์ช้าทำ `loading` เป็นจริงตลอดช่วงทั้งในการวัดและของจริง สิ่งที่ปิดทางเข้าคือจอ
 * ไม่ใช่เครื่องมือ (ข้อที่เก้าของการอ่านตัวรอดเป็นของ #203 ซึ่งเป็น #47 ต่อไปอีกหนึ่งก้าว —
 * จอไม่มีที่ให้พูด เทียบกับ จอไม่มีปุ่มให้กด) ฉะนั้น #199 ไม่ได้ใช้กับเรื่องนี้: ระบบไม่ได้ถือสองพฤติกรรมโดยนาฬิกาเป็นคนเลือก
 * เพราะนาฬิกาเลือกไม่ได้
 *
 * หน้าต่างเดียวที่เหลืออยู่จริงคือช่องระหว่าง commit กับ passive effect ตอน `setPage(1)` ของ
 * `runCopy` และตอนที่ `load` ส่งหน้าต่อ (#209) ซึ่งต่ำกว่าหนึ่งเฟรมและสร้างเป็นแถวไม่ได้
 *
 * ## ทำไมแฟ้มนี้ยังอยู่ ทั้งที่ไม่มีข้อบกพร่องให้จับ
 *
 * คำตอบของเจ้าของงานเมื่อ 30 ตุลาคม 2569 หลังการวัดนี้: **คงการแก้ไว้ แต่เป็นตาข่าย** —
 * `listReplaced.current = Boolean(opening || viewing)` ลงไปแล้ว ไม่เปลี่ยนพฤติกรรมในทางเดิน
 * ที่ไปถึงได้ทางใดเลย และไม่มีแถวไหนถือมันได้ (#203 การอ่านที่เก้า: เอามัตแตนต์ออก ให้แถว
 * ถือ **กลไก** แทนการไม่มี แล้วเขียนเงื่อนไขที่จะทำให้ข้ออ้างกลับมาไปถึงได้ไว้ข้าง ๆ)
 *
 * แถวนี้จึงถือกลไกที่ปิดทางเข้า ไม่ใช่การแก้: **ขณะที่การอ่านที่ถือประโยคอยู่ยังค้าง จอไม่วาด
 * ปุ่มที่จะตั้ง `viewing` ได้** วันที่บรรทัด กำลังโหลด… หายไป หรือมีปุ่มที่เข้าแผงถูกวาดนอก
 * `<tbody>` แถวนี้จะแดง และนั่นคือเงื่อนไขที่ re-date ใบ #250 ทั้งใบ (#131, #141)
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พิสูจน์การแก้ของ #250** ไม่มี seam ไหนพิสูจน์ได้ `250:rowswhileloading` เป็น
 *   มัตแตนต์ของ **premise** ของตาข่ายนี้ ไม่ใช่ของข้ออ้างที่ตาข่ายยืนแทน (#141)
 * - **ไม่ได้พูดถึงช่องต่ำกว่าหนึ่งเฟรม** ที่ `setPage(1)` ทิ้งไว้ ซึ่งวัดที่ seam นี้ไม่ได้
 * - **ไม่ได้พูดว่าประโยคของ `save` ควรเป็นอย่างไร** `save` พาคนเข้าแผงพร้อมประโยคของมันเอง
 *   โดยเจตนา และประโยคนั้นออกจาก `waiting` ไปแล้วก่อนที่ `refresh` จะตั้ง `viewing` —
 *   วัดเมื่อ 30 ตุลาคม 2569 เหตุผลอยู่ที่ docblock ของ `listReplaced`
 *
 * สถานการณ์ถูกสร้างด้วย SQL ไม่ใช่ด้วยจอ: สองรายวิชาที่เปิดในปีของแฟ้มนี้เอง ปีที่ไม่มีแฟ้ม
 * อื่นเปิดรายวิชาใน (`23a` ใช้ +1, `140a` กับ `144a` ใช้ +2, `203a` ใช้ +3, `247c` ใช้ +4)
 * `hold()` วาง schema กลับเมื่อแฟ้มจบ (#134)
 */

const db = createPool({ schema: E2E_SCHEMA });

/** A year no other file opens an offering in. */
const YEAR = String(Number(CURRENT_YEAR) + 5);
const SEMESTER = '1';

/**
 * Two subjects of this file's own, so the two rows carry two codes.
 *
 * `offeringRow` finds a row by the code in its first cell, and two offerings of
 * one subject in one year would both answer to it — the cell that would tell
 * them apart is `ภาคการศึกษา`, which is a string built from two constants and so
 * a locator no grep for the words can find (#111, #124).
 */
const CANCELLED = '00250001';
const BYSTANDER = '00250002';

/** The sentence the cancellation hands to the read that draws the list. */
const CANCELLED_SAID = 'ยกเลิกการเปิดรายวิชาเรียบร้อยแล้ว';

/** The two controls a row of the table carries, which the net counts. */
const INTO_THE_PANEL = 'ตอนเรียนและผู้สอน';
const CANCEL = 'ยกเลิกการเปิด';

const OFFERINGS_LIST = /^\/api\/offerings$/;
const ONE_OFFERING = /^\/api\/offerings\/\d+$/;

/**
 * The cancellation's own answer, by the path and the method that identify it
 * (#218). The status is read as well as awaited: an offering the server
 * protects answers 409 and the screen says the refusal instead, which would
 * leave the second claim below reading the wrong sentence. The two offerings
 * here have no sections and no enrolments, so 204 is what it gets.
 */
const theCancellation = (page) =>
  page.waitForResponse(
    (answer) =>
      ONE_OFFERING.test(new URL(answer.url()).pathname) &&
      answer.request().method() === 'DELETE',
  );

let release;
test.beforeAll(async () => {
  release = await hold();
  const admin = byAlias('U_ADMIN');
  for (const [i, id] of [CANCELLED, BYSTANDER].entries()) {
    await db.query(
      `INSERT INTO subjects (subject_id, subject_name_th, subject_name_en, credits, department_id, created_by)
       VALUES ($1, $2, $3, 3, '05', $4)`,
      [id, `วิชาของแถว #250 ${i}`, `Subject for #250 ${i}`, admin],
    );
    await db.query(
      `INSERT INTO program_subjects (program_id, subject_id, subject_type, created_by)
       VALUES ($1, $2, 'required', $3)`,
      [PROGRAM, id, admin],
    );
    await db.query(
      `INSERT INTO semester_courses (program_id, subject_id, academic_year, semester)
       VALUES ($1, $2, $3, $4)`,
      [PROGRAM, id, YEAR, SEMESTER],
    );
  }
});
test.afterAll(async () => {
  await release();
  await db.end();
});

test('while the read that carries the sentence is out, the screen draws no control that would replace the list', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.committee0501);
  await offerings.openOfferings(page);
  await offerings.filterToTerm(page, YEAR, SEMESTER);
  await expect(
    offerings.offeringRow(page, CANCELLED),
    'the offering this row cancels',
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: INTO_THE_PANEL }),
    'and both rows carry the control #250 is about, which is what makes the count below a reading',
  ).toHaveCount(2);

  // The reload the cancellation sends is held at the route, which is what a
  // slow server does: the row is not arranging anything the product does not.
  const held = await gate(page, OFFERINGS_LIST, isGet);
  await offerings
    .offeringRow(page, CANCELLED)
    .getByRole('button', { name: CANCEL })
    .click();
  await expect(offerings.confirmDialog(page), 'the removal asks first').toBeVisible();
  const [written] = await Promise.all([
    theCancellation(page),
    page.getByRole('button', { name: 'ยกเลิกการเปิดรายวิชา' }).click(),
  ]);
  expect(written.status(), 'a cancellation the server allowed').toBe(204);
  await held.sent;

  // The net. The sentence is in `waiting.current` from here until the held read
  // lands, and this is the whole of that window: nothing the person can press
  // sets `viewing`, so the situation #250 describes cannot be built.
  await expect(
    page.getByText('กำลังโหลด'),
    'the table says it is reading, in place of its rows',
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: INTO_THE_PANEL }),
    'and draws no way into the sections panel while the sentence is waiting (#250)',
  ).toHaveCount(0);
  // A count of `ยกเลิกการเปิด` stood here and came out on 30 ตุลาคม 2569: it sat
  // below the claim the only mutant kills, so nothing read it (#88), and
  // `getByRole` matches a name as a substring, so the dialog's own
  // `ยกเลิกการเปิดรายวิชา` was inside it — it was green partly because the
  // dialog had closed, which is not what the line said (#118). The control
  // this net is about is the one that sets `viewing`, above.

  // `answered` says the answer reached the page and nothing about what it was,
  // so the status is read off the response itself — waited for before the gate
  // is opened, because a `waitForResponse` set up afterwards can be too late.
  const landed = offerings.waitForList(page);
  held.open();
  await held.answered;
  const drawn = await landed;
  expect(drawn.status(), 'the read the cancellation asked for').toBe(200);

  await expect(
    page.getByRole('status'),
    'the sentence, over the list the read drew — the green that makes the count above a reading (#171)',
  ).toHaveText(CANCELLED_SAID);
  await expect(
    offerings.offeringRow(page, CANCELLED),
    'without the offering it cancelled',
  ).toHaveCount(0);
  await expect(
    offerings.offeringRow(page, BYSTANDER),
    'and with the one it never touched',
  ).toHaveCount(1);
});
