'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { mySectionIds } = require('../support/enrolment-screen');
const { openClos, waitForClos } = require('../support/clos-screen');
const {
  API: BEHAVIORS_API,
  myClos,
  untilBehaviorsDrawn,
  submitBehavior,
} = require('../support/behaviors-screen');
const {
  API: ACHIEVEMENTS_API,
  untilCriteriaDrawn,
  submitCriterion,
} = require('../support/achievements-screen');
const {
  openActivities,
  waitForActivities,
  untilActivitiesDrawn,
} = require('../support/activities-screen');
const { PDF_BYTES, attach, evidenceLink } = require('../support/evidence-screen');
const {
  openRubrics,
  waitForList: waitForRubrics,
  criteriaLink,
} = require('../support/rubrics-screen');
const {
  untilListDrawn: untilRubricCriteriaDrawn,
  openEditor: openRubricCriterionEditor,
  save: saveRubricCriterion,
  startRemoval,
  confirmRemoval,
} = require('../support/rubric-criteria-screen');

/**
 * #266 — the list a **handler** reloads, across the jump #141 found.
 *
 * #140 proved that claim on the nine administration screens, where the control
 * that supersedes a handler's reload is the pager (or, since #210 closed that
 * way in, a filter or the import panel). The ten child screens of the same
 * family have no pager and no filter: what `load` asks for comes from
 * `useParams` alone, so the only thing that can rebuild it while a reload is
 * out is a move to **another address of the same route shape** — which #141
 * said could not be done and then measured that it can, with the history list
 * behind the back button.
 *
 * So the two halves of this claim were each proved in a file that holds the
 * other half's premise:
 *
 * - `140a` presses บันทึก and ลบ, holds the reload, and supersedes it with a
 *   control on the screen.
 * - `141a` jumps between two addresses of one route shape and holds the
 *   **effect's** read, which is a different claim about the same guard — and
 *   `57-pager.md:723` says so in its own words: *a new row above it does not
 *   prove it*.
 *
 * This file is the two put together: the handler's reload held, and the jump as
 * the thing that supersedes it.
 *
 * ## The four screens here, and the six that are elsewhere
 *
 * The jump needs two addresses of one route shape. On these four the parent
 * list offers a link to each of two siblings, so the second address comes from
 * the application — `141a`'s own population, re-measured here against today's
 * code rather than taken from its table (#141, criterion 2 of #266):
 *
 * | ใบรับ | screen | the parameter that moves |
 * |---|---|---|
 * | `22` | `RubricCriteria` | `rubricId` |
 * | `28` | `MeasurableBehaviors` | `cloId` |
 * | `29` | `AchievementCriteria` | `cloId` |
 * | `35` | `ActivityEvidence` | `activityId` |
 *
 * The other six take `sectionId` and nothing else, and their second address is
 * the one the dashboard does not list: that is `141b`'s asymmetric walk, and
 * `266b` holds their rows.
 *
 * ## How a row is built
 *
 * ```
 *   entry 0   the parent list, by its address          ← the only document load
 *   entry 1   sibling A, by the link the list draws
 *   entry 2   the parent list, by the link A draws
 *   entry 3   sibling B, by the link the list draws
 *             บันทึก or ลบ on B, its reload held back
 *             history.go(-2)                           ← one move, no commit
 * ```
 *
 * The write is **not** held — only the GET that follows it — so the handler
 * reaches `await drawing(...)` at once and the window the row needs is the two
 * seconds that read is held for. The jump is waited for by identity: the row
 * does not move until the reload has been **sent**, so a handler that reloads
 * nothing fails the row rather than passing it (`140a`'s rule, one family
 * along).
 *
 * Each row asserts the same three clauses as `141a`'s, in one `toEqual` so none
 * of them is the one left unreached on the run that proves another: the
 * document was never replaced, the address is the sibling the jump landed on,
 * and the heading — which is drawn from the **answer** — names that sibling
 * rather than the one left behind.
 *
 * What no row here asserts is the success sentence. `load` ends its `try` with
 * `return true` **outside** `isCurrent()`, so `reloaded` says *nothing refused
 * the read* and never *it drew* (#202); and #205 decided that a sentence
 * belongs to the person who pressed the button, wherever they have since moved
 * to. A row reading the banner would be asserting the opposite of a closed
 * ticket's answer.
 *
 * ## What each row writes, and what it puts back
 *
 * Every row arranges **its own** subject on sibling B rather than borrowing a
 * seeded one, and the save rows then edit that subject **unchanged** rather
 * than adding another: the suite shares one database and runs in order (#132),
 * and a row rewritten in place is a leftover a comparison by key cannot see
 * (#137), so the cheapest way not to leave one is to rewrite nothing the seed
 * wrote. Seven of the nine arrange through the API, which is a JSON body; the
 * two evidence rows arrange through the screen, because that shelf is filled by
 * an upload. What puts all of it back is `hold()`, over the whole file.
 */

