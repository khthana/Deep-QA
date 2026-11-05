'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { hold } = require('../support/hold');
const { openAt } = require('../support/navigation');
const { mySectionIds } = require('../support/enrolment-screen');
const { csv, headerOf, importCsv } = require('../support/import-panel');
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

/**
 * #268 — the two ways in of the #140 family that are an import box.
 *
 * `266a` holds nine sites of four child screens, `266b` ten of six. Those
 * twenty are a save, a removal or the helper every write on a screen goes
 * through. The last two are `<ImportPanel>`'s `onImported`, on
 * `StudentGroups.js` and `GradingWeights.js`, and #266 closed them with
 * *ยังไม่ได้ทดสอบ* plus a date, a reason and this tracker rather than with
 * *ไม่ต้องมี*.
 *
 * ## The population, measured again — and the earlier measurement was wrong
 *
 * #266's criterion 2 forbade the grep for `const drawing = onScreen.current`
 * and `_local/q266population.js` answered it from the parse tree instead:
 * every **`await <f>(<arrow>)`** whose arrow compares something's `.current`
 * with a plain identifier. On that reading these two screens held **one** site
 * each, and #266's closing prose said *ten sites, twelve ways in*.
 *
 * That sentence is false, and the grep it replaced had been right. The
 * `onImported` callback is not `async`:
 *
 * ```
 *   onImported={() => {
 *     const drawing = onScreen.current
 *     drawing(() => onScreen.current === drawing)     // no await
 *   }}
 * ```
 *
 * so no `AwaitExpression` stands over it and the instrument could not see it.
 * Asked again on 5 November 2569 without that clause — `_local/q268population.js`
 * — the tree holds **56** such calls in 21 page files, eleven of them
 * unawaited, and these six screens hold **twelve sites, two each**. *An
 * instrument's population is a claim like a ticket's numbers, and the property
 * it counted is not always the property the question is about* (#174, #230,
 * #141). The sheets, the two mutation scripts and `57-pager.md` are corrected,
 * with the measurement beside them.
 *
 * So each of these two is its **own** site, not another way into the site
 * `266b` already breaks: `266:groupswritehandlerstale` edits the pair inside
 * `after()` and `266:weightssavehandlerstale` the pair inside `save`, while
 * these two rows' reload is sent from the pair inside `onImported`, which
 * neither of those mutants touches. `mutation/268-…` breaks that pair, and no
 * row of `266a` or `266b` can be killed by either of its mutants (#191, #244).
 *
 * ## What waited was the fixture, and it was measured rather than argued
 *
 * The way in is the import button, which `support/import-panel.js` presses
 * already — `140a` has pressed it on the **parent** screens since #223. What
 * was unmeasured is whether a file the **server will not refuse** can be built
 * here, because the two routes refuse for their own reasons. Measured on
 * 5 November 2569 with a probe, on the Section these rows hold (`section_id`
 * 1), and both answers were **201**:
 *
 * | จอ | เงื่อนไขของ route | ที่วัดได้ 5 พ.ย. 2569 |
 * |---|---|---|
 * | `26` | ทุกบรรทัดต้องเป็นนักศึกษาที่ลงทะเบียนในตอนเรียนนั้น และ**ยังไม่อยู่ในกลุ่มใด** | ลงทะเบียน 57 คน · 6 กลุ่ม · **ยังไม่มีกลุ่ม 11 คน** ไฟล์บรรทัดเดียว → `201` |
 * | `30` | ไฟล์**แทนที่ทั้งชุด** รวมต้องได้ 100 · ห้ามหมวดซ้ำ · ห้ามตัดหมวดที่กิจกรรมชี้อยู่ | 3 หมวด รวม 100 (โครงงาน 40 · สอบกลางภาค 30 · สอบปลายภาค 30) ไฟล์ที่กล่าวทั้งสามหมวดด้วยน้ำหนักเดิม → `201` |
 *
 * The weights file is **the scheme restated**: every category it already holds,
 * at the weight it already has. That is the one shape none of the three
 * refusals can touch — the total is unchanged, no name repeats, nothing is
 * dropped — and the route's `ON CONFLICT … DO UPDATE` then writes the values
 * back unchanged, so the row is about the reload and not about the data. The
 * groups file names one of the eleven ungrouped students, read at arrange time
 * rather than taken from a seed constant, because `140a`'s
 * `UNPLACED_FOR_IMPORT` is the **programme** students screen's population and
 * not this Section's roll.
 *
 * The status is **201** and not 200, which no prose of #266's had said: the
 * deferral's reason named the three refusals and not the answer. *A ticket's
 * prescribed fixture is a claim like its numbers* (#245) — a row written from
 * the memory of that reason would have been red on its first run, which is what
 * the probe cost one minute to find out instead.
 *
 * ## What this file does not say
 *
 * - It walks with `history.go`, not with the pressing of the history list
 *   behind the back button, which stays a hand-walked row.
 * - It asserts no success sentence and no rejection report. The import's own
 *   report is `#14`'s row and the sentence belongs to the person who pressed
 *   the button rather than to this screen (#205).
 * - It does not say the import's reload is the **only** thing `onImported`
 *   does: `ImportPanel` keeps its own flag and touches neither of the screen's,
 *   which is `#223`'s measurement and not re-measured here.
 * - The window is a `page.route` held two seconds, not a real network, so
 *   *anything written for timing must not be able to decide anything* (#52):
 *   each row reads the screen once, at a settle point, and compares three
 *   clauses in one `toEqual`.
 */

