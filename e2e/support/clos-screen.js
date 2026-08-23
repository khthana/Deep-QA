'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD, openDashboard } = require('./teaching-screen');

/**
 * ผลการเรียนรู้รายวิชา — #27, as a browser reaches it.
 *
 * The screen hangs under a ตอนเรียน's address, and the set it shows does not
 * belong to that ตอนเรียน. ADR-0003 puts it at the (หลักสูตร, รายวิชา,
 * ปีการศึกษา) grain and ADR-0004 makes the Section id the only context a
 * Teacher screen carries, so the address is `<section>/courseOutcomes` and the
 * record behind it is the Offering's. Every helper here takes a section id for
 * that reason, and none of them takes a year: the year is what the server
 * resolves, and a helper that accepted one would let a row assert the grain by
 * asking for it.
 */

const API = /^\/api\/teaching\/sections\/\d+\/clos/;

const path = sectionId => `${DASHBOARD}/${sectionId}/courseOutcomes`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForClos = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/** Goes to the screen for one ตอนเรียน and hands back the read a row is about to assert on. */
async function openClos(page, sectionId) {
  const [response] = await Promise.all([waitForClos(page), page.goto(path(sectionId))]);
  return response;
}

/** The section ids this account teaches this term, straight off its own dashboard. */
async function mySectionIds(page) {
  const answer = await openDashboard(page);
  expect(answer.status()).toBe(200);
  const { sections } = await answer.json();
  return sections.map(section => section.section_id);
}

/**
 * One CLO's card, found by the code it carries.
 *
 * The cards are labelled with their own code because they are otherwise
 * identical — same two buttons, same two definition terms — and the code is the
 * only handle that tells one from another. `getByLabel` would also match the
 * form's รหัส field, which carries the code as its value while an edit is open,
 * so the list item is asked for by role.
 */
const cloCard = (page, code) => page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: new RegExp('^' + code + '\\b') }) });

/** The codes on the screen, in the order they are drawn. */
async function codesOnScreen(page) {
  const headings = await page.getByRole('listitem').getByRole('heading').allTextContents();
  return headings.map(text => text.trim().split(/\s+/)[0]);
}

/** Fills the form that is open and presses บันทึก, handing back the write. */
async function submitClo(page, fields, method) {
  for (const [label, value] of Object.entries(fields)) {
    await page.getByLabel(label, { exact: true }).fill(value);
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
 * Confirming hands back the write. Cancelling hands back the list of DELETEs
 * that were sent while the dialog was up — which is `[]` when the cancel did
 * its job, and is the only honest way to assert that. Asserting instead that
 * the card is still on screen proves nothing: a cancel wired to the removal
 * still leaves the card drawn for as long as the round trip takes, and
 * `toHaveCount(1)` matches on its first poll and passes.
 */
async function removeClo(page, code, { confirm = true } = {}) {
  await page.getByRole('button', { name: `ลบ ${code}` }).click();
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
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'DELETE',
    ),
    page.getByRole('button', { name: 'ลบ', exact: true }).click(),
  ]);
  return response;
}

module.exports = {
  API,
  path,
  waitForClos,
  openClos,
  mySectionIds,
  cloCard,
  codesOnScreen,
  submitClo,
  removeClo,
};
