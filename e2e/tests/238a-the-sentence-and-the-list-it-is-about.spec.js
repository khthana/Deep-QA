'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { PROGRAM } = require('../../db/seed');
const { OTHER_PROGRAM } = require('../support/plo-mapping-screen');
const { signIn } = require('../support/auth');
const { gate, isGet } = require('../support/gate');
const { hold } = require('../support/hold');
const { watchForTheSentence, neverSaid } = require('../support/frame-sampler');
const users = require('../support/users-screen');
const plos = require('../support/plos-screen');

/**
 * #238 — ประโยคว่าสำเร็จเป็นของการอ่านที่วาดสิ่งที่มันพูดถึง
 *
 * คำตอบของเจ้าของงานเมื่อ 28 ตุลาคม 2569 ต่อคำถามข้อที่สองของ #210 ซึ่ง #221 วัดไว้
 * แต่ตอบไม่ได้: *ประโยคผูกกับการอ่านที่มันพูดถึง* ฉะนั้นถ้าหน้าหรือตัวกรองขยับไปขณะที่
 * คำสั่งเขียนยังค้างอยู่ การอ่านที่ลงจอเป็นการอ่านของรายการอื่น และไม่มีอะไรพูดประโยคนั้น
 *
 * ก่อนวันนั้น `Users.js` พูดประโยคครบทั้งหกลำดับที่ #221 วัด และ `Plos.js` พูดทุกลำดับ
 * ที่ #241 วัด รวมลำดับที่ **ไม่ต้องมีหน้าต่างเลย** — สองจอนั้นคือสิ่งที่ตั๋วนี้แก้ ส่วน
 * `Students.js` ทำตามกฎนี้อยู่แล้วตั้งแต่ #205 ซึ่งเป็นเหตุผลที่คำถามข้อที่สองของตั๋ว
 * ตอบด้วยการไม่แก้อะไรที่นั้น (`205a` แถว *a read of another filter clears the
 * sentence without saying it* ถือข้อนั้นไว้)
 *
 * ## สองแถวบวกกับสองแถวลบ และเหตุผลที่ต้องมีทั้งคู่
 *
 * แถวลบอ่านด้วยตัวอ่านทีละเฟรม (#164) เพราะประโยคที่ถูกพูดแล้วถูกแทนจะหายไปก่อนจุด
 * settle ทุกจุด และแถวที่อ่านครั้งเดียวจะผ่านทั้งบนจอที่เสียและจอที่ถูก · แถวบวกคือการอ่าน
 * ที่เป็นสีเขียวซึ่งทำให้ความเงียบของแถวลบมีความหมาย (#171 — แดงไม่ใช่การวัดจนกว่าจะเห็น
 * การอ่านเดียวกันเป็นเขียว) และมันคือสิ่งที่พิสูจน์ว่ากฎนี้ไม่ได้เอาประโยคออกไปเสียทั้งหมด
 *
 * ## วัดกับโค้ดที่ยังไม่ได้แก้ก่อนเขียนมัตแตนต์ (#203)
 *
 * 28 ตุลาคม 2569 ด้วย `Users.js` กับ `Plos.js` ของ `9566591`: สองแถวลบ **แดงทั้งคู่**
 * ที่บรรทัด `neverSaid` ของตัวเอง (`ประโยค...` 1 จาก 1) และสองแถวบวกเขียว ฉะนั้นแถวลบ
 * วัดสิ่งที่มันถูกเขียนขึ้นมาวัดจริง
 *
 * ## มัตแตนต์
 *
 * `mutation/238-the-sentence-and-the-list-it-is-about.py` ถือข้อของกุญแจ — `load` พูด
 * ประโยคที่ค้างอยู่กับการอ่านตัวไหนก็ได้ที่วาด — ทีละจอ · ส่วนความผิดที่ **ผู้เรียก**
 * พูดเองหลังการอ่าน เป็นรูปของจอนี้ก่อนตั๋วนี้ และถูกถือไว้แล้วโดย
 * `239:savesaysitovertheoldpage` กับ `239:switchsaysitovertheoldpage` ที่ `Users.js`
 * และ `203:plossaveanyway` กับ `203:plosremovalanyway` ที่ `Plos.js` — มัตแตนต์ตัวหนึ่ง
 * ฆ่าหลายแถวคือหลายข้ออ้างเรื่องการไปถึง ไม่ใช่ข้อเดียวนับซ้ำ (#191)
 *
 * ## สิ่งที่แฟ้มนี้ไม่ได้พูด (#123)
 *
 * - **ไม่ได้พูดว่าถ้อยคำที่คนอ่านถูกต้องไหม** นั่นคือ `docs/06` §Out of Scope และเป็นของ
 *   เจ้าของงาน ซึ่งเป็นเหตุผลทั้งหมดที่ #238 เป็นตั๋วชนิดคำถาม
 * - **ไม่ได้พูดแทนจุดที่เหลือ** ห้าจุดที่ `frontend/scripts/sentences-after-a-move.js`
 *   นับว่ามีมาร์กเกอร์ยังพูดประโยคหลังการอ่านโดยเจตนา และเหตุผลพร้อมวันกำกับอยู่ที่
 *   แต่ละจุด — ของ `Offerings.js` คือการตัดสินใจของเจ้าของงานเมื่อ 1 ตุลาคม 2026 ว่า
 *   ประโยคเป็นของคำสั่งที่คนสั่ง ไม่ใช่ของแผงที่คนกำลังดู (#143) ซึ่งเป็นคำถามอื่น
 *   ไม่ใช่คำถามนี้ (#196 — กฎที่ถูกใช้กับจอหนึ่งแล้วคือการตัดสินใจ ไม่ใช่บรรทัดฐาน
 *   ที่ต้องมาชั่งใหม่)
 * - **ไม่ได้พูดเรื่องการส่งหน้าต่อ** ซึ่งเป็นของ `239a` ทั้งสามแถว · ที่นี่ไม่มีการส่งต่อ
 *   เลย แถวลบของ `Users.js` ระงับบัญชีที่ไม่ใช่แถวสุดท้ายของหน้าสุดท้าย
 *
 * `mode: 'serial'` กับ `hold()` หนึ่งตัว: แถวของ `Users.js` ระงับบัญชีของ seed จริง
 * และแถวของ `Plos.js` เพิ่มผลการเรียนรู้จริง schema ถูกวางกลับเมื่อแฟ้มจบ (#134)
 */