/** Long enough for the sibling the jump lands on to be back and drawn first. */
const HELD_MS = 2_000;

/**
 * The render the held answer would cause. There is no settle point behind it —
 * waiting for the right sibling to be drawn is the thing under test — so this
 * is the one number in the file that decides anything, and it is held to that
 * by the mutants: with a guard removed the stale draw lands inside it.
 */
const SETTLE_MS = 250;

const sleep = ms => new Promise(done => setTimeout(done, ms));

/** What a row reads back off `window` to say the document was never replaced. */
const DOCUMENT = 'the one the router has been moving inside';

const isRead = answer => answer.request().method() === 'GET';

/** The link back up, which each of these screens draws in its own words. */
const upLink = (page, name) => page.getByRole('link', { name, exact: true }).first();

const UP_TO_CLOS = 'ผลการเรียนรู้รายวิชา';
const UP_TO_ACTIVITIES = 'กิจกรรมการเรียนรู้ในรายวิชา';
const UP_TO_RUBRICS = 'กลับไปหน้าข้อมูล Rubric กลาง';

const BEHAVIORS_HEADING = 'พฤติกรรมบ่งชี้ของ';
const ACHIEVEMENTS_HEADING = 'เกณฑ์การบรรลุผลของ';
const EVIDENCE_HEADING = 'หลักฐานการประเมินของ';
const RUBRIC_CRITERIA_HEADING = 'เกณฑ์การให้คะแนนของ Rubric';

/**
 * Every row writes, so the schema is remembered before the first one and put
 * back after the last — #132 and #134. Declared before any other hook that
 * writes, which is what `hold`'s own docblock asks for; the uploads the two
 * evidence rows file are cleared by `global-setup` on the next run, which is
 * where every other spec's are cleared too (#138).
 */
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

/**
 * The jump, built once for the rows that differ only in an address and a press.
 *
 * This is an instrument and not an assertion — it ends with the screen in the
 * state a row is about and reads nothing, so every claim stays in the row that
 * called it (#171). The difference from `141a`'s `heldAnswerLosesTheJump`, which
 * is the whole of why this file exists: there the held read is the **effect's**,
 * sent by sibling B's own arrival, and here B is drawn first and what is held is
 * the read a **handler** sends afterwards.
 */
