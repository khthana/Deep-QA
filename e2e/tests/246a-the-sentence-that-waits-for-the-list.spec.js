'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { PROGRAM } = require('../../db/seed');
const { signIn } = require('../support/auth');
const { gate, isGet } = require('../support/gate');
const { hold } = require('../support/hold');
const { watchForTheSentence, neverSaid } = require('../support/frame-sampler');
const plos = require('../support/plos-screen');

/**
 * #246 — ประโยคที่รอรายการที่มันพูดถึง
 *
 * คำตอบของเจ้าของงานเมื่อ 29 ตุลาคม 2569 ต่อสิ่งที่กฎข้อ ก ของ #238 ทิ้งไว้ที่จอนี้:
 * ประโยค *ลบแล้ว* ที่ค้างอยู่ **ไม่** ถูกพูดทับฟอร์มที่เพิ่งเปิด แต่รอจนฟอร์มปิดแล้วจึงพูด
 * พร้อมรายการที่มันพูดถึงอยู่ใต้มัน
 *
 * ## คำถามเกิดจากการวัด ไม่ใช่จากความชอบ
 *
 * กุญแจของการอ่านที่นี่คือ **หลักสูตร** อย่างเดียว (#185) ฉะนั้นการเปิดฟอร์มไม่เปลี่ยนว่า
 * การอ่านที่ลงจอเป็นการอ่านของอะไร — ตัวอักษรของกฎข้อ ก สั่งให้พูด และแขนที่สี่ของโพรบ
 * `e2e/probes/241-the-removal-sentence-and-the-filter.spec.js` วัดได้ว่ามันพูด (216 เฟรม
 * เมื่อ 28 ตุลาคม 2569) สิ่งที่ทำให้มันเป็นคำถามของเจ้าของงานแทนที่จะเป็นข้อถดถอยคือ
 * **ฟอร์มถูกวาดแทนที่ตาราง** ไม่ได้วาดทับ: `{editing ? <PloForm/> : <ตาราง/>}` ทั้งเก้าจอ
 * ของตระกูลนี้ ฉะนั้นการอ่านที่ลงจอ *ไม่ได้วาดสิ่งที่ประโยคพูดถึงเลย* — ไม่มีรายการอยู่
 * ข้างหลังฟอร์มให้ประโยคเป็นจริงกับมัน แถวที่สองอ่านข้อนี้เป็นเงื่อนไขนำของตัวเอง (#164)
 *
 * ## สองแถว และเหตุผลที่ต้องมีทั้งคู่
 *
 * แถวบวกคือการอ่านที่เป็นเขียวซึ่งทำให้ความเงียบของแถวที่สองมีความหมาย (#171 — แดงไม่ใช่
 * การวัดจนกว่าจะเห็นการอ่านเดียวกันเป็นเขียว) และเป็นสิ่งที่พิสูจน์ว่าคำตอบนี้ไม่ได้เอา
 * ประโยคออกไปเสียทั้งหมด ซึ่งเป็นข้อ ข ที่เจ้าของงานไม่ได้เลือก (#48 — เกณฑ์ที่ตอบว่า
 * *ไม่* ต้องมีแถวเท่ากับเกณฑ์ที่ตอบว่า *ใช่*)
 *
 * แถวที่สองถือสองข้ออ้างเรียงตามเวลา: เงียบขณะฟอร์มเปิด แล้วพูดเมื่อฟอร์มปิด · มัตแตนต์
 * ตัวไหนฆ่าข้อไหนแยกกันได้ เพราะข้อแรกอ่านทีละเฟรมและข้อที่สองอ่านที่จุด settle หลังจากนั้น
 * (#88 — แถวรายงานข้ออ้างแรกที่ตาย)
 *
 * ## วัดกับโค้ดที่ยังไม่ได้แก้ก่อนเขียนมัตแตนต์ (#203)
 *
 * ทางที่ทำได้ที่นี่คือมัตแตนต์ `246:saysitovertheform` ซึ่งคือพฤติกรรมก่อนตั๋วนี้ทั้งดุ้น
 * (ข้อ ก ของคำถาม ที่เจ้าของงานไม่ได้เลือก — #48) ตารางของมันอยู่ที่
 * `docs/acceptance/19-programme-learning-outcomes.md` §#246
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าถ้อยคำที่คนอ่านถูกต้องไหม** หรือควรวางไว้ตรงไหนบนจอ — นั่นคือ
 *   `docs/06` §Out of Scope และเป็นของเจ้าของงาน ซึ่งเป็นเหตุที่ #246 เป็นตั๋วชนิดคำถาม
 * - **ไม่ได้พูดแทนอีกแปดจอ** ของตระกูลนี้ กฎเดียวกันลงทั้งเก้าจอในตั๋วเดียวกัน แต่สิ่งที่
 *   ถือไว้ว่าแต่ละจอทำตามคือสำมะโน `frontend/scripts/held-sentences.js` ไม่ใช่แถวที่นี่
 *   (#68 — จอที่พิสูจน์กฎถูกเลือกด้วยสำมะโน ไม่ใช่ด้วยหัวเรื่อง)
 * - **ไม่ได้พูดว่าประโยคที่ค้างอยู่ของหลักสูตรที่จอไม่ได้อยู่ที่นั้นแล้วจะเงียบ** ข้อนั้นเป็น
 *   clause ที่ **ไปถึงไม่ได้ด้วยโครงสร้าง** ที่จอนี้วันนี้ (#102): ตัวกรองหลักสูตรถูกวาด
 *   ในกิ่งที่ฟอร์มแทนที่ ฉะนั้นขณะฟอร์มเปิด `program` ขยับไม่ได้เลย เหตุผลพร้อมวันกำกับ
 *   และเงื่อนไขที่จะทำให้มันไปถึงได้อยู่ข้าง effect ใน `frontend/src/pages/Plos.js`
 *
 * `mode: 'serial'` กับ `hold()` หนึ่งตัว: ทั้งสองแถวเพิ่มผลการเรียนรู้จริงแล้วลบของตัวเอง
 * schema ถูกวางกลับเมื่อแฟ้มจบ (#134)
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** The sentence a removal hands over, which both rows watch for. */
const REMOVED = 'ลบผลการเรียนรู้เรียบร้อยแล้ว';

