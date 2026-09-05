'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { switchTo } = require('../support/shell');
const {
  LABELS,
  openPlan,
  mySectionIds,
  myClos,
  myEarlierSection,
  formSection,
  referencePanel,
  chooseClo,
  writeSection,
  removeSection,
  planOf,
  seedEntry,
  clearEntry,
} = require('../support/improvement-screen');

/**
 * docs/acceptance/41-continuous-improvement-plan.md — the half a browser can
 * prove.
 *
 * The backend suite proves the grain, the create-on-demand, the year that gets
 * referenced and every refusal at the routes. What is here is what is only
 * true in front of the screen: that what one ผู้สอน writes the other reads,
 * that writing the same section twice replaces what is there rather than
 * stacking, that the confirmation is asked before anything is destroyed, that
 * the four sections follow the ผลการเรียนรู้ that is chosen, that last year's
 * words appear beside this year's for the same outcome, and that the panel
 * carrying them is **not drawn at all** where there is no earlier year.
 *
 * ## The row that exists because of #40
 *
 * The last of those is row 8, and it is here because #40's hand-walk found a
 * rubric disclosure that opened onto an empty box: every automated row asked
 * whether the control worked, and it worked perfectly, on nothing. A panel
 * headed *ปีการศึกษา …* over no entries would be the same defect one screen
 * over, and the only way a test can speak about it is to assert the absence.
 *
 * ## What is deliberately not here
 *
 * The four headings' wording, the hint under each, the grain sentence and the
 * dialog's sentence are appearance and stay hand-walked. So is the placing of
 * the reference panel beside the sections rather than under them. The rows
 * below assert what lands in the record and what comes back out of it.
 *
 * ## State
 *
 * The seed contains no cycle at all — db/seed.js says so deliberately, and #41
 * is the ticket it was waiting for — so every row builds what it needs and
 * takes it out again. `wipe` is called by the rows that assert an absence,
 * because an absence is only this row's claim if nothing earlier is still
 * lying around.
 */

/** teacher.one@ teaching ตอนเรียน 1 of the current term. */
async function asTeacherOne(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  return section;
}

/** multi.role@ with the teaching hat on, and their ตอนเรียน of the same Offering. */
async function asMultiRole(page) {
  await signIn(page, ACCOUNTS.multiRole);
  expect((await switchTo(page, 'อาจารย์ผู้สอน')).status()).toBe(200);
  const [section] = await mySectionIds(page);
  return section;
}

/** Every entry of a ตอนเรียน's plan, gone — the state the seed leaves. */
async function wipe(page, sectionId) {
  const { entries } = await planOf(page, sectionId);
  for (const entry of entries) await clearEntry(page, sectionId, entry.entry_id);
}

const cloNumbered = (clos, code) => clos.find(clo => clo.clo_number === code);

const SUMMARY = 'นักศึกษาบรรลุผลการเรียนรู้ข้อนี้ร้อยละ 82 ซึ่งสูงกว่าเกณฑ์ที่ตั้งไว้';
const SUMMARY_AGAIN = 'ทบทวนแล้วพบว่าเป็นร้อยละ 84 เมื่อรวมนักศึกษาที่สอบซ่อม';

test('row 1: the four sections are drawn for the ผลการเรียนรู้ that is chosen', async ({
  page,
}) => {
  // Everything the screen offers, before anything is written in it. The four
  // are `<section>`s named by their heading, which is the handle every later
  // row uses; that they are four and not three is the shape of the record.
  const section = await asTeacherOne(page);
  const answer = await openPlan(page, section);
  expect(answer.status()).toBe(200);

  for (const type of Object.keys(LABELS)) {
    await expect(formSection(page, type)).toBeVisible();
  }
  await expect(
    page.getByLabel('ผลการเรียนรู้ที่กำลังเขียนถึง', { exact: true }),
  ).toBeVisible();
});

test('row 2: a section is written, and it is the record that answers', async ({ page }) => {
  // The first criterion's write half. The screen is the only thing asserted
  // against here *and* the record behind it, because a screen that kept what
  // was typed without sending it would look identical.
  const section = await asTeacherOne(page);
  await wipe(page, section);
  await openPlan(page, section);
  const clos = await myClos(page, section);
  // The last outcome and not the first, so that a screen posting whichever
  // outcome it happens to have first is caught here rather than agreeing with
  // itself. CLO-1 would have been the same id either way.
  await chooseClo(page, 'CLO-9');

  expect((await writeSection(page, 'SUMMARY', SUMMARY)).status()).toBe(200);
  await expect(formSection(page, 'SUMMARY')).toContainText(SUMMARY);

  const { entries } = await planOf(page, section);
  expect(entries).toHaveLength(1);
  expect(entries[0].detail_type).toBe('SUMMARY');
  expect(entries[0].clo_id).toBe(cloNumbered(clos, 'CLO-9').clo_id);

  await wipe(page, section);
});

