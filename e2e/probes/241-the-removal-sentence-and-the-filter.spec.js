/*
 * #241 - does the removal's sentence on `Plos.js` land over a curriculum the
 * removal did not speak about, through which of the two windows, and does any
 * control in those windows make it silent instead?
 *
 * A probe and not a row. #241's first ask is the **measurement**, and the
 * question it feeds - whether a sentence may be said after the person has moved
 * - is `docs/06` §Out of Scope and the owner's (#238's first question is the
 * same species on two other screens). Nothing here may become a claim of any
 * sheet until that is answered: the fix a row would be written for is not
 * licensed yet.
 *
 * It is kept rather than deleted because it is the only thing that can read
 * these six sequences again (#169), and its answer expires on the conditions
 * at the foot of this docblock.
 *
 * ## How to run it
 *
 *     cp e2e/probes/241-the-removal-sentence-and-the-filter.spec.js \
 *        e2e/tests/000-probe-241.spec.js
 *     cd e2e && npx playwright test tests/000-probe-241.spec.js --workers=1
 *     rm e2e/tests/000-probe-241.spec.js
 *
 * The runner only sees it inside `tests/`, which is the convention
 * `probes/219-first.spec.js` and `probes/221-the-two-windows.spec.js` carry.
 * No port is written above: `e2e/README.md` §Ports is the one statement of that
 * rule, and it says which of the two symptoms is which (#237,
 * 26 October 2569).
 *
 * ## Why this screen is not the one #221 measured
 *
 * `Users.js` and `Students.js` have a pager, and #210's option was to give the
 * pager `busy={busy}`. This screen has **no pager at all** - only the
 * curriculum filter, which is drawn when the account reaches more than one
 * curriculum and carries no `disabled` (#238 measured that no screen's filter
 * does). So the only control that can change what the read is *of* here is the
 * one the option in front of nobody would have closed.
 *
 * ## The mechanism the arms are built from
 *
 * `confirmRemoval` runs `setRemoving(null)` **before** it waits for the reload,
 * and that is what splits the window in two:
 *
 * - While the **DELETE** is out the dialog is still up, under a full-screen
 *   `bg-black/50` that eats a click (#199), with `ConfirmDialog` trapping focus
 *   since 18 ตุลาคม 2569 (#217). The person's way on is ยกเลิก, which cancels
 *   nothing that has already left - the instrument is
 *   `e2e/support/confirm-dialog.js` `dismiss`, as in #221.
 * - While the **reload** is out the dialog is gone, so the table and everything
 *   around it are simply there. **No second actor and nothing to dismiss.**
 *
 * Both halves then reach `if (reloaded && showing.current === sent)`, and the
 * arms are chosen so that each clause is put at risk by something:
 *
 * - `reloaded` is `load`'s unconditional `return true`, under its own comment
 *   *"Whether it drew, for a handler that has a sentence to say"*, which says
 *   it answers *the read was not refused* and never *it drew* (#152, #203).
 *   Nothing a person can press makes it false, so no arm here varies it.
 * - `showing.current === sent` asks *has anything opened since* (#146, and the
 *   `opened` label #226's census gives this ref). The **filter does not write
 *   it** - the ref's own docblock says so - but `แก้ไข` and
 *   `เพิ่มผลการเรียนรู้` do, and neither is `disabled={busy}`: on this screen
 *   `busy` reaches `PloForm` and `ConfirmDialog` and nothing else. So the
 *   filter arms leave this clause true by construction, and the arms that press
 *   `เพิ่มผลการเรียนรู้` put it at risk (#139 - the guard is written by every
 *   control that can take the answer's place, which is a list to read off the
 *   code and not off the ticket).
 *
 * `เพิ่มผลการเรียนรู้` rather than `แก้ไข` for that: it writes the ref
 * synchronously and makes no request of its own, so it is the raceless sibling
 * (#179) and cannot be confused with the held read. `แก้ไข` writes the same ref
 * at the press and is the other way in; what it adds is a read of its own,
 * which this probe does not need to say what the ref decides.
 *
 * ## Why six arms and not four: the grid, not an argument
 *
 * The first four arms all press inside a held window, so between them they can
 * only say *what happens when the press lands in the window*. That is not
 * enough to tell a #52/#199 fork - one system holding two behaviours with an
 * invisible clock choosing - from one behaviour reached two ways, because the
 * question is whether the **same press outside the window** ends differently.
 * So the two controls are each measured on both sides of the window and read as
 * a grid (#148, #149): the fifth arm moves the filter after the sentence has
 * landed with nothing held, the sixth presses `เพิ่มผลการเรียนรู้` there. Where
 * a column's two cells agree, the window is not the cause; where they differ,
 * the clock is choosing and the ticket's second ask is answered *defect*.
 *
 * ## What each arm reports
 *
 * *Was the sentence ever on the screen* is a sample per frame (#164) and not a
 * wait, because a sentence a later read replaces is gone by any settle point.
 * The sampler is `e2e/support/frame-sampler.js`, shared, because no row's claim
 * lives in it (#171). Beside it: which curriculum the filter ends on, and
 * whether the removed code is in the list that is drawn - so a line that says
 * `พูด` beside a curriculum the removal did not touch is the whole finding in
 * one row. The arms that open the form have neither, the form having replaced
 * the table; what they have instead is that `<Notice>` is drawn **above** that
 * fork in the JSX, so a silent reading there is the guard working and not the
 * screen having nowhere to say it (#203's ninth reading of a survivor).
 *
 * The last two arms add one reading the sampler cannot give: whether the banner
 * is **still standing** once the press has happened. The fifth arm reads it
 * once, at a settle point, because nothing in that arm calls `setNotice(null)`
 * - a retrying read there would be an assertion that cannot fail (#50). The
 * sixth retries, because there the code under test is itself the remover, which
 * is #214's exception to that rule.
 *
 * Every arm carries its prediction as an assertion (#205). Without one this
 * instrument cannot go red: the sampler is built from `REMOVED`, so a wording
 * change in the frontend makes every arm print `0 of n` and exit 0 - the
 * probe's answer inverted with nothing saying so. The count is the tell, not
 * the exit code (#208, #171).
 *
 * ## What it cannot say (#123)
 *
 * - **Whether what the person reads is right.** `docs/06` §Out of Scope, and
 *   the whole of why #241 is a question ticket.
 * - **Whether a person's click on the filter lands while the dialog is up.**
 *   The second arm does not try: it dismisses first, which is the way in a
 *   person has. `selectOption` focuses a control rather than clicking through
 *   whatever covers it, which is a way in the tool has and a person does not
 *   (#47), so an arm built on it would answer about the driver.
 * - **It is a claim about this seed.** The filter is drawn only for an account
 *   reaching two curricula, which is `dept.admin.05@kmitl.ac.th` (`19a`'s own
 *   row says so), and the removal must be a removal rather than a
 *   deactivation. Each arm asserts both on arrival, and the DELETE's own status
 *   is read below the seam.
 * - **Which of `แก้ไข` and `เพิ่มผลการเรียนรู้` a person would reach for.**
 *   Both write the ref; the fourth and sixth arms press one of them.
 *
 * ## What would expire it
 *
 * Six conditions. Anything that changes **who says** `confirmRemoval`'s
 * sentence or the clauses it is said under · moving `setRemoving(null)` to
 * **after** the wait, which takes the second window away · giving this screen's
 * curriculum filter a `disabled` · giving `เพิ่มผลการเรียนรู้` or `แก้ไข` one,
 * which closes the way in of the arms that press it · a seed where
 * `dept.admin.05@kmitl.ac.th` reaches one curriculum, so the filter is not
 * drawn (every arm reads that precondition on arrival, so it goes **red**
 * rather than answering wrongly) · and a change to the sentence's wording,
 * which every arm's `predicted` catches.
 */