/** The outcomes the two rows add and then remove, one each (#129). */
const CODES = { said: 'PLO-Z246A', silent: 'PLO-Z246B' };

const PLOS_LIST = /^\/api\/plos$/;
const ONE_OUTCOME = /^\/api\/plos\/\d+$/;

/**
 * How long the second row watches after the held read has landed.
 *
 * A wait that cannot decide anything (#52): the claim is *nothing said it while
 * the form was up*, so a longer watch can only make the row stricter, and
 * `neverSaid` asserts the frame count as well, which is what says the sampler
 * ran at all (#164).
 */
const WATCHING_MS = 1_500;

/**
 * The removal's own answer, by the path that identifies it (#218).
 *
 * The status is read as well as awaited: a removal that the server turned into
 * a deactivation answers 200 and makes the screen say the *other* sentence, and
 * the sampler would then count zero and the row would read as *nothing was
 * said* (#164's blind sampler). Both rows remove an outcome they added
 * themselves a moment earlier, so nothing points at it and 204 is what it gets.
 */
const theRemoval = (page) =>
  page.waitForResponse(
    (answer) =>
      ONE_OUTCOME.test(new URL(answer.url()).pathname) && answer.request().method() === 'DELETE',
  );

/** Adds one leaf outcome of this curriculum, drawn and ready to be removed. */
async function addLeaf(page, code, title, order) {
  await plos.addOutcome(page, { code, title, type: 'knowledge', order });
  expect(await plos.listedCodes(page), 'the outcome the row is about is on the screen').toContain(
    code,
  );
}

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await plos.openPlos(page);
  await plos.filterTo(page, PROGRAM);
});

test('a removal nobody opens a form over says so at once, over the list it is about', async ({
  page,
}) => {
  await addLeaf(page, CODES.said, 'ผลการเรียนรู้ของแถวบวก 246', 6);

  await plos.startRemoval(page, CODES.said);
  const [written] = await Promise.all([theRemoval(page), plos.confirmRemoval(page)]);
  expect(written.status(), 'a removal and not a deactivation').toBe(204);

  await expect(
    page.getByRole('status'),
    'the sentence, over the list the reload drew',
  ).toHaveText(REMOVED);
  await plos.untilListed(page);
  expect(await plos.listedCodes(page), 'and the outcome it is about is gone').not.toContain(
    CODES.said,
  );
});

test('a removal says nothing over a form that replaced the list, and says it when the form closes', async ({
  page,
}) => {
  await addLeaf(page, CODES.silent, 'ผลการเรียนรู้ของแถวลบ 246', 7);

  // The reload the handler sends is held at the route, and nothing else is, so
  // the press below happens inside a window the row owns rather than one it is
  // racing (#52). The dialog is already gone by then: `confirmRemoval` runs
  // `setRemoving(null)` before it waits for the reload, which is what leaves
  // เพิ่มผลการเรียนรู้ an ordinary click with no cover over it (#199, #241).
  const held = await gate(page, PLOS_LIST, isGet);
  await plos.startRemoval(page, CODES.silent);
  const [written] = await Promise.all([theRemoval(page), plos.confirmRemoval(page)]);
  expect(written.status(), 'a removal and not a deactivation').toBe(204);
  await held.sent;

  // Sampling starts before anything could be said, which is the whole point of
  // reading per frame: before 29 ตุลาคม 2569 the sentence was said the moment the
  // held answer landed, and it stood over the form until something else took it
  // away (#241's fourth arm, 216 frames of it).
  const watch = await watchForTheSentence(page, REMOVED);

  await plos.openAddForm(page);
  await expect(
    page.getByRole('heading', { name: 'เพิ่มผลการเรียนรู้ของหลักสูตร' }),
    'the form the person asked for',
  ).toBeVisible();
  await expect(
    page.locator('table'),
    'drawn in place of the list, which is the whole reason this was a question',
  ).toHaveCount(0);

  // `answered` says the answer reached the page and nothing about what it was,
  // so the status is read off the response itself - waited for before the gate
  // is opened, because a `waitForResponse` set up afterwards can be too late.
  const landed = plos.waitForList(page);
  held.open();
  await held.answered;
  const drawn = await landed;
  expect(drawn.status(), 'the read the removal asked for landed while the form was up').toBe(200);

  await page.waitForTimeout(WATCHING_MS);
  await neverSaid(watch, 'ไม่มีอะไรพูดประโยคของการลบทับฟอร์มที่แทนที่รายการ');

  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(
    page.getByRole('status'),
    'the held sentence, said when the list came back',
  ).toHaveText(REMOVED);
  await plos.untilListed(page);
  expect(await plos.listedCodes(page), 'over the list it is about, without the outcome').not.toContain(
    CODES.silent,
  );
});
