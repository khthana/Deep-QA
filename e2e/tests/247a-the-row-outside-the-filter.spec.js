'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { PROGRAM, PROGRAM_INTL } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { OUTSIDE_THE_FILTER } = require('../support/outside-the-filter');
const plos = require('../support/plos-screen');

/**
 * #247 — ประโยคของการบันทึกแถวที่ตกนอกตัวกรองของตารางเอง
 *
 * คำตอบข้อ จ ของเจ้าของงานเมื่อ 29 ตุลาคม 2569: คนที่บันทึกแถวซึ่งตกนอกตัวกรองที่ตาราง
 * กำลังกรองอยู่ ได้อ่าน **ประโยคร่วมหนึ่งประโยค** ต่อท้ายประโยคของจอเอง — *แถวนี้อยู่นอก
 * รายการที่กรองอยู่* — ไม่ใช่ชื่อของที่ที่มันไปอยู่ (ข้อ ข) และตารางไม่ถูกย้าย (ข้อ ค)
 *
 * ## คำถามเกิดจากการวัด และการวัดแก้ประชากรของตั๋วด้วย
 *
 * `PloForm` ปิดช่อง **หลักสูตร** ด้วย `sending || editing` ฉะนั้นตอน *เพิ่ม* ช่องนั้นเปิด
 * และ `draft.program_id` เป็นหลักสูตรอะไรก็ได้ที่สิทธิ์ของคนนั้นถึง — รูปที่ `parentPool`
 * ตั้งใจรองรับ ส่วน `load` อ่าน `{ program_id: program }` ของ **ตาราง** อย่างเดียว และ
 * `save` ฝากประโยคด้วยกุญแจของการอ่านนั้น ฉะนั้นประโยคขึ้นเหนือรายการที่ไม่มีแถวที่
 * บันทึกไป และไม่มีอะไรบนจอบอกว่ามันไปอยู่ที่ไหน
 *
 * ตั๋วเขียนว่าประชากรคือ **จอเดียว** การสำรวจด้วยกลไก — คีย์ของ `load` ตัดกับช่องในฟอร์ม
 * ที่เขียนคีย์นั้นและไม่ `disabled` — ตอบว่า **เจ็ดจอ** (#223, #141) และสปีชีส์กว้างกว่า
 * คำว่า *ขอบเขต* ที่ตั๋วใช้: มันคือ **การเขียนที่แถวของมันตกนอกตัวกรองของตารางเอง** ซึ่ง
 * ที่ `Users.js` ตัวกรองที่แถวตกนอกได้คือ *คำค้น* ไม่ใช่สิ่งที่มีชื่อ — เหตุผลที่ข้อ ข
 * เขียนให้จอนั้นไม่ได้ และเหตุผลที่คำตอบเป็นประโยคร่วม (#128)
 *
 * กฎจึงลงทั้งเจ็ดจอในตั๋วเดียว เพราะข้อบังคับผูกทุกทางเดิน ไม่ใช่ผูกเส้นทางเดียว (#166)
 * และสิ่งที่ถืออีกหกจอไว้คือสำมะโน `frontend/scripts/rows-outside-the-filter.js`
 * ไม่ใช่แถวที่นี่ (#68)
 *
 * ## สองแถว และเหตุผลที่ต้องมีทั้งคู่
 *
 * แถวบวกคือการบันทึกข้ามหลักสูตร ซึ่งไม่มีแถวไหนในชุดทดสอบกดลำดับนี้มาก่อนวันนี้เลย
 * แถวลบคือการบันทึก **ใน** หลักสูตรที่ตารางกรองอยู่ ซึ่งต้องไม่ได้ประโยคร่วมนั้น —
 * เกณฑ์ที่ตอบว่า *ไม่* ต้องมีแถวเท่ากับเกณฑ์ที่ตอบว่า *ใช่* (#48) และเป็นแถวที่ทำให้
 * มัตแตนต์ *พูดทุกครั้ง* ฆ่าได้ ไม่ใช่รอดไปเพราะไม่มีใครอ่านอีกด้าน
 *
 * ## วัดกับโค้ดที่ยังไม่ได้แก้ก่อนเขียนมัตแตนต์ (#203)
 *
 * แถวบวกถูกรันกับโค้ดก่อนการแก้ และล้มที่ `toHaveText` ด้วยประโยคของจอเองล้วน ๆ
 * ตารางของมัตแตนต์อยู่ที่ `docs/acceptance/19-programme-learning-outcomes.md` §#247
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าถ้อยคำถูกต้องไหม** — ถ้อยคำเป็นของเจ้าของงาน (`docs/06` §Out of Scope)
 *   ประโยคที่ลงคือประโยคที่เจ้าของงานอ่านตอนเลือกข้อ จ และมันอยู่ในค่าคงที่หนึ่งค่า
 *   ที่ทั้งเจ็ดจอกับแฟ้มนี้อ่านร่วมกัน (#104 — การแยกข้อความร่วมไม่กินราคาของการพิสูจน์
 *   ถ้ามัตแตนต์ย้ายไปอยู่ที่จุดเรียก)
 * - **ไม่ได้พูดแทนอีกหกจอ** นั่นคืองานของสำมะโน (#68)
 * - **ไม่ได้พูดว่าแถวที่อยู่ในตัวกรองแต่อยู่หน้าอื่นจะว่าอะไร** จอนี้ไม่มีตัวแบ่งหน้า
 *   (#101) ส่วนจอที่มีนั้น *อยู่นอกตัวกรอง* กับ *อยู่หน้าอื่นของตัวกรองเดียวกัน* เป็นสอง
 *   เรื่อง และข้อนี้ถือเฉพาะเรื่องแรก
 *
 * `mode: 'serial'`: ทั้งสองแถวเพิ่มผลการเรียนรู้จริงแล้วลบของตัวเองผ่านจอ (#134)
 */