test.describe.configure({ mode: 'serial' });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/** What each screen says, and what the samplers look for. */
const SUSPENDED = 'ระงับการใช้งานบัญชีเรียบร้อยแล้ว';
const SAVED = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/** The two seeded teachers, one per row: a suspension is a write the seed keeps. */
const TEACHERS = {
  said: { id: 'teach01', email: 'teacher.one@kmitl.ac.th' },
  silent: { id: 'teach02', email: 'teacher.two@kmitl.ac.th' },
};

/**
 * How long each negative row watches after the list it moved to is drawn.
 *
 * A wait that cannot decide anything (#52): the claim is *nothing ever said it*,
 * so a longer watch can only make the row stricter, and `neverSaid` asserts the
 * frame count as well, which is what says the sampler ran at all. One frame was
 * all the first draft got - 16 milliseconds, with no sentence in it, which is
 * the answer the row wants and no evidence whatever (#164).
 */
const WATCHING_MS = 1_500;

/** What the search box holds on arrival: the two teachers and nobody else. */
const TERM = 'teacher.';

/** The outcomes the two `Plos.js` rows add, one each (#129). */
const CODES = { said: 'PLO-Z238A', silent: 'PLO-Z238B' };

const USERS_LIST = /^\/api\/users$/;
const PLOS_LIST = /^\/api\/plos$/;

const statusWrite = (page, userId) =>
  page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === users.statusPath(userId) &&
      answer.request().method() === 'PUT',
  );

const outcomeWrite = page =>
  page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === plos.API && answer.request().method() === 'POST',
  );