/** The name a created group gets, which no seed row carries. */
const MINE = 'กลุ่ม #268';

/** One screen's own read, over the context's request — a row's setup, not its subject. */
async function read(page, sectionId, api) {
  const answer = await page.request.get(`${BACKEND_URL}/api/teaching/sections/${sectionId}${api}`);
  expect(answer.status(), `the screen's own read of section ${sectionId}${api}`).toBe(200);
  return answer.json();
}

/**
 * The screen's own template, asked of the endpoint the button fetches from.
 *
 * `import-panel.js`'s `downloadTemplate` presses the button and reads the file
 * off the disk, because half of what `#14`'s template row claims is about the
 * bytes that reach it (the byte-order mark, #62). This row claims none of that
 * and needs only the header, so it is fetched here — before the walk, where
 * everything else this row arranges happens. A download inside the held window
 * would spend the window (`HELD_MS` is what the move has to finish in), which
 * is the reason `140a`'s own import rows fetch theirs early too.
 */
async function templateHeader(page, sectionId, api) {
  const answer = await page.request.get(
    `${BACKEND_URL}/api/teaching/sections/${sectionId}${api}/import-template`,
  );
  expect(answer.status(), 'the template the screen offers').toBe(200);
  return headerOf({ text: await answer.text() });
}

/**
 * The two sites, by the screen each one is on and the file it is handed.
 *
 * `arrange` runs before the walk and reads through the API rather than through
 * the screen, so nothing it does is a second write whose own reload these rows
 * would then have to tell from the one they are about. `press` returns when the
 * **import** has answered and never when the reload has been drawn.
 */
const SCREENS = [
  {
    sheet: '26',
    name: 'กลุ่มงานนักศึกษา',
    page: 'StudentGroups',
    route: '/studentGroups',
    api: '/groups',
    what: 'นำเข้ากลุ่มงานจากไฟล์',
    arrange: async (page, sectionId) => {
      const columns = await templateHeader(page, sectionId, '/groups');
      const { students } = await read(page, sectionId, '/groups');
      const free = students.filter(one => one.group_id === null);
      // Asserted where it is used (#51): the file is refused with
      // `studentInAnotherGroup` or `studentNotEnrolled` for anybody else, and a
      // refused import sends no reload at all, so this row would die at
      // `reloadSent` with nothing to say why.
      expect(free.length, 'an enrolled student in no group of this Section').toBeGreaterThan(0);
      return csv(columns, `${MINE},${free[0].student_id}`);
    },
  },
  {
    sheet: '30',
    name: 'สัดส่วนคะแนน',
    page: 'GradingWeights',
    route: '/gradingWeights',
    api: '/weights',
    what: 'นำเข้าสัดส่วนคะแนนจากไฟล์',
    arrange: async (page, sectionId) => {
      const columns = await templateHeader(page, sectionId, '/weights');
      // The answer's own key, read out of `backend/routes/weights.js:153`
      // rather than out of a memory of what the screen calls it.
      const { weights } = await read(page, sectionId, '/weights');
      const sum = weights.reduce((carried, one) => carried + Number(one.weight), 0);
      expect(weights.length, 'a scheme of this Section to restate').toBeGreaterThan(0);
      // The precondition of *restating is accepted*: the file's total is this
      // one, and `weightsNotHundred` refuses anything else.
      expect(sum, 'a scheme that already totals 100').toBe(100);
      return csv(columns, ...weights.map(one => `${one.score_category},${one.weight}`));
    },
  },
];

// Both rows write through the screen — one creates a group and places a
// student in it, the other upserts the scheme over itself — so the schema is
// remembered before anything else writes and put back at the end (#134).
// Declared before any other hook: what it remembers is the schema at the moment
// it runs.
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

for (const screen of SCREENS) {
  test(`${screen.name} (${screen.page}.js): the list ${screen.what} reloads does not land on the ตอนเรียน the jump went to`, async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);

    const [listed] = await mySectionIds(page);

    const landedYear = await yearOf(page, LAST_YEAR);
    const heldYear = await yearOf(page, listed);

    // The precondition, asserted where it is used: the two Sections are of
    // different years, or the row's read cannot tell one answer from the other
    // (#129, #154).
    expect(landedYear).not.toEqual(heldYear);

    const file = await screen.arrange(page, listed);

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
      press: async () => {
        const answer = await importCsv(page, {
          path: `/api/teaching/sections/${listed}${screen.api}/import`,
          text: file,
          name: 'row-268.csv',
        });
        // The arrangement the whole row rests on: a refused file draws a report
        // and sends no reload, so a red here is the fixture and not the guard.
        expect(answer.status(), 'an import the server does not refuse').toBe(201);
      },
      landed: LAST_YEAR,
      held: listed,
      heldYear,
    });

    // Three clauses in one assertion, so none of them is the one left unreached
    // on the run that proves another: the document was never replaced, the
    // address is the Section the jump landed on, and the year in the screen's
    // own header — which is drawn from the answer — is that Section's year
    // rather than the one the import's reload was about.
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
