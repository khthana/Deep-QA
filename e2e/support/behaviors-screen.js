'use strict';

const { BACKEND_URL } = require('./env');
const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');

/**
 * พฤติกรรมที่วัดผลได้ตาม CLO — #28, as a browser reaches it.
 *
 * The screen hangs two levels under a ตอนเรียน's address — the Section proves
 * the caller may be here, the CLO owns the rows — and what it shows belongs to
 * the CLO alone, so everything `clos-screen.js` says about the grain holds
 * here by inheritance. Helpers take the section id and the clo id together for
 * that reason, and never a year.
 *
 * `mySectionIds` is re-exported from `enrolment-screen.js` — the copy that asks
 * over `page.request`, which is not attached to a navigation and cannot lose
 * its body to one. New files take the fixed one; the old pre-buffering copy in
 * `clos-screen.js` stays where it is until somebody decides #27's file moves.
 */

const API = /^\/api\/teaching\/sections\/\d+\/clos\/\d+\/behaviors/;

const path = (sectionId, cloId) =>
  `${DASHBOARD}/${sectionId}/courseOutcomes/${cloId}/behaviors`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForBehaviors = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/** Goes to one CLO's behaviours and hands back the read a row asserts on. */
async function openBehaviors(page, sectionId, cloId) {
  const [response] = await Promise.all([waitForBehaviors(page), page.goto(path(sectionId, cloId))]);
  return response;
}

/**
 * The CLO set of a ตอนเรียน, over the context's own request — the ids a row
 * needs to build a behaviours address, asked the way `mySectionIds` asks.
 */
async function myClos(page, sectionId) {
  const answer = await page.request.get(
    `${BACKEND_URL}/api/teaching/sections/${sectionId}/clos`,
  );
  if (answer.status() !== 200) {
    throw new Error('could not read the CLO set: ' + answer.status());
  }
  const { clos } = await answer.json();
  return clos;
}

/**
 * One behaviour's card, found by its number.
 *
 * The cards are labelled `ข้อ <n>` because the number is the only stable
 * handle they carry: the detail is free text two people edit, and the id never
 * reaches the screen.
 */
const behaviorCard = (page, no) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: new RegExp(`^ข้อ ${no} ·`) }),
  });

/** The numbers on the screen, in the order the rows are drawn. */
async function numbersOnScreen(page) {
  const headings = await page.getByRole('listitem').getByRole('heading').allTextContents();
  return headings.map(text => Number(text.trim().split(/\s+/)[1]));
}

/**
 * Fills the form that is open and presses บันทึก, handing back the write.
 *
 * The two closed lists are `<select>`s, so their values are chosen rather than
 * typed — by Thai label, which is what a person picks by.
 */
async function submitBehavior(page, { detail, level, activity }, method) {
  if (detail !== undefined) {
    await page.getByLabel('รายละเอียดพฤติกรรม', { exact: true }).fill(detail);
  }
  if (level !== undefined) {
    await page.getByLabel('ระดับพุทธิพิสัย', { exact: true }).selectOption({ label: level });
  }
  if (activity !== undefined) {
    await page.getByLabel('กิจกรรมการเรียนรู้', { exact: true }).selectOption({ label: activity });
  }
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === method,
    ),
    page.getByRole('button', { name: 'บันทึก' }).click(),
  ]);
  return response;
}

/**
 * Presses the bin on one card and answers the dialog.
 *
 * Confirming hands back the write. Cancelling hands back the DELETEs sent
 * while the dialog was up — `[]` when the cancel did its job, for
 * `removeClo`'s reason: the card outlives a real removal for the length of a
 * round trip, so its presence proves nothing.
 */
async function removeBehavior(page, no, { confirm = true } = {}) {
  await page.getByRole('button', { name: `ลบข้อ ${no}`, exact: true }).click();

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

  // The reload wait is registered before the click: the screen re-reads the
  // list as soon as the DELETE answers, and a row that asserted numbers while
  // that read was in flight would be counting an empty list mid-reload — 27a's
  // line-231 lesson, closed here rather than re-learned.
  const reloaded = waitForBehaviors(page);
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

module.exports = {
  API,
  path,
  waitForBehaviors,
  openBehaviors,
  mySectionIds,
  myClos,
  behaviorCard,
  numbersOnScreen,
  submitBehavior,
  removeBehavior,
};
