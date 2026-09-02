'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD } = require('./teaching-screen');

/**
 * กลุ่มงานนักศึกษา — #26, as a browser reaches it.
 *
 * The screen is Section-bound like `enrolment-screen.js` beside it, so every
 * helper takes a section id and none of them is shared with the ตอนเรียน next
 * door.
 *
 * What is different here, and what these helpers exist to make sayable, is
 * that two of the buttons look like one button. **เพิ่มเข้ากลุ่ม** and
 * **ย้ายมากลุ่มนี้** are pressed the same way, are next to each other, and are
 * two different acts with two different refusals — so `place()` takes which
 * one it means rather than defaulting, and no row below can accidentally
 * assert the wrong verb by leaving an argument out.
 */

const API = sectionId => `/api/teaching/sections/${sectionId}/groups`;
const path = sectionId => `${DASHBOARD}/${sectionId}/studentGroups`;

/** The screen's own read, whatever it turns out to answer. */
const waitForList = (page, sectionId) =>
  page.waitForResponse(
    answer =>
      new URL(answer.url()).pathname === API(sectionId) &&
      answer.request().method() === 'GET',
  );

/** Opens the groups screen of one ตอนเรียน and hands back the read a row asserts on. */
async function openGroups(page, sectionId) {
  const [response] = await Promise.all([
    waitForList(page, sectionId),
    page.goto(path(sectionId)),
  ]);
  return response;
}

/** One group's card, found by the heading a person reads it by. */
const card = (page, groupName) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: groupName, exact: true }) });

/** Every group card's name, in the order the screen draws them. */
const groupNames = page =>
  page
    .locator('section')
    .filter({ has: page.getByRole('button', { name: /^ลบ / }) })
    .getByRole('heading')
    .allInnerTexts();

/** The `n/10` a card wears, as the two numbers rather than as its text. */
async function fullness(page, groupName) {
  const text = await card(page, groupName).getByText(/^\d+\/\d+$/).innerText();
  const [members, ceiling] = text.split('/').map(Number);
  return { members, ceiling };
}

/** The student codes one card lists, in the order it lists them. */
async function membersOn(page, groupName) {
  const rows = await card(page, groupName).locator('li').allInnerTexts();
  return rows.map(row => row.trim().split(/\s+/)[0]).filter(code => /^\d{8}$/.test(code));
}

/** The codes in the ยังไม่มีกลุ่ม panel — the roll's remainder, as the screen has it. */
async function ungroupedOn(page) {
  const panel = page.locator('div').filter({
    has: page.getByRole('heading', { name: /^ยังไม่มีกลุ่ม / }),
  });
  const chips = await panel.last().locator('li').allInnerTexts();
  return chips.map(chip => chip.trim().split(/\s+/)[0]).filter(code => /^\d{8}$/.test(code));
}

/** Types a name into the create box and presses สร้างกลุ่ม, handing back the write. */
async function createGroup(page, sectionId, groupName) {
  await page.getByLabel('ชื่อกลุ่มงาน', { exact: true }).fill(groupName);
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === API(sectionId) &&
        answer.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'สร้างกลุ่ม' }).click(),
  ]);
  return response;
}

/**
 * Chooses a student in one card's picker and presses one of its two buttons.
 *
 * `verb` is required and is the whole point of the helper: 'add' presses
 * เพิ่มเข้ากลุ่ม, 'move' presses ย้ายมากลุ่มนี้, and the two send different
 * requests to different routes. A row that meant one and pressed the other
 * would still pass or fail for a reason, and the reason would not be the one
 * the row is about.
 */
async function place(page, sectionId, groupName, studentId, verb) {
  const group = card(page, groupName);
  await group.getByRole('combobox').selectOption(studentId);
  const method = verb === 'move' ? 'PUT' : 'POST';
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname.startsWith(API(sectionId)) &&
        answer.request().method() === method,
    ),
    group
      .getByRole('button', { name: verb === 'move' ? 'ย้ายมากลุ่มนี้' : 'เพิ่มเข้ากลุ่ม' })
      .click(),
  ]);
  return response;
}

/** Takes one member out of one card. */
async function takeOut(page, sectionId, groupName, studentId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname.startsWith(API(sectionId)) &&
        answer.request().method() === 'DELETE',
    ),
    card(page, groupName)
      .getByRole('button', { name: `นำ ${studentId} ออกจาก ${groupName}` })
      .click(),
  ]);
  return response;
}

/**
 * Presses the bin on one card and answers the dialog.
 *
 * Confirming hands back the write; cancelling hands back the DELETEs that were
 * sent while the dialog was up — `[]` when the cancel did its job, which is
 * `removeStudent`'s reason in `enrolment-screen.js`: a cancel wired to the
 * deletion still leaves the card drawn for the length of a round trip.
 */
async function disband(page, sectionId, groupName, { confirm = true } = {}) {
  await page.getByRole('button', { name: `ลบ ${groupName}` }).click();

  if (!confirm) {
    const deletes = [];
    const watch = request => {
      if (request.method() === 'DELETE') deletes.push(request.url());
    };
    page.on('request', watch);
    await page.getByRole('button', { name: 'ยกเลิก' }).click();
    await page.waitForTimeout(500);
    page.off('request', watch);
    return deletes;
  }

  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname.startsWith(API(sectionId)) &&
        answer.request().method() === 'DELETE',
    ),
    page.getByRole('button', { name: 'ลบกลุ่ม', exact: true }).click(),
  ]);
  return response;
}

/** Opens the history panel and waits for its first page. */
async function openHistory(page, sectionId) {
  const [response] = await Promise.all([
    page.waitForResponse(
      answer =>
        new URL(answer.url()).pathname === `${API(sectionId)}/history` &&
        answer.request().method() === 'GET',
    ),
    page.getByRole('button', { name: 'ประวัติการเปลี่ยนแปลง' }).click(),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

/** The sentences the history panel is showing, newest first. */
const historyLines = page =>
  page
    .locator('table')
    .filter({ hasText: 'สิ่งที่เกิดขึ้น' })
    .locator('tbody tr td:nth-child(2)')
    .allInnerTexts();

module.exports = {
  API,
  path,
  waitForList,
  openGroups,
  card,
  groupNames,
  fullness,
  membersOn,
  ungroupedOn,
  createGroup,
  place,
  takeOut,
  disband,
  openHistory,
  historyLines,
};