'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { dismiss, panel } = require('../support/confirm-dialog');
const { watchForTheSentence } = require('../support/frame-sampler');
const plos = require('../support/plos-screen');

const db = createPool({ schema: E2E_SCHEMA });

/** Long enough for the other curriculum's read to be answered and drawn. */
const HELD_MS = 2_000;
/** Long enough for the held answer to land and for whatever it causes to be drawn. */
const AFTER_MS = 3_500;

/** The two curricula `dept.admin.05` reaches; the removal is always in the first. */
const FROM = '0501';
const TO = '0503';

const REMOVED = 'ลบผลการเรียนรู้เรียบร้อยแล้ว';

/**
 * The cover that eats a click while the box is up.
 *
 * Spelled here rather than shared out of `confirm-dialog.js`, although `204a`
 * and `208a` spell it too: a locator eight files shared would become those
 * files' premise instead of their claim (#85, #111), and a probe is the last
 * place that should decide it. What this reads is a count, not a claim.
 */
const COVER = '.bg-black\\/50';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const listOf = (program) => (url) =>
  url.pathname === plos.API && url.searchParams.get('program_id') === program;

const lateRead = (ms, match) => async (route, request) => {
  if (request.method() === 'GET' && match(new URL(request.url()))) await sleep(ms);
  try {
    await route.continue();
  } catch {
    // The arm has ended and closed the page.
  }
};

