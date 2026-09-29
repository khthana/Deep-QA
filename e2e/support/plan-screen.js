'use strict';

const { expect } = require('@playwright/test');

const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');
const { openAt } = require('./navigation');

/**
 * แผนการสอน — #31, as a browser reaches it.
 *
 * The screen hangs one level under a ตอนเรียน's address, and — alone in this
 * menu — what it shows belongs to that Section too: two Sections of one
 * Offering hold two plans. The seed makes the grain readable from the rows
 * themselves (`composePlanWeek` bakes the section number and year into every
 * title), so a spec can assert "this list is ตอนเรียน 1's" by reading the
 * screen rather than by trusting the address.
 *
 * Cards are labelled `สัปดาห์ที่ <n> · <title>` — number AND title, because
 * the number is the person's own and two topics may legally share a week, so
 * the number alone cannot tell two rows apart.
 */

const API = /^\/api\/teaching\/sections\/\d+\/plan/;

const path = sectionId => `${DASHBOARD}/${sectionId}/teachingPlan`;

/** How a card names itself — the shape every locator here goes through. */
const cardLabel = week => `สัปดาห์ที่ ${week.week_no} · ${week.title}`;

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForPlan = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/**
 * Waits until what the answer carried is what the screen is showing — #171.
 *
 * `clos-screen.js`' `untilClosDrawn` says why this is here and what the two
 * clauses are for; measured with #170's fixture on 29 September 2569,
 * `headingsOnScreen` read `[]` on **ten opens out of ten**.
 *
 * The clause drawn from `data` is this Section's รหัสวิชา, and the count is the
 * weeks the answer carried — which is also what makes this screen's settle point
 * unable to see a *renamed* week, since the count does not move. The rows that
 * follow such a save assert the new label through a retrying matcher.
 */
async function untilPlanDrawn(page, response) {
  const answered = await response.json();
  await expect(page.getByRole('listitem').getByRole('heading')).toHaveCount(
    answered.weeks.length,
  );
  await expect(
    page.getByText(answered.section.subject_id, { exact: true }).first(),
  ).toBeVisible();
  return response;
}

/**
 * Goes to one Section's plan and hands back the read a row asserts on.
 *
 * The drawing is waited for only on an answer that succeeded: the refusal rows
 * open somebody else's ตอนเรียน and there is no plan on that screen to wait for.
 */
async function openPlan(page, sectionId) {
  return openAt(page, path(sectionId), async fresh => {
    const response = await waitForPlan(fresh);
    if (response.ok()) await untilPlanDrawn(fresh, response);
    return response;
  });
}

/** One week's card, found by the full label — number and title together. */
const weekCard = (page, week) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: cardLabel(week), exact: true }),
  });

/** The card headings in the order the rows are drawn — the whole plan, as read. */
const headingsOnScreen = page =>
  page.getByRole('listitem').getByRole('heading').allTextContents();

/** The week numbers on the screen, in drawn order. */
async function numbersOnScreen(page) {
  const headings = await headingsOnScreen(page);
  return headings.map(text => Number(text.trim().split(/\s+/)[1]));
}

/**
 * Fills the form that is open and presses บันทึก, handing back the write.
 * Only the fields given are touched, so an edit can change one thing.
 */
async function submitWeek(page, { week_no, title, description, remark }, method) {
  if (week_no !== undefined) {
    await page.getByLabel('สัปดาห์ที่', { exact: true }).fill(String(week_no));
  }
  if (title !== undefined) await page.getByLabel('หัวข้อ', { exact: true }).fill(title);
  if (description !== undefined) {
    await page.getByLabel('รายละเอียด', { exact: true }).fill(description);
  }
  if (remark !== undefined) await page.getByLabel('หมายเหตุ', { exact: true }).fill(remark);
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
async function removeWeek(page, week, { confirm = true } = {}) {
  await page.getByRole('button', { name: `ลบ${cardLabel(week)}`, exact: true }).click();

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
  // A refused delete (the in-use guard) answers 400 and reloads nothing, so
  // the wait is only collected on a 204.
  const reloaded = waitForPlan(page);
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
  cardLabel,
  waitForPlan,
  untilPlanDrawn,
  openPlan,
  mySectionIds,
  weekCard,
  headingsOnScreen,
  numbersOnScreen,
  submitWeek,
  removeWeek,
};
