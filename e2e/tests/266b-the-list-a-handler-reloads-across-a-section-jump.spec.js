'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { openAt } = require('../support/navigation');
const { mySectionIds } = require('../support/enrolment-screen');
const {
  DOCUMENT,
  LAST_YEAR,
  header,
  heldReloadLosesTheSectionJump,
  isRead,
  markDocument,
  yearOf,
  yearsDrawn,
} = require('../support/section-jump');
const { DASHBOARD } = require('../support/teaching-screen');

const { createGroup } = require('../support/groups-screen');
const { submitClo } = require('../support/clos-screen');
const { submitWeek } = require('../support/plan-screen');
const {
  LABELS,
  chooseClo,
  formSection,
  myClos,
  seedEntry,
} = require('../support/improvement-screen');

/**
 * #266 — the other six screens of the #140 family, across the section jump.
 *
 * `266a` holds the four child screens whose parent draws a link to every
 * sibling, so a browser can walk from one address of the route shape to
 * another with two presses. These six take `sectionId` straight out of the
 * address, and `GET /api/teaching/sections` filters the dashboard to the
 * current term, so the application lists **one** of `teacher.one`'s two
 * Sections and there is no second address on any of these screens to press.
 *
 * `141b` measured on 5 October 2569 that only one of the two addresses has to
 * be produced by the application: the first can come from the address bar, and
 * `GET /api/teaching/sections/:id` is deliberately not term-restricted. The
 * walk is therefore asymmetric, and it is `support/section-jump.js`:
 *
 * ```
 *   entry 0   last year's Section, this screen, by its address   ← the one document load
 *   entry 1   up to the dashboard, by the side menu
 *   entry 2   this year's Section, by the card the list draws
 *   entry 3   this screen of this year's Section
 *             a write, whose reload is held back
 *             history.go(-3)                                     ← one move, no commit
 * ```
 *
 * ## What this file claims that `141b` does not
 *
 * `141b` holds the **effect's** read: `load`'s own `isCurrent()`, which the
 * screen's loader passes itself. This holds the **handler's** reload — the
 * `drawing(() => onScreen.current === drawing)` a save or a removal ends with,
 * whose flag is a different claim about a different ref. That is why
 * `docs/acceptance/28-measurable-behaviors.md` kept its #140 row at ☐ while
 * `141a`'s rows were green, and said so in prose on 2 October 2569: *a new row
 * above it does not prove it* (#179).
 *
 * ## The population, measured rather than assumed
 *
 * Counted on 4 November 2569 by `const drawing = onScreen.current` in each page
 * file, which is what a handler writes when it takes the loader that is on the
 * screen. Twelve sites on six screens, two each — not one, which is what the
 * hand count had said: every one of the six holds a second copy, and on two of
 * them it is the import box rather than a removal.
 *
 * | ใบ | จอ | จุดที่ handler สั่งโหลดใหม่ | แถวที่นี่ |
 * |---|---|---|---|
 * | `26` | `StudentGroups` | `after()` ตัวเดียวที่ทุกการเขียนเรียก (สร้าง · เปลี่ยนชื่อ · ลบ · ย้ายสมาชิก) · และ `ImportPanel` | สร้างกลุ่ม |
 * | `27` | `CourseOutcomes` | `save` · `remove` | บันทึก · ลบ |
 * | `30` | `GradingWeights` | `save` · `ImportPanel` (`remove` ของจอนี้แก้แบบร่าง ไม่ส่งคำขอ) | บันทึก |
 * | `31` | `TeachingPlan` | `save` · `remove` | บันทึก · ลบ |
 * | `32` | `LearningActivities` | `save` · `remove` | บันทึก · ลบ |
 * | `41` | `ContinuousImprovement` | `save` · `remove` | บันทึก · ลบ |
 *
 * On `StudentGroups` the first site is a helper every write calls, so one row
 * reaches that copy whole: what a grep counts is copies and what a mutant can
 * tell apart is sites (#97, #244), and a mutant there cannot tell the create
 * from the rename, the removal or a member move. The two `ImportPanel` sites
 * are a different way in — a file — and were the two of the twelve that ended
 * *ยังไม่ได้ทดสอบ*, with the date, the reason and the tracker in each sheet's
 * own cell rather than in prose here (#119).
 *
 * 5 November 2569 (#268) — those two have their rows, in
 * `e2e/tests/268-the-list-an-import-reloads-across-a-section-jump.spec.js`,
 * with `mutation/268-the-list-an-import-reloads-across-a-section-jump.py`
 * breaking each one. The reason they waited was the fixture, and it was
 * measured rather than argued (#141): both routes answer **201** to a file
 * built from what the Section already holds. The walk below moved to
 * `support/section-jump.js` the same day, `268` being the second file to need
 * it (#171) — a pure move, and what says the rows still go through it is the
 * mutants and not the rows staying green (#203).
 *
 * ## What this file does not say
 *
 * - It walks with `history.go`, not with the pressing of the history list
 *   behind the back button, which stays a hand-walked row — `141a` and `141b`
 *   say the same of their own.
 * - The window is a `page.route` held two seconds, not a real network, so
 *   *anything written for timing must not be able to decide anything* (#52):
 *   each row reads the screen once, at a settle point, and compares three
 *   clauses in one `toEqual`.
 * - It asserts no success sentence. `load` ends its `try` with `return true`
 *   whatever `isCurrent()` said, so `reloaded` means *nothing refused the read*
 *   and never *it drew* (#202), and the sentence belongs to the person who
 *   pressed the button rather than to this screen (#205).
 * - Ten sites are ten copies of one guard, not one guard: each mutant in
 *   `mutation/266-the-list-a-handler-reloads-across-a-section-jump.py` breaks a
 *   single call in a single page file, so no row can be killed by another row's
 *   mutant, and what each row adds is that **its own** way in arrives there
 *   (#191).
 */