test.describe.configure({ mode: 'serial' });

/** The screen's own sentence, which both rows read and only one row adds to. */
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/** The outcomes the two rows add and then remove, one each (#129). */
const CODES = { outside: 'PLO-Z247A', inside: 'PLO-Z247B' };

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await plos.openPlos(page);
  await plos.filterTo(page, PROGRAM);
});

test('a save into another curriculum says so, over the list that does not hold it', async ({
  page,
}) => {
  await plos.addOutcome(page, {
    program: PROGRAM_INTL,
    code: CODES.outside,
    title: 'ผลการเรียนรู้ของแถวบวก 247',
    type: 'knowledge',
    order: 8,
  });

  await expect(
    page.getByRole('status'),
    'the screen’s own sentence, and the shared one saying where the row is not',
  ).toHaveText(`${SAVED} ${OUTSIDE_THE_FILTER}`);
  expect(
    await plos.listedCodes(page),
    'the list the sentence stands over does not hold the row that was saved',
  ).not.toContain(CODES.outside);

  // Through the screen, scoped to what this file wrote (#134). The table has to
  // be moved to the curriculum the row went into to find it, which is the
  // ticket's own sequence read backwards.
  await plos.filterTo(page, PROGRAM_INTL);
  expect(await plos.listedCodes(page), 'and the curriculum it went into does').toContain(
    CODES.outside,
  );
  await plos.startRemoval(page, CODES.outside);
  await Promise.all([plos.waitForList(page), plos.confirmRemoval(page)]);
  await plos.untilListed(page);
});

test('a save into the curriculum the table is on says only what the screen said before', async ({
  page,
}) => {
  await plos.addOutcome(page, {
    program: PROGRAM,
    code: CODES.inside,
    title: 'ผลการเรียนรู้ของแถวลบ 247',
    type: 'knowledge',
    order: 9,
  });

  await expect(
    page.getByRole('status'),
    'nothing added to a sentence whose own list holds the row',
  ).toHaveText(SAVED);
  expect(await plos.listedCodes(page), 'which the list does').toContain(CODES.inside);

  await plos.startRemoval(page, CODES.inside);
  await Promise.all([plos.waitForList(page), plos.confirmRemoval(page)]);
  await plos.untilListed(page);
});
