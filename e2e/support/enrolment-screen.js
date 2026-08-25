'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD, openDashboard } = require('./teaching-screen');

/**
 * รายชื่อนักศึกษาของรายวิชา — #25, as a browser reaches it.
 *
 * The screen hangs under a ตอนเรียน's address and, unlike `clos-screen.js`
 * beside it, what it shows really does belong to that ตอนเรียน. Two Sections of
 * one Offering are two class lists. So every helper here takes a section id and
 * none of them is shared with the sibling Section — a row that passed against
 * either one would not be saying anything.
 *
 * The codes the rows enrol are the prior-year cohort's, and they are written
 * down rather than discovered. `65010001` exists in the register — #17's own
 * suite reads it back by name for the same reason — and it is enrolled in last
 * year's ตอนเรียน rather than this one, so it is the one thing this screen
 * needs and cannot get from the current-year cohort: a student the register
 * holds who is not already in the class. A repeating student is what that looks
 * like on paper, which is why it is a legitimate enrolment and not a fixture
 * bent into shape.
 */

const API = /^\/api\/teaching\/sections\/\d+\/students$/;
const IMPORT = sectionId => `/api/teaching/sections/${sectionId}/students/import`;

const path = sectionId => `${DASHBOARD}/${sectionId}/subjectStudents`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForList = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/** Goes to the class list of one ตอนเรียน and hands back the read a row asserts on. */
async function openEnrolment(page, sectionId) {
  const [response] = await Promise.all([waitForList(page), page.goto(path(sectionId))]);
  return response;
}

/** The section ids this account teaches this term, straight off its own dashboard. */
async function mySectionIds(page) {
  const answer = await openDashboard(page);
  expect(answer.status()).toBe(200);
  const { sections } = await answer.json();
  return sections.map(section => section.section_id);
}

/** The class list's own table, told apart from the rejection report's by its heading. */
const listTable = page => page.locator('table').filter({ hasText: 'รหัสนักศึกษา' });

/**
 * Codes the register holds that this term's ตอนเรียน does not.
 *
 * The prior-year cohort, taken from the front. Written down rather than read
 * out of the database because a browser test has no pool, and read as a fact
 * about the seed rather than about this screen — a row that used one of these
 * and found it already enrolled would fail loudly at the 409 rather than
 * quietly assert nothing.
 */
const SPARE_CODES = ['65010001', '65010002', '65010003'];

/** A code no register holds. Outside both seeded cohorts by its first two digits. */
const UNKNOWN_CODE = '99019999';

/** Types a code into the box and presses เพิ่มนักศึกษา, handing back the write. */
async function enrol(page, code) {
  await page.getByLabel('รหัสนักศึกษา', { exact: true }).fill(code);
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'เพิ่มนักศึกษา' }).click(),
  ]);
  return response;
}

/**
 * Presses the bin on one row and answers the dialog.
 *
 * Confirming hands back the write. Cancelling hands back the DELETEs that were
 * sent while the dialog was up — `[]` when the cancel did its job, which is the
 * only honest way to assert it, for `removeClo`'s reason: a cancel wired to the
 * removal still leaves the row drawn for the length of a round trip.
 */
async function removeStudent(page, code, { confirm = true } = {}) {
  await page.getByRole('button', { name: `นำ ${code} ออกจากตอนเรียน` }).click();
  const isRemoval = url => /\/api\/teaching\/sections\/\d+\/students\/\d+$/.test(new URL(url).pathname);

  if (!confirm) {
    const deletes = [];
    const watch = request => {
      if (request.method() === 'DELETE' && isRemoval(request.url())) deletes.push(request.url());
    };
    page.on('request', watch);
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await page.waitForTimeout(500);
    page.off('request', watch);
    return deletes;
  }

  const [response] = await Promise.all([
    page.waitForResponse(
      answer => isRemoval(answer.url()) && answer.request().method() === 'DELETE',
    ),
    page.getByRole('button', { name: 'นำออก', exact: true }).click(),
  ]);
  return response;
}

module.exports = {
  API,
  IMPORT,
  path,
  waitForList,
  openEnrolment,
  mySectionIds,
  listTable,
  SPARE_CODES,
  UNKNOWN_CODE,
  enrol,
  removeStudent,
};