test('row 3: writing the same section again replaces it rather than adding one', async ({
  page,
}) => {
  // The second criterion's first half, and the one thing about this screen a
  // count can catch: (year, CLO, section) is the key, so a second save is an
  // edit. A screen that posted a new row each time would look right until
  // somebody read the record.
  const section = await asTeacherOne(page);
  await wipe(page, section);
  await openPlan(page, section);
  await chooseClo(page, 'CLO-2');

  await writeSection(page, 'REFLECTION', 'ฉบับแรก');

  // Reopening loads what is there rather than a blank box — #33's
  // `emptyeditor` lesson, which is about the same slip one screen over: an
  // editor that starts empty turns every edit into a rewrite from memory.
  await formSection(page, 'REFLECTION')
    .getByRole('button', { name: `แก้ไข${LABELS.REFLECTION}`, exact: true })
    .click();
  await expect(
    formSection(page, 'REFLECTION').getByLabel(LABELS.REFLECTION, { exact: true }),
  ).toHaveValue('ฉบับแรก');
  await formSection(page, 'REFLECTION')
    .getByRole('button', { name: 'ยกเลิก', exact: true })
    .click();

  await writeSection(page, 'REFLECTION', 'ฉบับที่สอง');

  const { entries } = await planOf(page, section);
  expect(entries).toHaveLength(1);
  expect(entries[0].detail_text).toBe('ฉบับที่สอง');
  await expect(formSection(page, 'REFLECTION')).toContainText('ฉบับที่สอง');
  await expect(formSection(page, 'REFLECTION')).not.toContainText('ฉบับแรก');

  await wipe(page, section);
});

test('row 4: removing asks first, and cancelling sends nothing', async ({ page }) => {
  // The second criterion's other half. The DELETEs are counted rather than the
  // text on the screen, for `29a`'s reason: the text outlives a real removal
  // for the length of a round trip, so its presence proves nothing.
  const section = await asTeacherOne(page);
  await wipe(page, section);
  await openPlan(page, section);
  await chooseClo(page, 'CLO-3');
  await writeSection(page, 'NEXT_PLAN', 'จะเพิ่มแบบฝึกหัดรายสัปดาห์');

  expect(await removeSection(page, 'NEXT_PLAN', { confirm: false })).toEqual([]);
  expect((await planOf(page, section)).entries).toHaveLength(1);

  expect((await removeSection(page, 'NEXT_PLAN')).status()).toBe(204);
  expect((await planOf(page, section)).entries).toEqual([]);
  await expect(
    formSection(page, 'NEXT_PLAN').getByRole('button', {
      name: `เขียน${LABELS.NEXT_PLAN}`,
      exact: true,
    }),
  ).toBeVisible();
});

test('row 5: the sections follow the ผลการเรียนรู้ that is chosen', async ({ page }) => {
  // The first criterion's other half — *for a chosen CLO*. Two outcomes, two
  // summaries, and picking one shows its own and not the other's. A screen
  // that filtered on nothing would show the first entry it was given under
  // every outcome, and would pass every row above this one.
  const section = await asTeacherOne(page);
  await wipe(page, section);
  await openPlan(page, section);

  await chooseClo(page, 'CLO-4');
  await writeSection(page, 'SUMMARY', 'ของ CLO-4');
  await chooseClo(page, 'CLO-5');
  await expect(formSection(page, 'SUMMARY')).not.toContainText('ของ CLO-4');
  await writeSection(page, 'SUMMARY', 'ของ CLO-5');

  await chooseClo(page, 'CLO-4');
  await expect(formSection(page, 'SUMMARY')).toContainText('ของ CLO-4');
  await chooseClo(page, 'CLO-5');
  await expect(formSection(page, 'SUMMARY')).toContainText('ของ CLO-5');

  await wipe(page, section);
});