const lateWrite = (ms) => async (route, request) => {
  if (request.method() === 'DELETE') await sleep(ms);
  try {
    await route.continue();
  } catch {
    // The arm has ended and closed the page.
  }
};

/**
 * An outcome in `FROM` that the database will really delete.
 *
 * Read below the seam, because *which* outcome is deletable is a property of
 * the seed and not of this question, and a `deactivated` answer would make the
 * screen say the other sentence - the sampler would then count `0` and the arm
 * would read as *nothing was said* (#164's blind sampler, one species along).
 *
 * The three referencing tables are **a list with a date on it**, not a reading
 * of the catalogue: they are the three `ON DELETE RESTRICT` keys pointing at
 * `(program_id, outcome_id)` in `db/migrations/0002_*.sql` on 25 ตุลาคม 2569.
 * A fourth added later is not found by this query and is not meant to be - what
 * says so is every arm asserting the DELETE answered **204**, which a refused
 * removal cannot (#126 is why the list is dated rather than trusted).
 */
async function aRemovableOutcome() {
  const { rows } = await db.query(
    `SELECT lo.outcome_id, lo.outcome_code
       FROM learning_outcomes lo
      WHERE lo.program_id = $1
        AND NOT EXISTS (SELECT 1 FROM learning_outcomes c
                         WHERE c.parent_outcome_id = lo.outcome_id)
        AND NOT EXISTS (SELECT 1 FROM subject_plo_mapping m
                         WHERE m.program_id = lo.program_id AND m.outcome_id = lo.outcome_id)
        AND NOT EXISTS (SELECT 1 FROM subject_clo s
                         WHERE s.program_id = lo.program_id AND s.plo_id = lo.outcome_id)
      ORDER BY lo.outcome_code`,
    [FROM],
  );
  expect(rows.length, `the seed holds an outcome of ${FROM} nothing points at`).toBeGreaterThan(0);
  return rows[0];
}

/** Opens the screen on `FROM` with the filter drawn, and says what it read. */
async function openOn(page) {
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await plos.openPlos(page);
  await plos.filterTo(page, FROM);
  const filters = await plos.programFilter(page).count();
  expect(filters, 'the arm needs the curriculum filter drawn, which needs two curricula').toBe(1);
  expect(await plos.programFilter(page).isDisabled(), 'the filter is live on arrival').toBe(false);
  return plos.programFilter(page);
}