test.describe('ข้อมูลผู้ใช้งาน (Users.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.systemAdmin);
    await users.openUsers(page);
    // The two teachers are on the second page of the whole list, so the search
    // box is used to put them on the screen - which also gives the row below a
    // filter that is already somewhere, so the move it makes is a narrowing of
    // a term and not the first term typed.
    await users.search(page, TERM);
    await expect(
      users.listTable(page).getByRole('row'),
      'the header and the two teachers',
    ).toHaveCount(3);
  });

  test('a suspension nobody moved away from says so over the list it is about', async ({
    page,
  }) => {
    const { email, id } = TEACHERS.said;
    await expect(
      users.statusButton(page, email, 'ระงับ'),
      'an active account to suspend, which is what the row needs on arrival (#129)',
    ).toBeVisible();

    const answer = await users.setStatusByHand(page, email, id, 'ระงับ');
    expect(answer.status(), 'the suspension landed').toBe(200);

    await expect(page.getByRole('status'), 'the sentence, over the list it is about').toHaveText(
      SUSPENDED,
    );
  });

  test('a suspension says nothing over the list a moved filter has drawn', async ({ page }) => {
    const { email, id } = TEACHERS.silent;
    await expect(
      users.statusButton(page, email, 'ระงับ'),
      'an active account to suspend',
    ).toBeVisible();

    // The reload the handler sends is held at the route, and nothing else is:
    // `gate` holds the first request that matches and lets the rest through, so
    // the read the search box starts below is answered while this one waits.
    const held = await gate(page, USERS_LIST, isGet);
    await users.startStatusChange(page, email, 'ระงับ');
    const [written] = await Promise.all([
      statusWrite(page, id),
      users.confirmStatusChange(page),
    ]);
    expect(written.status(), 'the suspension landed').toBe(200);
    await held.sent;

    // Sampling starts before anything could be said, which is the whole point of
    // reading per frame: on the unfixed code the sentence was said the moment the
    // held answer landed and taken away by the search box's own read.
    const watch = await watchForTheSentence(page, SUSPENDED);

    // The search box is not `disabled={busy}` - no filter on any screen is, which
    // is what #238 measured - so this is a way in a person has, not only the tool.
    const term = 'teacher.two';
    const moved = page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === users.API &&
        new URL(answer.url()).searchParams.get('q') === term,
    );
    await page.getByPlaceholder('ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้').fill(term);

    held.open();
    await held.answered;
    const drawn = await moved;
    expect(drawn.status()).toBe(200);
    await expect(
      users.userRow(page, email),
      'the list the filter asked for, on the screen',
    ).toHaveCount(1);

    await page.waitForTimeout(WATCHING_MS);
    await neverSaid(watch, 'ไม่มีอะไรพูดประโยคของการระงับทับรายการที่ตัวกรองวาด');
  });
});

test.describe('ผลการเรียนรู้ระดับหลักสูตร (Plos.js)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, ACCOUNTS.departmentAdmin05);
    await plos.openPlos(page);
    await plos.filterTo(page, PROGRAM);
  });

  test('a save nobody moved away from says so over the list it is about', async ({ page }) => {
    await plos.addOutcome(page, {
      code: CODES.said,
      title: 'ผลการเรียนรู้ของแถวบวก 238',
      type: 'knowledge',
      order: 8,
    });
    expect(await plos.listedCodes(page), 'the outcome the save added').toContain(CODES.said);
    await expect(page.getByRole('status'), 'the sentence, over the list it is about').toHaveText(
      SAVED,
    );
  });

  test('a save says nothing over the outcomes of a หลักสูตร it was not about', async ({ page }) => {
    const here = await plos.listedCodes(page);

    const held = await gate(page, PLOS_LIST, isGet);
    await plos.openAddForm(page);
    await page.getByPlaceholder(/เช่น PLO-1/).fill(CODES.silent);
    await page.getByPlaceholder('สิ่งที่ผู้สำเร็จการศึกษาทำได้').fill('ผลการเรียนรู้ของแถวลบ 238');
    await plos.typePicker(page).selectOption('knowledge');
    await plos.selectParent(page, null);
    await page.locator('input[type="number"]').fill('9');
    const [written] = await Promise.all([outcomeWrite(page), plos.saveButton(page).click()]);
    expect(written.status(), 'the outcome was created').toBe(201);
    await held.sent;

    const watch = await watchForTheSentence(page, SAVED);

    // `save` clears `editing` before it reloads, so the table and the curriculum
    // filter are drawn behind the held read - which is why #241 could reach this
    // on this screen with nothing held at all: there is no dialog and no form in
    // the way. The hold is here to make the sequence a row rather than a race
    // (#52 - anything written for timing must not be able to decide anything).
    const moved = plos.waitForList(page);
    await plos.programFilter(page).selectOption(OTHER_PROGRAM);

    held.open();
    await held.answered;
    const drawn = await moved;
    expect(drawn.status()).toBe(200);
    await plos.untilListed(page);
    const there = await plos.listedCodes(page);
    expect(there, 'two curricula, two different lists - the premise').not.toEqual(here);
    expect(there, 'and the outcome the save added is not among them').not.toContain(CODES.silent);

    await page.waitForTimeout(WATCHING_MS);
    await neverSaid(watch, 'ไม่มีอะไรพูดประโยคของการบันทึกทับผลการเรียนรู้ของหลักสูตรอื่น');
  });
});