test('row 6: what one ผู้สอน writes, the other reads and can edit', async ({ browser }) => {
  // The fifth criterion, in front of two browsers. Two classes, two accounts,
  // one narrative — which is the grain and is also the thing most likely to
  // surprise somebody who has only met #31's Section-bound weekly plan.
  const mine = await browser.newContext();
  const theirs = await browser.newContext();
  const myPage = await mine.newPage();
  const theirPage = await theirs.newPage();

  try {
    const mySection = await asTeacherOne(myPage);
    const theirSection = await asMultiRole(theirPage);
    expect(mySection).not.toBe(theirSection);
    await wipe(myPage, mySection);

    await openPlan(myPage, mySection);
    await chooseClo(myPage, 'CLO-6');
    await writeSection(myPage, 'SUMMARY', SUMMARY);

    await openPlan(theirPage, theirSection);
    await chooseClo(theirPage, 'CLO-6');
    await expect(formSection(theirPage, 'SUMMARY')).toContainText(SUMMARY);

    await writeSection(theirPage, 'SUMMARY', SUMMARY_AGAIN);
    expect((await planOf(myPage, mySection)).entries).toHaveLength(1);

    await openPlan(myPage, mySection);
    await chooseClo(myPage, 'CLO-6');
    await expect(formSection(myPage, 'SUMMARY')).toContainText(SUMMARY_AGAIN);

    await wipe(myPage, mySection);
  } finally {
    await mine.close();
    await theirs.close();
  }
});

test("row 7: last year's words stand beside this year's, for the same outcome number", async ({
  page,
}) => {
  // The fourth criterion, and the assertion that would fail if either side
  // joined the two years on `clo_id`. ADR-0003 gives each year its own CLO
  // rows, so the ids differ and the numbers do not — and the row proves it by
  // writing under last year's CLO-7 and reading the words back beside this
  // year's.
  const section = await asTeacherOne(page);
  const earlier = await myEarlierSection(page, section);
  await wipe(page, section);
  await wipe(page, earlier.section_id);

  const thenClos = await myClos(page, earlier.section_id);
  const nowClos = await myClos(page, section);
  expect(cloNumbered(thenClos, 'CLO-7').clo_id).not.toBe(cloNumbered(nowClos, 'CLO-7').clo_id);

  await seedEntry(page, earlier.section_id, {
    clo_id: cloNumbered(thenClos, 'CLO-7').clo_id,
    detail_type: 'REFLECTION',
    detail_text: 'ปีที่แล้วนักศึกษาอ่อนเรื่องการออกแบบคลาส',
  });

  await openPlan(page, section);
  await chooseClo(page, 'CLO-7');
  await expect(referencePanel(page)).toContainText(earlier.academic_year);
  await expect(referencePanel(page)).toContainText('ปีที่แล้วนักศึกษาอ่อนเรื่องการออกแบบคลาส');

  // And it is that outcome's, not the รายวิชา's: another number shows the
  // panel *saying so* rather than showing somebody else's reflection. The
  // sentence is asserted and not only the absence, because a panel that had
  // quietly vanished would also contain nothing — and the two are different
  // news, which is the whole argument for keeping it drawn here.
  await chooseClo(page, 'CLO-8');
  await expect(referencePanel(page)).not.toContainText(
    'ปีที่แล้วนักศึกษาอ่อนเรื่องการออกแบบคลาส',
  );
  await expect(referencePanel(page)).toContainText('ไม่มีบันทึกของ CLO-8');

  // The improvement written against it records the year it followed from,
  // which is the citation an accreditation panel reads.
  await chooseClo(page, 'CLO-7');
  await writeSection(page, 'IMPROVEMENT', 'เพิ่มการบ้านออกแบบคลาสสองชิ้น');
  await expect(formSection(page, 'IMPROVEMENT')).toContainText(earlier.academic_year);

  await wipe(page, section);
  await wipe(page, earlier.section_id);
});

test('row 8: with no earlier year written in, the reference panel is not drawn at all', async ({
  page,
}) => {
  // #40's lesson, asserted rather than learned again. A panel headed
  // *ปีการศึกษา …* over nothing is a control that answers nothing: every other
  // row here would pass with it drawn, because they all ask whether it shows
  // what is in it. This one asks whether it should be there.
  const section = await asTeacherOne(page);
  const earlier = await myEarlierSection(page, section);
  await wipe(page, section);
  await wipe(page, earlier.section_id);

  await openPlan(page, section);
  await expect(formSection(page, 'SUMMARY')).toBeVisible();
  await expect(referencePanel(page)).toHaveCount(0);
});

test('row 9: a ตอนเรียน the account does not teach is refused on the screen', async ({ page }) => {
  // The sixth criterion, reached the only way a browser can reach it: by
  // typing the address. The register decides, per ADR-0002, and the sentence
  // that comes back is #24's rather than anything about a plan.
  await signIn(page, ACCOUNTS.teacherTwo);
  const answer = await openPlan(page, 1);
  expect(answer.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound)).toBeVisible();
});
