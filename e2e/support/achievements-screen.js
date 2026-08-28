'use strict';

const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');
const { myClos, numbersOnScreen } = require('./behaviors-screen');

/**
 * เกณฑ์การบรรลุผลตาม CLO — #29, as a browser reaches it.
 *
 * The screen hangs two levels under a ตอนเรียน's address exactly as #28's
 * does — the Section proves the caller may be here, the CLO owns the rows —
 * so everything `behaviors-screen.js` says holds here one table over, and the
 * helpers keep its shapes: `mySectionIds` re-exported from the
 * `page.request` copy, the reload wait registered before the delete's click.
 *
 * The one difference worth a sentence: the band is stored as the Thai word
 * the person picked, so no label table stands between the dropdown and the
 * card — what `submitCriterion` selects by label is also the value.
 */

const API = /^\/api\/teaching\/sections\/\d+\/clos\/\d+\/criteria/;

const path = (sectionId, cloId) =>
  `${DASHBOARD}/${sectionId}/courseOutcomes/${cloId}/criteria`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForCriteria = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/** Goes to one CLO's criteria and hands back the read a row asserts on. */
async function openCriteria(page, sectionId, cloId) {
  const [response] = await Promise.all([waitForCriteria(page), page.goto(path(sectionId, cloId))]);
  return response;
}

/**
 * One criterion's card, found by its number.
 *
 * The cards are labelled `ข้อ <n>` because the number is the only stable
 * handle they carry: the band repeats — a CLO may hold several criteria of
 * one band — and the id never reaches the screen.
 *
 * `myClos` and `numbersOnScreen` are #28's, required above rather than
 * copied: neither asks anything criteria-specific — one reads `/clos`, the
 * other reads whatever cards are drawn — so a second copy would only be a
 * second thing to drift.
 */
const criterionCard = (page, no) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: new RegExp(`^ข้อ ${no} ·`) }),
  });

/** The bands on the screen, in the same order — the heading's other half. */
async function bandsOnScreen(page) {
  const headings = await page.getByRole('listitem').getByRole('heading').allTextContents();
  return headings.map(text => text.split('·')[1].trim());
}

/**
 * Fills the form that is open and presses บันทึก, handing back the write.
 *
 * The band is a `<select>`, chosen by the Thai word — which here is also the
 * stored value. The description is filled only when given, because leaving it
 * alone is the state a row may want to prove saves.
 */
async function submitCriterion(page, { band, detail, description }, method) {
  if (band !== undefined) {
    await page.getByLabel('ระดับการบรรลุผล', { exact: true }).selectOption({ label: band });
  }
  if (detail !== undefined) {
    await page.getByLabel('เกณฑ์การประเมิน', { exact: true }).fill(detail);
  }
  if (description !== undefined) {
    await page.getByLabel('คำอธิบาย', { exact: true }).fill(description);
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
async function removeCriterion(page, no, { confirm = true } = {}) {
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
  const reloaded = waitForCriteria(page);
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
  waitForCriteria,
  openCriteria,
  mySectionIds,
  myClos,
  criterionCard,
  numbersOnScreen,
  bandsOnScreen,
  submitCriterion,
  removeCriterion,
};