/** A name no seed row carries, so a press can be aimed at the row this test made. */
const MINE = 'แถว #266';

/** One screen's own read, over the context's request — a row's setup, not its subject. */
async function read(page, sectionId, api) {
  const answer = await page.request.get(`${BACKEND_URL}/api/teaching/sections/${sectionId}${api}`);
  expect(answer.status(), `the screen's own read of section ${sectionId}`).toBe(200);
  return answer.json();
}

/** Writes one record without the screen, so a removal row has something to remove. */
async function seed(page, sectionId, api, draft) {
  const answer = await page.request.post(
    `${BACKEND_URL}/api/teaching/sections/${sectionId}${api}`,
    { data: draft },
  );
  expect([200, 201], 'the record the removal row removes').toContain(answer.status());
  return answer.json();
}

/** Presses one bin and answers the confirmation, without waiting for the reload. */
async function bin(page, label, waitForWrite) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const [answer] = await Promise.all([
    waitForWrite,
    page.getByRole('button', { name: 'ลบ', exact: true }).click(),
  ]);
  return answer;
}

/** The write this row's reload follows, by method and by path, never by a clock. */
const written = (page, sectionId, api, method) =>
  page.waitForResponse(
    answer =>
      new RegExp(`^/api/teaching/sections/${sectionId}${api}(/|$)`).test(
        new URL(answer.url()).pathname,
      ) && answer.request().method() === method,
  );

/**
 * The ten sites, by the screen each one is on and the read it makes.
 *
 * `api` is the suffix under `/api/teaching/sections/:id`, matched **whole** for
 * the held read — *ask which document asked, by identity and never by a clock*
 * (#160) — so a write to `${api}/:id` is not held, and neither is the import's
 * own POST.
 *
 * `arrange` runs before the walk and writes through the API, not through the
 * screen: a record made by pressing the screen's own form would be a second
 * write whose own reload this row would then have to tell from the one it is
 * about. `press` returns when the **write** has answered and never when the
 * reload has been drawn — every support helper that presses these buttons waits
 * for the reload too, which is right for every other row in the suite and is
 * exactly what this file must not do.
 */