/** Waits for the removal's own answer and says it was a removal, not a deactivation. */
function theRemoval(page, outcomeId) {
  return page
    .waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === `${plos.API}/${outcomeId}` &&
        answer.request().method() === 'DELETE',
    )
    .then(async (answer) => {
      expect(answer.status(), 'the removal is a removal, so the sampler reads the right sentence')
        .toBe(204);
      return answer;
    });
}

/** Moves the filter and waits for the other curriculum's own answer, by its own query. */
async function moveTo(page, filter, program) {
  const answered = page.waitForResponse(
    (answer) =>
      listOf(program)(new URL(answer.url())) && answer.request().method() === 'GET',
  );
  await filter.selectOption(program);
  await answered;
  await plos.untilListed(page);
}

/** What the table is showing, for an arm that ends with a table on the screen. */
async function drawn(page) {
  return {
    on: await plos.programFilter(page).inputValue(),
    codes: await plos.listedCodes(page),
  };
}

/**
 * The success banner, read as the person would see it rather than through the
 * sampler. `Notice` gives a success `role="status"` and an error `role="alert"`,
 * so this is scoped by the role and then by the sentence.
 */
const theSentence = (page) => page.getByRole('status').filter({ hasText: REMOVED });

const found = [];

async function record({ sequence, sampler, removed, predicted, showing, aside }) {
  const seen = await sampler.read();
  expect(seen.frames, 'frames sampled').toBeGreaterThan(10);
  if (predicted === 'said') expect(seen.saying, 'predicted: the sentence is said').toBeGreaterThan(0);
  if (predicted === 'silent') expect(seen.saying, 'predicted: nothing says it').toBe(0);
  found.push({
    sequence,
    saying: seen.saying,
    frames: seen.frames,
    removed,
    showing,
    aside,
  });
}

let release;
test.beforeAll(async () => {
  release = await hold();
});

test.afterAll(async () => {
  await release();
  await db.end();
  const rows = found.map(
    (f) =>
      `| ${f.sequence} | ${f.saying > 0 ? 'พูด' : '**ไม่พูด**'} ${f.saying} จาก ${f.frames} เฟรม | ` +
      `${f.showing} |`,
  );
  console.log(
    [
      '',
      '#241 - the removal sentence, the curriculum filter and the controls that write the ref',
      '',
      '| ลำดับ | ประโยคขึ้นจอ | จอที่คนกำลังดูเมื่อจบ |',
      '|---|---|---|',
      ...rows,
      '',
      ...found.filter((f) => f.aside).map((f) => `- ${f.sequence}: ${f.aside}`),
      '',
    ].join('\n'),
  );
});

// ── The twin that moves nothing ─────────────────────────────────────────────

test('Plos.js ลบ: the twin that moves nothing', async ({ page }) => {
  await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watchForTheSentence(page, REMOVED);
  const answered = theRemoval(page, target.outcome_id);
  await plos.startRemoval(page, target.outcome_code);
  await plos.confirmRemoval(page);
  await answered;
  await sleep(AFTER_MS);
  const { on, codes } = await drawn(page);
  await record({
    sequence: 'ไม่ขยับอะไร',
    sampler,
    removed: target.outcome_code,
    predicted: 'said',
    showing: `${on} · ${codes.length} แถว · ${target.outcome_code} ${
      codes.includes(target.outcome_code) ? 'ยังอยู่' : 'ไม่อยู่'
    }`,
    aside: 'การลบตอบ 204 — ลบจริง ไม่ใช่ปิดการใช้งาน',
  });
});

// ── Window one: the DELETE is out, so the dialog is still up ────────────────

