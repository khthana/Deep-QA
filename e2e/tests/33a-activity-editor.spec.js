'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { CLOS, SCORE_RATIOS, ACTIVITIES, planWeeksFor } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const {
  openActivities,
  mySectionIds,
  activityCard,
  namesOnScreen,
  namesInCategory,
  removeActivity,
  openEditor,
  field,
  cloRow,
  fillActivity,
  saveActivity,
  attributionOf,
} = require('../support/activities-screen');

/**
 * docs/acceptance/33-activity-editor.md — the half a browser can prove.
 *
 * The backend suite proves the four grain refusals, the duplicate CLO, the
 * weight total and the marked-CLO guard at the routes. What is here is what is
 * only true in front of the screen: that a piece of work typed into the form
 * arrives in the list under the หมวด it was filed in, carrying the CLOs it was
 * attributed to; that the pickers offer this Offering's sets and nothing else;
 * that a CLO already used is not offered a second time; that opening the
 * editor on an existing row loads that row rather than an empty form; that a
 * second save edits rather than adds; and that a refusal reaches the page
 * without taking the draft with it.
 *
 * ## What is deliberately not here
 *
 * The field labels, the wording of the two type options, the sentence under an
 * empty attribution and the running total's position are appearance and stay
 * hand-walked. So is the arithmetic shown beside each row (`12 คะแนน`), which
 * a person reads and no assertion here would make more true than the number it
 * came from.
 *
 * ## Which rows touch which Activity
 *
 * Everything written here is written by these rows and deleted by them again,
 * except the seeded โครงงานย่อยที่ 1 that row 4 only *reads*. The seed's own
 * Activities carry a cohort's marks, and editing their attribution is what the
 * marked-CLO guard exists to refuse — the backend suite's business, not a
 * browser row's.
 */

const MADE = 'ควิซท้ายบท (จอ 33a)';
const EDITED = 'ควิซท้ายบท แก้ไขแล้ว (จอ 33a)';

/** teacher.one@ teaching ตอนเรียน 1 of the current term. */
async function asTeacherOne(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  return section;
}

const cloLabel = index => `CLO-${index + 1} · ${CLOS[index].detail}`;

test('row 1: a piece of work typed into the form arrives in the list, under its หมวด', async ({
  page,
}) => {
  // The first criterion end to end, through the screen a person uses: name,
  // type, mark, both dates, the week and the category, plus the attribution
  // that makes it count towards anything.
  const section = await asTeacherOne(page);
  await openActivities(page, section);

  const before = await namesOnScreen(page);
  await openEditor(page);
  await fillActivity(page, {
    name: MADE,
    type: 'group',
    mark: 20,
    category: SCORE_RATIOS[0].category,
    announced: '2026-08-03',
    due: '2026-08-17',
    clos: [
      { clo: cloLabel(0), weight: 60 },
      { clo: cloLabel(1), weight: 40 },
    ],
  });

  const written = await saveActivity(page);
  expect(written.status()).toBe(201);

  // It is in the list, in the category it was filed under, with what was typed.
  await expect(activityCard(page, MADE)).toHaveCount(1);
  expect(await namesInCategory(page, SCORE_RATIOS[0].category)).toContain(MADE);
  expect(await namesOnScreen(page)).toHaveLength(before.length + 1);

  const card = activityCard(page, MADE);
  await expect(card.getByText('งานกลุ่ม')).toBeVisible();
  await expect(card.getByText('20', { exact: true })).toBeVisible();

  // And the attribution is on the card, which is what makes "this contributes
  // to no outcome" a thing a person can see without opening the editor.
  expect(await attributionOf(page, MADE)).toContain('CLO-1 (60%)');
  expect(await attributionOf(page, MADE)).toContain('CLO-2 (40%)');
});

test('row 2: opening the editor on a row loads that row, rows and all', async ({ page }) => {
  // The sixth criterion. A form that opened empty would lose the attribution
  // of everything edited through it — the save replaces the rows whole.
  const section = await asTeacherOne(page);
  const answered = await (await openActivities(page, section)).json();

  await openEditor(page, MADE);

  await expect(field(page, 'ชื่อกิจกรรม')).toHaveValue(MADE);
  await expect(field(page, 'ประเภท')).toHaveValue('group');
  await expect(field(page, 'คะแนนเต็ม')).toHaveValue('20');
  await expect(field(page, 'วันที่ประกาศ')).toHaveValue('2026-08-03');
  await expect(field(page, 'กำหนดส่ง')).toHaveValue('2026-08-17');

  // Two rows, in the order they were saved, each holding its own CLO and its
  // own weight. The CLO is asserted by the value the control carries — a
  // `<select>`'s text is every option it holds, which would match anything.
  const cloIdOf = number => answered.clos.find(one => one.clo_number === number).clo_id;
  await expect(cloRow(page, 1).clo).toHaveValue(String(cloIdOf('CLO-1')));
  await expect(cloRow(page, 2).clo).toHaveValue(String(cloIdOf('CLO-2')));
  await expect(cloRow(page, 1).weight).toHaveValue('60');
  await expect(cloRow(page, 2).weight).toHaveValue('40');
  await expect(cloRow(page, 3).clo).toHaveCount(0);
});

test('row 3: a CLO already used is not offered to the next row', async ({ page }) => {
  // The fifth criterion, as the screen keeps it rather than as the server
  // refuses it. Both exist: the server is the authority (the backend suite
  // proves the refusal), and the picker is what stops a person walking into
  // it.
  const section = await asTeacherOne(page);
  await openActivities(page, section);
  await openEditor(page, MADE);

  const second = await cloRow(page, 2).clo.locator('option').allTextContents();
  expect(second).toContain(cloLabel(1)); // its own pick is still there
  expect(second).not.toContain(cloLabel(0)); // row 1 has it

  const first = await cloRow(page, 1).clo.locator('option').allTextContents();
  expect(first).not.toContain(cloLabel(1));
});

