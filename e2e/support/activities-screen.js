'use strict';

const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');

/**
 * กิจกรรมการเรียนรู้ — #32, as a browser reaches it.
 *
 * The screen hangs one level under a ตอนเรียน's address and shows two grains
 * at once: the Activities are this Section's, the หมวดคะแนน they are grouped
 * under are the Offering's. The seed makes the first readable off the rows
 * themselves — the deletable fixture's name carries its ตอนเรียน and year —
 * and the second is read by comparing two Sections' group headings.
 *
 * Cards are labelled `กิจกรรม <name>`, groups `หมวด <category>`: an Activity
 * has no number a person sees, and its name is what the delete dialog names
 * it by.
 */

const API = /^\/api\/teaching\/sections\/\d+\/activities/;

const path = sectionId => `${DASHBOARD}/${sectionId}/learningActivities`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForActivities = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/** Goes to one Section's activities and hands back the read a row asserts on. */
async function openActivities(page, sectionId) {
  const [response] = await Promise.all([
    waitForActivities(page),
    page.goto(path(sectionId)),
  ]);
  return response;
}

/** One group, found by its category name. */
const categoryGroup = (page, name) => page.getByRole('region', { name: `หมวด ${name}` });

/** One Activity's card, found by its name. */
const activityCard = (page, name) => page.getByRole('listitem').filter({
  has: page.getByRole('heading', { name, exact: true }),
});

/** The group headings, in the order the page draws them. */
const groupsOnScreen = page =>
  page.getByRole('region').getByRole('heading', { level: 2 }).allTextContents();

/** Every Activity name on the screen, in drawn order. */
const namesOnScreen = page =>
  page.getByRole('listitem').getByRole('heading', { level: 3 }).allTextContents();

/** The Activity names inside one category, in drawn order. */
const namesInCategory = (page, name) =>
  categoryGroup(page, name).getByRole('heading', { level: 3 }).allTextContents();

/**
 * Presses the bin on one card and answers the dialog.
 *
 * Confirming hands back the write. Cancelling hands back the DELETEs sent
 * while the dialog was up — `[]` when the cancel did its job, for
 * `removeClo`'s reason: the card outlives a real removal for the length of a
 * round trip, so its presence proves nothing.
 */
async function removeActivity(page, name, { confirm = true } = {}) {
  await page.getByRole('button', { name: `ลบกิจกรรม ${name}`, exact: true }).click();

  if (!confirm) {
    const deletes = [];
    const watch = request => {
      if (request.method() === 'DELETE' && API.test(new URL(request.url()).pathname)) {
        deletes.push(request.url());
      }
    };
    page.on('request', watch);
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await page.waitForTimeout(500);
    page.off('request', watch);
    return deletes;
  }

  // The reload wait is registered before the click — 27a's line-231 lesson.
  // A refused delete answers 400 and reloads nothing, so the wait is only
  // collected on the 204.
  const reloaded = waitForActivities(page);
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'DELETE',
    ),
    page.getByRole('button', { name: 'ลบ', exact: true }).click(),
  ]);
  if (response.status() === 204) await reloaded;
  else reloaded.catch(() => {});
  return response;
}

/**
 * The editor — #33 — which opens in place of the add button, as #31's does.
 *
 * Everything here is addressed by the label a person reads, because that is
 * what the row is about: a picker that offered the wrong set would still be
 * found by a `nth(1)` selector, and would not be found by its own name.
 */
const openEditor = (page, name) =>
  name
    ? page.getByRole('button', { name: `แก้ไขกิจกรรม ${name}`, exact: true }).click()
    : page.getByRole('button', { name: 'เพิ่มกิจกรรม', exact: true }).click();

const field = (page, label) => page.getByLabel(label, { exact: true });

/** One attribution row's two controls, by the position a person sees. */
const cloRow = (page, index) => ({
  clo: field(page, `ผลการเรียนรู้แถวที่ ${index}`),
  weight: field(page, `น้ำหนักแถวที่ ${index}`),
  drop: page.getByRole('button', { name: `นำผลการเรียนรู้แถวที่ ${index} ออก`, exact: true }),
});

/** Types a whole draft into the open form; anything absent is left alone. */
async function fillActivity(page, draft) {
  if (draft.name !== undefined) await field(page, 'ชื่อกิจกรรม').fill(draft.name);
  if (draft.type !== undefined) await field(page, 'ประเภท').selectOption(draft.type);
  if (draft.mark !== undefined) await field(page, 'คะแนนเต็ม').fill(String(draft.mark));
  if (draft.category !== undefined) {
    await field(page, 'หมวดคะแนน').selectOption({ label: draft.category });
  }
  if (draft.announced !== undefined) await field(page, 'วันที่ประกาศ').fill(draft.announced);
  if (draft.due !== undefined) await field(page, 'กำหนดส่ง').fill(draft.due);

  for (const [at, row] of (draft.clos ?? []).entries()) {
    const index = at + 1;
    if (!(await field(page, `ผลการเรียนรู้แถวที่ ${index}`).count())) {
      await page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้', exact: true }).click();
    }
    const controls = cloRow(page, index);
    if (row.clo !== undefined) await controls.clo.selectOption({ label: row.clo });
    if (row.weight !== undefined) await controls.weight.fill(String(row.weight));
  }
}

/**
 * Presses บันทึก and hands back the write.
 *
 * The reload wait is registered before the click, 32a's `removeActivity`
 * lesson: a refused save answers 400 and reloads nothing, so the wait is only
 * collected when the write succeeded.
 */
async function saveActivity(page) {
  const written = page.waitForResponse(
    answer =>
      API.test(new URL(answer.url()).pathname) &&
      ['POST', 'PUT'].includes(answer.request().method()),
  );
  const reloaded = waitForActivities(page);
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();

  const response = await written;
  if (response.ok()) await reloaded;
  else reloaded.catch(() => {});
  return response;
}

/**
 * What a card says it is attributed to, as `ผลการเรียนรู้ CLO-1 (60%) · …`.
 *
 * By its own label rather than by position: the line is two spans, so a text
 * selector would find the label span and report the label back.
 */
const attributionOf = (page, name) =>
  page.getByLabel(`ผลการเรียนรู้ของ ${name}`, { exact: true }).innerText();

module.exports = {
  API,
  path,
  waitForActivities,
  openActivities,
  mySectionIds,
  categoryGroup,
  activityCard,
  groupsOnScreen,
  namesOnScreen,
  namesInCategory,
  removeActivity,
  openEditor,
  field,
  cloRow,
  fillActivity,
  saveActivity,
  attributionOf,
};