test('Plos.js ลบ: the filter moved while the DELETE is held, after ยกเลิก', async ({ page }) => {
  const filter = await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watchForTheSentence(page, REMOVED);
  await page.route(`**${plos.API}/**`, lateWrite(HELD_MS));
  try {
    await plos.startRemoval(page, target.outcome_code);
    await plos.confirmRemoval(page);
    // No settle point before this read and none needed: the cover went up with
    // the box at `startRemoval`, and what is being read is that the press did
    // not take it away. Its twin in the fourth arm waits, because there the
    // claim is that something has *gone*.
    const covered = await page.locator(COVER).count();
    await dismiss(page);
    await moveTo(page, filter, TO);
    await sleep(HELD_MS + AFTER_MS);
    const { on, codes } = await drawn(page);
    await record({
      sequence: 'ขยับตัวกรองขณะที่การลบยังค้างอยู่ (ต้องกด ยกเลิก ก่อน)',
      sampler,
      removed: target.outcome_code,
      predicted: 'said',
      showing: `${on} · ${codes.length} แถว · ${target.outcome_code} ${
        codes.includes(target.outcome_code) ? 'ยังอยู่' : 'ไม่อยู่'
      }`,
      aside: `ขณะการลบค้าง มีฉากคลุม ${covered} ชั้น จึงต้องกด ยกเลิก ก่อนถึงตัวกรอง`,
    });
  } finally {
    await page.unroute(`**${plos.API}/**`);
  }
});

// ── Window two: the reload is out and the dialog has closed itself ──────────

test('Plos.js ลบ: the filter moved while the reload is held, with nothing in the way', async ({
  page,
}) => {
  const filter = await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watchForTheSentence(page, REMOVED);
  const answered = theRemoval(page, target.outcome_id);
  // Installed before the press and not after it, although only the reload is
  // meant to be held. Arming it on the DELETE's own response event would hand
  // the handler and the route the same event to race over, which is #168's
  // species: an event is not the thing it is about. Which request this catches
  // is then argued by exhaustion - the arrival read of `FROM` is answered and
  // drawn by `openOn`, so the reload is the only GET of `FROM` left - and
  // exhaustion is the weaker argument, which is why the move below waits on
  // `TO`'s own answer by identity instead (#160).
  await page.route(`**${plos.API}**`, lateRead(HELD_MS, listOf(FROM)));
  try {
    await plos.startRemoval(page, target.outcome_code);
    await plos.confirmRemoval(page);
    await answered;
    // Nothing is dismissed and nothing is pressed twice: `setRemoving(null)`
    // runs on this answer, so the box closes itself and this is the screen as
    // the person finds it. Waited for rather than read at once, because the
    // answer and the drawing are two moments (#132).
    await panel(page).waitFor({ state: 'detached' });
    const covered = await page.locator(COVER).count();
    expect(await filter.isDisabled(), 'the filter is live while the reload is out').toBe(false);
    await moveTo(page, filter, TO);
    await sleep(HELD_MS + AFTER_MS);
    const { on, codes } = await drawn(page);
    await record({
      sequence: 'ขยับตัวกรองขณะที่การอ่านใหม่ค้างอยู่ (ไม่มีอะไรขวาง)',
      sampler,
      removed: target.outcome_code,
      predicted: 'said',
      showing: `${on} · ${codes.length} แถว · ${target.outcome_code} ${
        codes.includes(target.outcome_code) ? 'ยังอยู่' : 'ไม่อยู่'
      }`,
      aside: `ขณะการอ่านใหม่ค้าง ฉากคลุม ${covered} ชั้น · ตัวกรองไม่ถูกปิด`,
    });
  } finally {
    await page.unroute(`**${plos.API}**`);
  }
});

// ── The same window, pressing a control that writes the ref ─────────────────