test('row 4: the pickers offer this offering\'s sets and this section\'s weeks', async ({
  page,
}) => {
  // The fourth criterion and its two neighbours, read off the controls
  // themselves: nine CLOs, three หมวด and the plan's own weeks.
  //
  // Counted against the **seed** and not against the answer that filled the
  // controls. The first draft of this row compared the screen with
  // `answered.clos.length` and `answered.weeks.length`, which is a tautology
  // the moment the fault is in the query: widen the WHERE and both sides grow
  // together. The sweep found it — `weeksofanysection` survived — and the
  // counts here are the seed's own, which no route can move.
  const section = await asTeacherOne(page);
  const answered = await (await openActivities(page, section)).json();
  await openEditor(page, MADE);

  const clos = await cloRow(page, 1).clo.locator('option').allTextContents();
  // The Offering's nine, less the one row 2 holds, plus the empty option —
  // nine. A second year's set would double it, and both years' details are
  // the same text, so the count is what says which year these are.
  expect(clos).toHaveLength(CLOS.length);
  for (const clo of answered.clos.filter(one => one.clo_number !== 'CLO-2')) {
    expect(clos).toContain(`${clo.clo_number} · ${clo.clo_detail}`);
  }

  const categories = await field(page, 'หมวดคะแนน').locator('option').allTextContents();
  for (const ratio of SCORE_RATIOS) expect(categories).toContain(ratio.category);

  // The weeks are this Section's plan. The seed bakes the section number and
  // the year into every title for exactly this reason, so a week belonging to
  // a sibling Section is not a count but a sentence a person can read.
  const weeks = await field(page, 'สัปดาห์ในแผนการสอน').locator('option').allTextContents();
  const mine = planWeeksFor(answered.section.section_number, answered.section.academic_year).map(
    week => `สัปดาห์ที่ ${week.week_no} · ${week.title}`,
  );
  expect(weeks).toHaveLength(mine.length + 1);
  for (const week of mine) expect(weeks).toContain(week);

  // The type picker holds the two values the column allows and no third.
  const types = await field(page, 'ประเภท').locator('option').evaluateAll(options =>
    options.map(option => option.value),
  );
  expect(types).toEqual(['individual', 'group']);
});

test('row 5: a weight total over a hundred is refused, and the draft survives it', async ({
  page,
}) => {
  // A share of the mark cannot exceed the whole. The sentence is the server's,
  // shown as sent — and the form stays open holding what was typed, because a
  // refusal a person can fix is not a reason to throw their work away.
  const section = await asTeacherOne(page);
  await openActivities(page, section);
  await openEditor(page, MADE);

  await fillActivity(page, { clos: [{ weight: 60 }, { weight: 50 }] });

  const refused = await saveActivity(page);
  expect(refused.status()).toBe(400);
  await expect(page.getByText(REFUSALS.activityCloWeights(110))).toBeVisible();

  // Still in the form, still holding the draft.
  await expect(field(page, 'ชื่อกิจกรรม')).toHaveValue(MADE);
  await expect(cloRow(page, 2).weight).toHaveValue('50');

  // And nothing was written: the card still says what it said.
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  expect(await attributionOf(page, MADE)).toContain('CLO-2 (40%)');
});

test('row 6: a second save edits the same activity rather than adding another', async ({
  page,
}) => {
  // The seventh criterion, counted rather than assumed: the list grows by
  // nothing, the old name is gone, and the attribution is the new one.
  const section = await asTeacherOne(page);
  await openActivities(page, section);
  const before = await namesOnScreen(page);

  await openEditor(page, MADE);
  await fillActivity(page, {
    name: EDITED,
    mark: 30,
    clos: [{ clo: cloLabel(2), weight: 100 }],
  });
  await cloRow(page, 2).drop.click();

  const saved = await saveActivity(page);
  expect(saved.status()).toBe(200);

  expect(await namesOnScreen(page)).toHaveLength(before.length);
  await expect(activityCard(page, MADE)).toHaveCount(0);
  await expect(activityCard(page, EDITED)).toHaveCount(1);
  expect(await attributionOf(page, EDITED)).toContain('CLO-3 (100%)');
  expect(await attributionOf(page, EDITED)).not.toContain('CLO-2');
});

test('row 7: an activity may be attributed to nothing, and the card says so', async ({ page }) => {
  // The ticket's own sentence, on the screen: an Activity with no CLO rows
  // contributes to no outcome. It is a legal state, and the row a Teacher most
  // needs to be able to see from the list.
  const section = await asTeacherOne(page);
  await openActivities(page, section);

  await openEditor(page, EDITED);
  await cloRow(page, 1).drop.click();
  const saved = await saveActivity(page);
  expect(saved.status()).toBe(200);

  expect(await attributionOf(page, EDITED)).toContain('ยังไม่ได้เชื่อมโยง');

  // The seeded work is untouched by all of this — its attribution is still
  // the seed's, which is what makes the rows above about the row they wrote.
  expect(await attributionOf(page, ACTIVITIES[0].name)).toMatch(/CLO-\d+ \(\d+%\)/);

  // And the row these tests wrote is taken away again. The schema is reseeded
  // per run and not per file, so a spec that left an Activity behind would be
  // changing the list every later file counts.
  expect((await removeActivity(page, EDITED)).status()).toBe(204);
  await expect(activityCard(page, EDITED)).toHaveCount(0);
});
