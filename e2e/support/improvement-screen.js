'use strict';

const { BACKEND_URL } = require('./env');
const { DASHBOARD } = require('./teaching-screen');
const { mySectionIds } = require('./enrolment-screen');
const { myClos } = require('./behaviors-screen');

/**
 * แผนการปรับปรุงอย่างต่อเนื่อง — #41, as a browser reaches it.
 *
 * One level under a ตอนเรียน's address, like #40's report: the Section proves
 * the caller may be here and the record belongs to the Offering behind it
 * (ADR-0003, ADR-0004). So the helpers take a section id and never a year —
 * except `myEarlierSection`, which exists because this is the first screen
 * whose rows need a Section of a year the dashboard does not list.
 *
 * The four sections of the form are `<section>` elements labelled by their
 * heading, and the editors, the buttons and the confirmation are all named
 * with that label — `เขียนการสะท้อนคิด`, `แก้ไขการสะท้อนคิด`, `ลบการสะท้อนคิด`.
 * That is the only stable handle they carry: there is one of each per screen,
 * their text is free prose two people edit, and no id reaches the page.
 */

const API = /^\/api\/teaching\/sections\/\d+\/improvement-plan/;

const path = sectionId => `${DASHBOARD}/${sectionId}/ContinuousImprove`;

/** docs/02's four values, with the words the screen puts on them. */
const LABELS = {
  SUMMARY: 'สรุปผลการดำเนินงาน',
  REFLECTION: 'การสะท้อนคิด',
  IMPROVEMENT: 'การปรับปรุงจากรอบก่อนหน้า',
  NEXT_PLAN: 'แนวทางพัฒนาครั้งถัดไป',
};

/** Waits for the screen's own read, whatever the answer turns out to be. */
const waitForPlan = page =>
  page.waitForResponse(
    answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );

/** Goes to one ตอนเรียน's plan and hands back the read a row asserts on. */
async function openPlan(page, sectionId) {
  const [response] = await Promise.all([waitForPlan(page), page.goto(path(sectionId))]);
  return response;
}

/**
 * A ตอนเรียน of an earlier ปีการศึกษา that this account also teaches.
 *
 * #24's dashboard lists the current term only — that is its rule and not an
 * oversight — so `mySectionIds` cannot answer this, and a browser test has no
 * pool to ask instead. The register is therefore asked one id at a time:
 * `/api/teaching/sections/:id` answers 200 for a Section this account teaches
 * and 404 for every other one, which is the same question the screen asks.
 *
 * The upper bound is a fact about the seed — three Sections in total, so a
 * sweep of a dozen ids is generous — and the throw is deliberate: a row that
 * silently got `undefined` here would go on to assert about the current year
 * and pass while proving nothing about the year before it.
 */
async function myEarlierSection(page, sectionId) {
  const mine = await page.request.get(`${BACKEND_URL}/api/teaching/sections/${sectionId}`);
  const { section } = await mine.json();

  for (let candidate = 1; candidate <= 12; candidate += 1) {
    if (candidate === Number(sectionId)) continue;
    const answer = await page.request.get(`${BACKEND_URL}/api/teaching/sections/${candidate}`);
    if (answer.status() !== 200) continue;
    const other = (await answer.json()).section;
    if (
      other.subject_id === section.subject_id &&
      other.academic_year < section.academic_year
    ) {
      return other;
    }
  }
  throw new Error('the seed is supposed to teach this account an earlier year of this subject');
}

/** One of the four sections of the form, found by its heading. */
const formSection = (page, type) => page.getByRole('region', { name: LABELS[type], exact: true });

/** The panel of an earlier year's entries — absent, by design, when there is none. */
const referencePanel = page => page.getByRole('complementary');

/**
 * Chooses which ผลการเรียนรู้ the four sections are about.
 *
 * By the number, which is the only part of an option a row can name: the rest
 * of the label is the outcome's prose. `selectOption` takes a literal label or
 * a value and not a pattern, so the option is found first and its value is
 * what gets selected — the id, which no row has to know.
 */
async function chooseClo(page, cloNumber) {
  const picker = page.getByLabel('ผลการเรียนรู้ที่กำลังเขียนถึง', { exact: true });
  const option = picker.locator('option', { hasText: new RegExp(`^${cloNumber} ·`) });
  await picker.selectOption(await option.getAttribute('value'));
}

/**
 * Opens one section's editor, types, and presses บันทึก.
 *
 * Which button opens it depends on whether anything is written there —
 * เขียน… when the section is empty and the pencil when it is not — and a row
 * that had to know which would be asserting about the state it is setting up.
 * Both are tried, in the order a person would find them.
 */
async function writeSection(page, type, text) {
  const region = formSection(page, type);
  const start = region.getByRole('button', { name: `เขียน${LABELS[type]}`, exact: true });
  if (await start.count()) await start.click();
  else await region.getByRole('button', { name: `แก้ไข${LABELS[type]}`, exact: true }).click();

  await region.getByLabel(LABELS[type], { exact: true }).fill(text);

  // The reload wait is registered before the click, for `29a`'s reason: the
  // screen re-reads as soon as the write answers, and a row asserting while
  // that read is in flight would be reading the screen mid-reload.
  const reloaded = waitForPlan(page);
  const [response] = await Promise.all([
    page.waitForResponse(
      answer => API.test(new URL(answer.url()).pathname) && answer.request().method() === 'POST',
    ),
    region.getByRole('button', { name: 'บันทึก', exact: true }).click(),
  ]);
  if (response.status() === 200) await reloaded;
  else reloaded.catch(() => {});
  return response;
}

/**
 * Presses the bin on one section and answers the dialog.
 *
 * Confirming hands back the write. Cancelling hands back the DELETEs sent
 * while the dialog was up — `[]` when the cancel did its job, for `29a`'s
 * reason: the text outlives a real removal for the length of a round trip, so
 * its presence proves nothing.
 */
async function removeSection(page, type, { confirm = true } = {}) {
  await page
    .getByRole('button', { name: `ลบ${LABELS[type]}`, exact: true })
    .click();

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

/**
 * Every entry of one ตอนเรียน's plan, over the context's own request.
 *
 * A row that has just written through the screen and wants to know what is in
 * the record — asked the way `mySectionIds` asks, so that nothing here is
 * racing a navigation for a response body.
 */
async function planOf(page, sectionId) {
  const answer = await page.request.get(
    `${BACKEND_URL}/api/teaching/sections/${sectionId}/improvement-plan`,
  );
  if (answer.status() !== 200) {
    throw new Error('could not read the improvement plan: ' + answer.status());
  }
  return answer.json();
}

/** Writes one entry without the screen — a row's setup, not its subject. */
async function seedEntry(page, sectionId, draft) {
  const answer = await page.request.post(
    `${BACKEND_URL}/api/teaching/sections/${sectionId}/improvement-plan/entries`,
    { data: draft },
  );
  if (answer.status() !== 200) {
    throw new Error('could not write the entry: ' + answer.status());
  }
  return (await answer.json()).entry;
}

/** Takes one entry back out again — the counterpart of `seedEntry`. */
async function clearEntry(page, sectionId, entryId) {
  await page.request.delete(
    `${BACKEND_URL}/api/teaching/sections/${sectionId}/improvement-plan/entries/${entryId}`,
  );
}

module.exports = {
  API,
  LABELS,
  path,
  waitForPlan,
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
};