async function heldReloadLosesTheJump(
  page,
  { anyChild, isFor, intoChild, untilDrawn, upToParent, arrange, press, landed, held },
) {
  await page.evaluate(mark => {
    window.__document = mark;
  }, DOCUMENT);

  const first = page.waitForResponse(answer => isFor(answer.url(), landed) && isRead(answer));
  await intoChild(landed);
  await untilDrawn(await first, landed);

  await upToParent();

  // B is drawn before anything is held: what this row is about is the read its
  // handler sends, not the read its arrival sends.
  const second = page.waitForResponse(answer => isFor(answer.url(), held) && isRead(answer));
  await intoChild(held);
  await untilDrawn(await second, held);

  // What a row's own act needs on B, done through the screen with nothing held:
  // the evidence rows' temporary file is the one caller, because this screen's
  // shelf is filled by an upload and not by a JSON body.
  if (arrange) await arrange();

  await page.route(anyChild, async (route, request) => {
    if (request.method() === 'GET' && isFor(request.url(), held)) await sleep(HELD_MS);
    try {
      await route.continue();
    } catch {
      // The row has already ended and closed the page.
    }
  });

  try {
    const reloadSent = page.waitForRequest(
      request => request.method() === 'GET' && isFor(request.url(), held),
    );
    const heldArrived = page.waitForResponse(
      answer => isFor(answer.url(), held) && isRead(answer),
    );
    const landedAgain = page.waitForResponse(
      answer => isFor(answer.url(), landed) && isRead(answer),
    );

    await press();
    await reloadSent;

    await page.evaluate(() => window.history.go(-2));

    await landedAgain;
    await heldArrived;
    await page.waitForTimeout(SETTLE_MS);
  } finally {
    await page.unroute(anyChild);
  }
}

// ── พฤติกรรมที่วัดผลได้ตาม CLO — ใบ `28` ────────────────────────────────────

const behaviorsOf = (sectionId, cloId) =>
  `${BACKEND_URL}/api/teaching/sections/${sectionId}/clos/${cloId}/behaviors`;

/**
 * A behaviour of this row's own, straight at the API.
 *
 * Created rather than borrowed from the seed so the row's own `finally` can
 * take it out again, and created **last** in its CLO so the removal frees the
 * highest `behavior_no` and the route has nothing to renumber.
 */
async function addBehavior(page, sectionId, cloId) {
  const answer = await page.request.post(behaviorsOf(sectionId, cloId), {
    data: {
      behavior_detail: 'พฤติกรรมของแถว #266',
      cognitive_level: 'apply',
      learning_activity: 'exam',
    },
  });
  expect(answer.status(), 'the row needs a behaviour of its own on sibling B').toBe(201);
  return (await answer.json()).behavior;
}

/**
 * The two CLOs a row jumps between, and the behaviours screen of each.
 *
 * Two CLOs of one Section, asserted rather than assumed: a row handed a world
 * with one CLO in it would hold nothing and still pass (#129).
 */
async function twoClos(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await mySectionIds(page);
  const clos = (await myClos(page, sectionId)).filter(clo => clo.clo_number);
  expect(clos.length).toBeGreaterThan(1);
  const [landed, held] = clos;
  return { sectionId, landed, held };
}

function behaviorsJump(page, sectionId, { landed, held }) {
  return {
    anyChild: url => BEHAVIORS_API.test(url.pathname),
    isFor: (url, clo) =>
      new URL(url).pathname ===
      `/api/teaching/sections/${sectionId}/clos/${clo.clo_id}/behaviors`,
    intoChild: clo =>
      page
        .getByRole('link', { name: `${BEHAVIORS_HEADING} ${clo.clo_number}`, exact: true })
        .click(),
    untilDrawn: response => untilBehaviorsDrawn(page, response),
    upToParent: async () => {
      const back = waitForClos(page);
      await upLink(page, UP_TO_CLOS).click();
      await back;
    },
    landed,
    held,
  };
}

/** The three clauses, read once, after the held answer has had its turn. */
async function readsTheSiblingItLandedOn(page, landed) {
  expect({
    document: await page.evaluate(() => window.__document),
    address: new URL(page.url()).pathname.match(/courseOutcomes\/(\d+)\/behaviors/)[1],
    heading: (
      await page.getByRole('heading', { name: new RegExp(`^${BEHAVIORS_HEADING} `) }).innerText()
    ).trim(),
  }).toEqual({
    document: DOCUMENT,
    address: String(landed.clo_id),
    heading: `${BEHAVIORS_HEADING} ${landed.clo_number}`,
  });
}