const SCREENS = [
  {
    sheet: '26',
    name: 'กลุ่มงานนักศึกษา',
    page: 'StudentGroups',
    route: '/studentGroups',
    api: '/groups',
    cases: [
      {
        what: 'สร้างกลุ่ม',
        // `after()`, which every write on this screen goes through: a mutant
        // here cannot tell the create from the rename, the removal or a member
        // move, so one row reaches the copy whole (#191, #244).
        press: async (page, sectionId) => {
          const answer = await createGroup(page, sectionId, MINE);
          expect(answer.status(), 'the write the reload follows').toBe(201);
        },
      },
    ],
  },
  {
    sheet: '27',
    name: 'ผลการเรียนรู้รายวิชา',
    page: 'CourseOutcomes',
    route: '/courseOutcomes',
    api: '/clos',
    cases: [
      {
        what: 'บันทึก',
        arrange: async (page, sectionId) => {
          const { clos } = await read(page, sectionId, '/clos');
          expect(clos.length, 'a CLO of this Section to save unchanged').toBeGreaterThan(0);
          return clos[0];
        },
        // Saved unchanged: what is on trial is the reload, not the draft.
        press: async (page, sectionId, clo) => {
          await page.getByRole('button', { name: `แก้ไข ${clo.clo_number}`, exact: true }).click();
          const answer = await submitClo(page, {}, 'PUT');
          expect(answer.status(), 'the write the reload follows').toBe(200);
        },
      },
      {
        what: 'ลบ',
        arrange: async (page, sectionId) => {
          const { clo } = await seed(page, sectionId, '/clos', {
            clo_number: 'CLO-266',
            clo_detail: MINE,
          });
          return clo;
        },
        press: async (page, sectionId, clo) => {
          const answer = await bin(
            page,
            `ลบ ${clo.clo_number}`,
            written(page, sectionId, '/clos', 'DELETE'),
          );
          expect(answer.status(), 'the write the reload follows').toBe(204);
        },
      },
    ],
  },
  {
    sheet: '30',
    name: 'สัดส่วนคะแนน',
    page: 'GradingWeights',
    route: '/gradingWeights',
    api: '/weights',
    cases: [
      {
        what: 'บันทึก',
        arrange: async (page, sectionId) => {
          // The answer's own key, read out of `backend/routes/weights.js:153`
          // rather than out of a memory of what the screen calls it.
          const { weights } = await read(page, sectionId, '/weights');
          expect(weights.length, 'a scheme of this Section to save unchanged').toBeGreaterThan(0);
          return weights;
        },
        press: async (page, sectionId) => {
          const [answer] = await Promise.all([
            written(page, sectionId, '/weights', 'PUT'),
            page.getByRole('button', { name: 'บันทึก', exact: true }).click(),
          ]);
          expect(answer.status(), 'the write the reload follows').toBe(200);
        },
      },
    ],
  },
  {
    sheet: '31',
    name: 'แผนการสอน',
    page: 'TeachingPlan',
    route: '/teachingPlan',
    api: '/plan',
    cases: [
      {
        what: 'บันทึก',
        arrange: async (page, sectionId) => {
          const { weeks } = await read(page, sectionId, '/plan');
          expect(weeks.length, 'a week of this Section to save unchanged').toBeGreaterThan(0);
          return weeks[0];
        },
        press: async (page, sectionId, week) => {
          await page
            .getByRole('button', {
              name: `แก้ไขสัปดาห์ที่ ${week.week_no} · ${week.title}`,
              exact: true,
            })
            .click();
          const answer = await submitWeek(page, {}, 'PUT');
          expect(answer.status(), 'the write the reload follows').toBe(200);
        },
      },
      {
        what: 'ลบ',
        arrange: async (page, sectionId) => {
          // A number above every week the seed holds, so the insert cannot
          // collide with one and the row does not depend on which weeks exist.
          const { weeks } = await read(page, sectionId, '/plan');
          const free = Math.max(0, ...weeks.map(one => one.week_no)) + 1;
          const { week } = await seed(page, sectionId, '/plan', { week_no: free, title: MINE });
          return week;
        },
        press: async (page, sectionId, week) => {
          const answer = await bin(
            page,
            `ลบสัปดาห์ที่ ${week.week_no} · ${week.title}`,
            written(page, sectionId, '/plan', 'DELETE'),
          );
          expect(answer.status(), 'the write the reload follows').toBe(204);
        },
      },
    ],
  },
  {
    sheet: '32',
    name: 'กิจกรรมการเรียนรู้',
    page: 'LearningActivities',
    route: '/learningActivities',
    api: '/activities',
    cases: [
      {
        what: 'บันทึก',
        arrange: async (page, sectionId) => {
          const { activities } = await read(page, sectionId, '/activities');
          expect(activities.length, 'an activity to save unchanged').toBeGreaterThan(0);
          return activities[0];
        },
        press: async (page, sectionId, activity) => {
          await page
            .getByRole('button', {
              name: `แก้ไขกิจกรรม ${activity.activity_name}`,
              exact: true,
            })
            .click();
          const [answer] = await Promise.all([
            written(page, sectionId, '/activities', 'PUT'),
            page.getByRole('button', { name: 'บันทึก', exact: true }).click(),
          ]);
          expect(answer.status(), 'the write the reload follows').toBe(200);
        },
      },
      {
        what: 'ลบ',
        arrange: async (page, sectionId) => {
          // No category and no CLO rows, which `refuseSave` allows, and the
          // DELETE's own two guards — evidence and marks — cannot refuse a
          // record this row has just made.
          const { activity } = await seed(page, sectionId, '/activities', {
            activity_name: MINE,
            activity_type: 'individual',
            score_number: 1,
          });
          return activity;
        },
        press: async (page, sectionId, activity) => {
          const answer = await bin(
            page,
            `ลบกิจกรรม ${activity.activity_name}`,
            written(page, sectionId, '/activities', 'DELETE'),
          );
          expect(answer.status(), 'the write the reload follows').toBe(204);
        },
      },
    ],
  },
  {
    sheet: '41',
    name: 'แผนการปรับปรุงอย่างต่อเนื่อง',
    page: 'ContinuousImprovement',
    route: '/ContinuousImprove',
    api: '/improvement-plan',
    cases: [
      {
        what: 'บันทึก',
        arrange: async (page, sectionId) => {
          const clos = await myClos(page, sectionId);
          expect(clos.length, 'a CLO to write the plan about').toBeGreaterThan(0);
          return clos[0];
        },
        press: async (page, sectionId, clo) => {
          await chooseClo(page, clo.clo_number);
          const region = formSection(page, 'SUMMARY');
          const start = region.getByRole('button', { name: `เขียน${LABELS.SUMMARY}`, exact: true });
          const change = region.getByRole('button', { name: `แก้ไข${LABELS.SUMMARY}`, exact: true });
          // Which of the two is drawn is a fact about what is written there,
          // and this row is not about it: both are tried, as `writeSection`
          // does, and the read waits for one of them to be on the screen
          // first (#146).
          await expect(start.or(change)).toBeVisible();
          if (await start.count()) await start.click();
          else await change.click();

          await region.getByLabel(LABELS.SUMMARY, { exact: true }).fill(MINE);
          const [answer] = await Promise.all([
            written(page, sectionId, '/improvement-plan', 'POST'),
            region.getByRole('button', { name: 'บันทึก', exact: true }).click(),
          ]);
          expect(answer.status(), 'the write the reload follows').toBe(200);
        },
      },
      {
        what: 'ลบ',
        arrange: async (page, sectionId) => {
          const clos = await myClos(page, sectionId);
          expect(clos.length, 'a CLO to write the plan about').toBeGreaterThan(0);
          await seedEntry(page, sectionId, {
            clo_id: clos[0].clo_id,
            detail_type: 'REFLECTION',
            detail_text: MINE,
          });
          return clos[0];
        },
        press: async (page, sectionId, clo) => {
          await chooseClo(page, clo.clo_number);
          const answer = await bin(
            page,
            `ลบ${LABELS.REFLECTION}`,
            written(page, sectionId, '/improvement-plan', 'DELETE'),
          );
          expect(answer.status(), 'the write the reload follows').toBe(204);
        },
      },
    ],
  },
];

