/*
 * #241 - does the removal's sentence on `Plos.js` land over a curriculum the
 * removal did not speak about, and through which of the two windows?
 *
 * A probe and not a row. #241's first ask is the **measurement**, and the
 * question it feeds - whether a sentence may be said after the person has moved
 * - is `docs/06` §Out of Scope and the owner's (#238's first question is the
 * same species on two other screens). Nothing here may become a claim of any
 * sheet until that is answered: the fix a row would be written for is not
 * licensed yet.
 *
 * It is kept rather than deleted because it is the only thing that can read
 * these three sequences again (#169), and its answer expires the day anything
 * changes what says this sentence, what the curriculum filter is, or whether
 * `confirmRemoval` closes the dialog before it waits.
 *
 * ## How to run it
 *
 *     cp e2e/probes/241-the-removal-sentence-and-the-filter.spec.js \
 *        e2e/tests/000-probe-241.spec.js
 *     cd e2e && E2E_BACKEND_PORT=3600 E2E_FRONTEND_PORT=5310 \
 *       npx playwright test tests/000-probe-241.spec.js --workers=1
 *     rm e2e/tests/000-probe-241.spec.js
 *
 * The runner only sees it inside `tests/`, which is the convention
 * `probes/219-first.spec.js` and `probes/221-the-two-windows.spec.js` carry.
 * Read the ports off `netsh interface ipv4 show excludedportrange protocol=tcp`
 * first: a port inside a reserved range does not raise on bind, so the backend
 * prints its banner and exits 0 (#237).
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
 * - While the **reload** is out the dialog is gone, so the filter is simply
 *   there. **No second actor and nothing to dismiss**, which is why #241 reads
 *   as a defect rather than as the owner's question until the owner says
 *   otherwise.
 *
 * Both halves then reach `if (reloaded && showing.current === sent)`:
 * `reloaded` is `load`'s `return true`, which means *the read was not refused*
 * and never *it drew* (#152, #203 - the comment on line 122 of `Plos.js` says so
 * itself), and `showing` means *the last thing that opened on this screen*
 * (#146), which the filter does not write - the census of #226 calls that ref
 * `opened` for exactly this reason. Neither clause can see the move.
 *
 * ## What each arm reports
 *
 * *Was the sentence ever on the screen* is a sample per frame (#164) and not a
 * wait, because a sentence a later read replaces is gone by any settle point.
 * Beside it: which curriculum the filter ends on, and whether the removed code
 * is in the list that is drawn - so a line that says `พูด` beside a curriculum
 * the removal did not touch is the whole finding in one row.
 *
 * Every arm carries its prediction as an assertion (#205). Without one this
 * instrument cannot go red: the sampler is built from `REMOVED`, so a wording
 * change in the frontend makes all three arms print `0 of n` and exit 0 - the
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
 */

'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { dismiss, panel } = require('../support/confirm-dialog');
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
 * The three referencing tables are the three `ON DELETE RESTRICT` keys that
 * point at `(program_id, outcome_id)`: its own children, `subject_plo_mapping`
 * and `subject_clo`. Asked of the catalogue's own columns rather than of a list
 * kept here, so a fourth added later makes this arm red instead of wrong.
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

/**
 * *Was it ever on the screen*, one sample per frame.
 *
 * Local rather than `support/frame-sampler.js` because that one keeps its
 * counter on one `window.__sightings`, and this probe reads the live filter
 * value in the same breath; nothing here is shared, so nothing here belongs in
 * `support/` (#171).
 */
async function watch(page, sentence) {
  await page.evaluate((said) => {
    window.__p241 = { frames: 0, saying: 0 };
    const tick = () => {
      window.__p241.frames += 1;
      if (document.body.innerText.includes(said)) window.__p241.saying += 1;
      window.__p241.tick = requestAnimationFrame(tick);
    };
    window.__p241.tick = requestAnimationFrame(tick);
  }, sentence);
  return {
    read: () =>
      page.evaluate(() => {
        cancelAnimationFrame(window.__p241.tick);
        return window.__p241;
      }),
  };
}

const found = [];