test('Plos.js ลบ: เพิ่มผลการเรียนรู้ pressed while the reload is held', async ({ page }) => {
  await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watchForTheSentence(page, REMOVED);
  const answered = theRemoval(page, target.outcome_id);
  await page.route(`**${plos.API}**`, lateRead(HELD_MS, listOf(FROM)));
  try {
    await plos.startRemoval(page, target.outcome_code);
    await plos.confirmRemoval(page);
    await answered;
    await panel(page).waitFor({ state: 'detached' });
    const add = page.getByRole('button', { name: 'เพิ่มผลการเรียนรู้', exact: true });
    expect(await add.isDisabled(), 'the control that writes the ref is live in this window').toBe(
      false,
    );
    await plos.openAddForm(page);
    await sleep(HELD_MS + AFTER_MS);
    const covered = await page.locator(COVER).count();
    const table = await page.locator('table').count();
    await record({
      sequence: 'กด เพิ่มผลการเรียนรู้ ขณะที่การอ่านใหม่ค้างอยู่',
      sampler,
      removed: target.outcome_code,
      predicted: 'silent',
      showing: `ฟอร์มเปิดอยู่ · ตาราง ${table} ตัว · ฉากคลุม ${covered} ชั้น`,
      aside:
        'ปุ่มนี้เขียน showing.current จึงเป็นทางเข้าของอนุประโยคที่สอง · `<Notice>` ถูกวาด' +
        ' เหนือทางแยกของฟอร์มใน JSX ฉะนั้นการเงียบที่นี่คือยามทำงาน ไม่ใช่จอไม่มีที่พูด',
    });
  } finally {
    await page.unroute(`**${plos.API}**`);
  }
});

// ── The same two controls, outside the window: the other half of the grid ───

test('Plos.js ลบ: the filter moved after the sentence has landed, nothing held', async ({
  page,
}) => {
  const filter = await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watchForTheSentence(page, REMOVED);
  const answered = theRemoval(page, target.outcome_id);
  await plos.startRemoval(page, target.outcome_code);
  await plos.confirmRemoval(page);
  await answered;
  await expect(theSentence(page), 'the sentence lands before anything is pressed').toBeVisible();
  await moveTo(page, filter, TO);
  // Read once at a settle point, not retried: the only thing that takes this
  // banner away is `setNotice(null)`, which nothing in this arm calls, so a
  // retrying read would be an assertion that cannot fail (#50, #214).
  const standing = await theSentence(page).count();
  const { on, codes } = await drawn(page);
  await record({
    sequence: 'ขยับตัวกรองหลังประโยคขึ้นแล้ว (ไม่กักอะไร)',
    sampler,
    removed: target.outcome_code,
    predicted: 'said',
    showing: `${on} · ${codes.length} แถว · ประโยคยังอยู่ ${standing} แถบ`,
    aside:
      'ไม่มีหน้าต่างใดเกี่ยวข้อง — ถ้าประโยคยังอยู่ที่นี่ หน้าต่างไม่ใช่สาเหตุของแขนที่สองกับที่สาม',
  });
});

test('Plos.js ลบ: เพิ่มผลการเรียนรู้ pressed after the sentence has landed', async ({ page }) => {
  await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watchForTheSentence(page, REMOVED);
  const answered = theRemoval(page, target.outcome_id);
  await plos.startRemoval(page, target.outcome_code);
  await plos.confirmRemoval(page);
  await answered;
  await expect(theSentence(page), 'the sentence lands before anything is pressed').toBeVisible();
  await plos.openAddForm(page);
  // Retried, and here that is right: the press's own handler is the only thing
  // that removes this banner, which is #214's exception to #50 - the code under
  // test is the remover, so the read can fail.
  await expect(theSentence(page), 'the press takes the sentence away').toHaveCount(0);
  await record({
    sequence: 'กด เพิ่มผลการเรียนรู้ หลังประโยคขึ้นแล้ว',
    sampler,
    removed: target.outcome_code,
    predicted: 'said',
    showing: 'ฟอร์มเปิดอยู่ · ประโยคถูกเก็บไปตอนกด',
    aside: 'ประโยคขึ้นก่อนแล้วถูกเก็บ ปลายทางจึงเท่าแขนที่สี่ ซึ่งไม่เคยขึ้นเลย',
  });
});