// Every row here writes through the screen, and four of them seed a record
// first, so the schema is remembered before anything else writes and put back
// at the end (#134). Declared before any other hook: what it remembers is the
// schema at the moment it runs.
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

for (const screen of SCREENS) {
  for (const one of screen.cases) {
    test(`${screen.name} (${screen.page}.js): the list ${one.what} reloads does not land on the ตอนเรียน the jump went to`, async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);

      const [listed] = await mySectionIds(page);

      const landedYear = await yearOf(page, LAST_YEAR);
      const heldYear = await yearOf(page, listed);

      // The precondition, asserted where it is used: the two Sections are of
      // different years, or the row's read cannot tell one answer from the
      // other (#129, #154).
      expect(landedYear).not.toEqual(heldYear);

      const arranged = one.arrange ? await one.arrange(page, listed) : null;

      const address = `${DASHBOARD}/${LAST_YEAR}${screen.route}`;
      const firstRead = page.waitForResponse(
        answer =>
          new URL(answer.url()).pathname === `/api/teaching/sections/${LAST_YEAR}${screen.api}` &&
          isRead(answer),
      );
      await openAt(page, address, () => firstRead);
      await expect(header(page).filter({ hasText: landedYear })).toHaveCount(1);

      // Marked after the one document load and before the walk, so the clause
      // reads for every move that follows it, the jump included.
      await markDocument(page);

      await heldReloadLosesTheSectionJump(page, {
        api: screen.api,
        route: screen.route,
        press: () => one.press(page, listed, arranged),
        landed: LAST_YEAR,
        held: listed,
        heldYear,
      });

      // Three clauses in one assertion, so none of them is the one left
      // unreached on the run that proves another: the document was never
      // replaced, the address is the Section the jump landed on, and the year
      // in the screen's own header — which is drawn from the answer — is that
      // Section's year rather than the one the handler's reload was about.
      expect({
        document: await page.evaluate(() => window.__document),
        address: new URL(page.url()).pathname,
        years: await yearsDrawn(page),
      }).toEqual({
        document: DOCUMENT,
        address,
        years: [landedYear],
      });
    });
  }
}