test('พฤติกรรมที่วัดผลได้ตาม CLO (MeasurableBehaviors.js): the list บันทึก reloads does not land on the CLO the jump went to', async ({
  page,
}) => {
  // `save` closes the form before it reloads, so the jump is made from a screen
  // with its list on it.
  const { sectionId, landed, held } = await twoClos(page);
  const mine = await addBehavior(page, sectionId, held.clo_id);

  await openClos(page, sectionId);

  await heldReloadLosesTheJump(page, {
    ...behaviorsJump(page, sectionId, { landed, held }),
    press: async () => {
      await page
        .getByRole('button', { name: `แก้ไขข้อ ${mine.behavior_no}`, exact: true })
        .click();
      // Saved unchanged: what is on trial is the reload, not the draft.
      await submitBehavior(page, {}, 'PUT');
    },
  });

  await readsTheSiblingItLandedOn(page, landed);
});

test('พฤติกรรมที่วัดผลได้ตาม CLO (MeasurableBehaviors.js): the list ลบ reloads does not land on the CLO the jump went to', async ({
  page,
}) => {
  // `remove` closes its confirmation before it reloads.
  const { sectionId, landed, held } = await twoClos(page);
  const mine = await addBehavior(page, sectionId, held.clo_id);

  await openClos(page, sectionId);

  await heldReloadLosesTheJump(page, {
    ...behaviorsJump(page, sectionId, { landed, held }),
    press: async () => {
      await page.getByRole('button', { name: `ลบข้อ ${mine.behavior_no}`, exact: true }).click();
      await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    },
  });

  await readsTheSiblingItLandedOn(page, landed);
});

// ── เกณฑ์การบรรลุผลตาม CLO — ใบ `29` ───────────────────────────────────────
//
// The same screen one grain over: `AchievementCriteria` is `MeasurableBehaviors`
// with another noun, down to `แก้ไขข้อ N` and `ลบข้อ N`, so the two sections
// below differ only in an API path and a heading. Each is its own claim all the
// same — the code is copied and not shared, so a mutant in one page file cannot
// kill a row of the other (#83, #191).

const achievementsOf = (sectionId, cloId) =>
  `${BACKEND_URL}/api/teaching/sections/${sectionId}/clos/${cloId}/criteria`;

/** A criterion of this row's own, created last in its CLO for `addBehavior`'s reason. */
async function addAchievement(page, sectionId, cloId) {
  const answer = await page.request.post(achievementsOf(sectionId, cloId), {
    data: {
      achievement_level: 'ดี',
      criteria_detail: 'เกณฑ์ของแถว #266',
      criteria_description: 'สร้างโดยแถวของ #266 และคืนด้วย hold()',
    },
  });
  expect(answer.status(), 'the row needs a criterion of its own on sibling B').toBe(201);
  return (await answer.json()).criterion;
}

function achievementsJump(page, sectionId, { landed, held }) {
  return {
    anyChild: url => ACHIEVEMENTS_API.test(url.pathname),
    isFor: (url, clo) =>
      new URL(url).pathname ===
      `/api/teaching/sections/${sectionId}/clos/${clo.clo_id}/criteria`,
    intoChild: clo =>
      page
        .getByRole('link', { name: `${ACHIEVEMENTS_HEADING} ${clo.clo_number}`, exact: true })
        .click(),
    untilDrawn: response => untilCriteriaDrawn(page, response),
    upToParent: async () => {
      const back = waitForClos(page);
      await upLink(page, UP_TO_CLOS).click();
      await back;
    },
    landed,
    held,
  };
}

async function readsTheCloItLandedOn(page, landed) {
  expect({
    document: await page.evaluate(() => window.__document),
    address: new URL(page.url()).pathname.match(/courseOutcomes\/(\d+)\/criteria/)[1],
    heading: (
      await page.getByRole('heading', { name: new RegExp(`^${ACHIEVEMENTS_HEADING} `) }).innerText()
    ).trim(),
  }).toEqual({
    document: DOCUMENT,
    address: String(landed.clo_id),
    heading: `${ACHIEVEMENTS_HEADING} ${landed.clo_number}`,
  });
}