async function record(page, { sequence, sampler, removed, predicted, aside }) {
  const seen = await sampler.read();
  expect(seen.frames, 'frames sampled').toBeGreaterThan(10);
  if (predicted === 'said') expect(seen.saying, 'predicted: the sentence is said').toBeGreaterThan(0);
  if (predicted === 'silent') expect(seen.saying, 'predicted: nothing says it').toBe(0);
  const on = await plos.programFilter(page).inputValue();
  const codes = await plos.listedCodes(page);
  found.push({
    sequence,
    saying: seen.saying,
    frames: seen.frames,
    on,
    removed,
    stillListed: codes.includes(removed),
    rows: codes.length,
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
      `${f.on} | ${f.removed} ${f.stillListed ? 'ยังอยู่' : 'ไม่อยู่'} ในรายการ ${f.rows} แถว |`,
  );
  console.log(
    [
      '',
      '#241 - the removal sentence and the curriculum filter on Plos.js',
      '',
      '| ลำดับ | ประโยคขึ้นจอ | หลักสูตรที่คนอยู่เมื่อจบ | รายการที่วาดอยู่ |',
      '|---|---|---|---|',
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
  const sampler = await watch(page, REMOVED);
  const answered = page.waitForResponse(
    (answer) =>
      new URL(answer.url()).pathname === `${plos.API}/${target.outcome_id}` &&
      answer.request().method() === 'DELETE',
  );
  await plos.startRemoval(page, target.outcome_code);
  await plos.confirmRemoval(page);
  const answer = await answered;
  await sleep(AFTER_MS);
  await record(page, {
    sequence: 'ไม่ขยับอะไร',
    sampler,
    removed: target.outcome_code,
    predicted: 'said',
    aside: `การลบตอบ ${answer.status()} — 204 คือลบจริง ไม่ใช่ปิดการใช้งาน`,
  });
});

// ── Window one: the DELETE is out, so the dialog is still up ────────────────

test('Plos.js ลบ: the filter moved while the DELETE is held, after ยกเลิก', async ({ page }) => {
  const filter = await openOn(page);
  const target = await aRemovableOutcome();
  const sampler = await watch(page, REMOVED);
  await page.route(`**${plos.API}/**`, lateWrite(HELD_MS));
  try {
    await plos.startRemoval(page, target.outcome_code);
    await plos.confirmRemoval(page);
    // The box is still up: `setRemoving(null)` runs when the DELETE answers.
    const covered = await page.locator('.bg-black\\/50').count();
    await dismiss(page);
    await moveTo(page, filter, TO);
    await sleep(HELD_MS + AFTER_MS);
    await record(page, {
      sequence: 'ขยับตัวกรองขณะที่การลบยังค้างอยู่ (ต้องกด ยกเลิก ก่อน)',
      sampler,
      removed: target.outcome_code,
      predicted: 'said',
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
  const sampler = await watch(page, REMOVED);
  const answered = page.waitForResponse(
    (answer) =>
      new URL(answer.url()).pathname === `${plos.API}/${target.outcome_id}` &&
      answer.request().method() === 'DELETE',
  );
  // Installed before the press and not after it, although only the reload is
  // meant to be held. Arming it on the DELETE's own response event would be a
  // flag paired with a later event (#168): the handler runs on that same event,
  // so the reload can leave before the route is in place. The arrival read of
  // `FROM` is already answered and drawn by `openOn`, so the only GET of `FROM`
  // left for this to catch is the reload itself (#160 - identify the request).
  await page.route(`**${plos.API}**`, lateRead(HELD_MS, listOf(FROM)));
  try {
    await plos.startRemoval(page, target.outcome_code);
    await plos.confirmRemoval(page);
    const answer = await answered;
    expect(
      answer.status(),
      'the removal is a removal, so the sampler reads the right sentence',
    ).toBe(204);
    // Nothing is dismissed and nothing is pressed twice: `setRemoving(null)`
    // runs on this answer, so the box closes itself and this is the filter as
    // the person finds it. Waited for rather than read at once, because the
    // answer and the drawing are two moments (#132).
    await panel(page).waitFor({ state: 'detached' });
    const covered = await page.locator('.bg-black\\/50').count();
    const dialogs = await page.getByRole('button', { name: 'ลบผลการเรียนรู้', exact: true }).count();
    expect(await filter.isDisabled(), 'the filter is live while the reload is out').toBe(false);
    await moveTo(page, filter, TO);
    await sleep(HELD_MS + AFTER_MS);
    await record(page, {
      sequence: 'ขยับตัวกรองขณะที่การอ่านใหม่ค้างอยู่ (ไม่มีอะไรขวาง)',
      sampler,
      removed: target.outcome_code,
      predicted: 'said',
      aside:
        `ขณะการอ่านใหม่ค้าง ฉากคลุม ${covered} ชั้น · ปุ่มยืนยัน ${dialogs} ปุ่ม · ` +
        'ตัวกรองไม่ถูกปิด',
    });
  } finally {
    await page.unroute(`**${plos.API}**`);
  }
});