test('เกณฑ์การบรรลุผลตาม CLO (AchievementCriteria.js): the list บันทึก reloads does not land on the CLO the jump went to', async ({
  page,
}) => {
  const { sectionId, landed, held } = await twoClos(page);
  const mine = await addAchievement(page, sectionId, held.clo_id);

  await openClos(page, sectionId);

  await heldReloadLosesTheJump(page, {
    ...achievementsJump(page, sectionId, { landed, held }),
    press: async () => {
      await page
        .getByRole('button', { name: `แก้ไขข้อ ${mine.criteria_no}`, exact: true })
        .click();
      await submitCriterion(page, {}, 'PUT');
    },
  });

  await readsTheCloItLandedOn(page, landed);
});

test('เกณฑ์การบรรลุผลตาม CLO (AchievementCriteria.js): the list ลบ reloads does not land on the CLO the jump went to', async ({
  page,
}) => {
  const { sectionId, landed, held } = await twoClos(page);
  const mine = await addAchievement(page, sectionId, held.clo_id);

  await openClos(page, sectionId);

  await heldReloadLosesTheJump(page, {
    ...achievementsJump(page, sectionId, { landed, held }),
    press: async () => {
      await page.getByRole('button', { name: `ลบข้อ ${mine.criteria_no}`, exact: true }).click();
      await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    },
  });

  await readsTheCloItLandedOn(page, landed);
});

// ── หลักฐานการประเมินของกิจกรรม — ใบ `35` ──────────────────────────────────

/**
 * The two Activities a row jumps between, read off the list's own links.
 *
 * `141a`'s reading, because the id is in the address each link carries and the
 * name is in its label — which is what the screen draws its heading from, so
 * two Activities sharing a name would make the assertion pass whichever answer
 * had been drawn.
 */
async function twoActivities(page) {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await mySectionIds(page);

  await openActivities(page, sectionId);

  const links = page.locator('a[href$="/evidence"]');
  const howMany = await links.count();
  expect(howMany).toBeGreaterThan(1);
  const activities = [];
  for (let index = 0; index < howMany; index += 1) {
    const href = await links.nth(index).getAttribute('href');
    const label = await links.nth(index).getAttribute('aria-label');
    activities.push({
      id: href.match(/learningActivities\/(\d+)\/evidence/)[1],
      name: label.slice(EVIDENCE_HEADING.length).trim(),
    });
  }
  const [landed, held] = activities;
  expect(landed.name).not.toBe(held.name);
  return { sectionId, landed, held };
}

function evidenceJump(page, sectionId, { landed, held }) {
  return {
    anyChild: url =>
      /^\/api\/teaching\/sections\/\d+\/activities\/\d+\/evidence$/.test(url.pathname),
    isFor: (url, activity) =>
      new URL(url).pathname ===
      `/api/teaching/sections/${sectionId}/activities/${activity.id}/evidence`,
    intoChild: activity => evidenceLink(page, activity.name).click(),
    // This screen has no `until…Drawn` helper, because no other row of #35 needs
    // one: nothing it asserts is read off a list this screen draws. The settle
    // point is the heading carrying what the answer carried, which is the same
    // clause the other three wait for one level down.
    untilDrawn: async (unusedResponse, which) => {
      await expect(
        page.getByRole('heading', { name: `${EVIDENCE_HEADING} ${which.name}` }),
      ).toBeVisible();
    },
    upToParent: async () => {
      const back = waitForActivities(page);
      await upLink(page, UP_TO_ACTIVITIES).click();
      await untilActivitiesDrawn(page, await back);
    },
    landed,
    held,
  };
}

async function readsTheActivityItLandedOn(page, landed) {
  expect({
    document: await page.evaluate(() => window.__document),
    address: new URL(page.url()).pathname.match(/learningActivities\/(\d+)\/evidence/)[1],
    heading: (
      await page.getByRole('heading', { name: new RegExp(`^${EVIDENCE_HEADING} `) }).innerText()
    ).trim(),
  }).toEqual({
    document: DOCUMENT,
    address: String(landed.id),
    heading: `${EVIDENCE_HEADING} ${landed.name}`,
  });
}

/** A file of this row's own, filed through the screen it is on. */
const fileOfThisRow = (page, name) =>
  attach(page, { bytes: PDF_BYTES, name, type: 'poor', description: 'แนบโดยแถวของ #266' });

/**
 * The same upload, waited for — which the arrangement needs and the press must
 * not have.
 *
 * `attach` returns at the click, so the save's own reload may still be unsent
 * when the row installs its hold: `reloadSent` would then collect **that**
 * read and the jump would be made over the arrangement instead of over the
 * removal. Waiting for the file to be drawn is waiting for that reload to have
 * landed. It is a retrying positive read of a row that is on its way in, not a
 * negative that cannot fail (#50), and it is deliberately absent from the save
 * row, where the same wait would stand in front of the press and move it (#209).
 */
async function filedOnTheShelf(page, name) {
  await fileOfThisRow(page, name);
  await expect(page.getByLabel(`หลักฐาน ${name}`, { exact: true })).toHaveCount(1);
}

test('หลักฐานการประเมินของกิจกรรม (ActivityEvidence.js): the shelf แนบหลักฐาน reloads does not land on the Activity the jump went to', async ({
  page,
}) => {
  // `save`, reached by the upload: it closes the panel before it reloads.
  const { sectionId, landed, held } = await twoActivities(page);

  await heldReloadLosesTheJump(page, {
    ...evidenceJump(page, sectionId, { landed, held }),
    press: () => fileOfThisRow(page, 'แนบของแถว266.pdf'),
  });

  await readsTheActivityItLandedOn(page, landed);
});

test('หลักฐานการประเมินของกิจกรรม (ActivityEvidence.js): the shelf ลบ reloads does not land on the Activity the jump went to', async ({
  page,
}) => {
  // `remove` closes its confirmation before it reloads. The file it removes is
  // this row's own, filed on B with nothing held: a seeded one would be a row
  // another file's claims are about.
  const { sectionId, landed, held } = await twoActivities(page);
  const name = 'ลบของแถว266.pdf';

  await heldReloadLosesTheJump(page, {
    ...evidenceJump(page, sectionId, { landed, held }),
    arrange: () => filedOnTheShelf(page, name),
    press: async () => {
      await page.getByLabel(`ลบหลักฐาน ${name}`).click();
      await page.getByRole('button', { name: 'ลบ', exact: true }).click();
    },
  });

  await readsTheActivityItLandedOn(page, landed);
});

// ── เกณฑ์การให้คะแนนของ Rubric กลาง — ใบ `22` ─────────────────────────────
//
// Three sites rather than two: `RubricCriteria` reloads from the **refusal** of
// แก้ไข as well as from บันทึก and from ลบ, which is `140a`'s own third row on
// each of the screens that has one.

/** Two Rubrics, read off the table the way `141a` reads them. */
async function twoRubrics(page) {
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);

  const codes = await page.locator('table tbody tr td:first-child').allTextContents();
  expect(codes.length).toBeGreaterThan(1);
  const rubrics = [];
  for (const code of codes.slice(0, 2).map(cell => cell.trim())) {
    const href = await criteriaLink(page, code).getAttribute('href');
    rubrics.push({ code, id: href.match(/rubrics\/(\d+)\/criteria/)[1] });
  }
  const [landed, held] = rubrics;
  return { landed, held };
}

/** A criterion of this row's own on one Rubric, straight at the API. */
async function addRubricCriterion(page, rubricId, nameTh) {
  const answer = await page.request.post(`${BACKEND_URL}/api/rubrics/${rubricId}/criteria`, {
    data: {
      criteria_name_th: nameTh,
      criteria_name_en: 'Criterion of row 266',
      weight: 10,
      display_order: 99,
      level_4_description: 'ระดับ 4 ของแถว #266',
      level_3_description: 'ระดับ 3 ของแถว #266',
      level_2_description: 'ระดับ 2 ของแถว #266',
      level_1_description: 'ระดับ 1 ของแถว #266',
    },
  });
  expect(answer.status(), 'the row needs a criterion of its own on Rubric B').toBe(201);
  return (await answer.json()).criterion;
}

function rubricCriteriaJump(page, { landed, held }) {
  return {
    anyChild: url => /^\/api\/rubrics\/\d+\/criteria$/.test(url.pathname),
    isFor: (url, rubric) => new URL(url).pathname === `/api/rubrics/${rubric.id}/criteria`,
    intoChild: rubric => criteriaLink(page, rubric.code).click(),
    untilDrawn: response => untilRubricCriteriaDrawn(page, response),
    upToParent: async () => {
      const back = waitForRubrics(page);
      await upLink(page, UP_TO_RUBRICS).click();
      await back;
    },
    landed,
    held,
  };
}

async function readsTheRubricItLandedOn(page, landed) {
  expect({
    document: await page.evaluate(() => window.__document),
    address: new URL(page.url()).pathname.match(/rubrics\/(\d+)\/criteria/)[1],
    heading: (
      await page
        .getByRole('heading', { name: new RegExp(`^${RUBRIC_CRITERIA_HEADING} `) })
        .innerText()
    ).trim(),
  }).toEqual({
    document: DOCUMENT,
    address: String(landed.id),
    heading: `${RUBRIC_CRITERIA_HEADING} ${landed.code}`,
  });
}

test('เกณฑ์การให้คะแนนของ Rubric (RubricCriteria.js): the list a refused แก้ไข reloads does not land on the Rubric the jump went to', async ({
  page,
}) => {
  // `openEditor`'s `catch`: the form never opened, so the screen was never
  // taken. The one row of this file that writes nothing at all.
  const { landed, held } = await twoRubrics(page);
  const mine = await addRubricCriterion(page, held.id, 'เกณฑ์ที่แก้ไขถูกปฏิเสธ #266');

  await page.route(
    url => new RegExp(`^/api/rubrics/${held.id}/criteria/${mine.id}$`).test(url.pathname),
    (route, request) =>
      request.method() === 'GET'
        ? route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'ไม่พบเกณฑ์นี้แล้ว (แถวของ #266)' }),
          })
        : route.continue(),
  );

  await heldReloadLosesTheJump(page, {
    ...rubricCriteriaJump(page, { landed, held }),
    press: () =>
      page
        .locator('table tbody tr')
        .filter({ has: page.locator('td:first-child', { hasText: mine.criteria_name_th }) })
        .getByRole('button', { name: 'แก้ไข' })
        .click(),
  });

  await readsTheRubricItLandedOn(page, landed);
});

test('เกณฑ์การให้คะแนนของ Rubric (RubricCriteria.js): the list บันทึก reloads does not land on the Rubric the jump went to', async ({
  page,
}) => {
  // `save` closes the form before it reloads — and since #242 it asks a second
  // question of its own before it says anything. What is on trial here is the
  // reload, which both of those run after.
  const { landed, held } = await twoRubrics(page);
  const mine = await addRubricCriterion(page, held.id, 'เกณฑ์ที่บันทึกไม่เปลี่ยนค่า #266');

  await heldReloadLosesTheJump(page, {
    ...rubricCriteriaJump(page, { landed, held }),
    press: async () => {
      await openRubricCriterionEditor(page, mine.criteria_name_th);
      await saveRubricCriterion(page);
    },
  });

  await readsTheRubricItLandedOn(page, landed);
});

test('เกณฑ์การให้คะแนนของ Rubric (RubricCriteria.js): the list ลบ reloads does not land on the Rubric the jump went to', async ({
  page,
}) => {
  // `confirmRemoval` closes the dialog before it reloads.
  const { landed, held } = await twoRubrics(page);
  const mine = await addRubricCriterion(page, held.id, 'เกณฑ์ที่ถูกลบ #266');

  await heldReloadLosesTheJump(page, {
    ...rubricCriteriaJump(page, { landed, held }),
    press: async () => {
      await startRemoval(page, mine.criteria_name_th);
      await confirmRemoval(page);
    },
  });

  await readsTheRubricItLandedOn(page, landed);
});
