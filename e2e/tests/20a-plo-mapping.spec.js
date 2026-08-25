'use strict';

const fs = require('node:fs/promises');

const { test, expect } = require('@playwright/test');
const { ACCOUNTS, PASSWORD } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { REFUSALS } = require('../../backend/auth/refusals');
const {
  PROGRAM,
  OTHER_PROGRAM,
  openMapping,
  square,
  subjectRow,
  frameOf,
  choose,
  listedCodes,
  askFor,
  exportPdf,
} = require('../support/plo-mapping-screen');

/**
 * #20 — การเชื่อมโยงผลการเรียนรู้กับรายวิชา, the coverage grid, in a browser.
 *
 * `backend/test/plo-mapping.test.js` has already proved everything that is a
 * fact about the API: the five levels, the upsert, the absence of placeholder
 * rows, the two axes, and every refusal. This file is here for the four things
 * that seam cannot see.
 *
 * *A square is a control a person operates.* The write is not a form and a
 * button; it is a dropdown that saves on the change that made it. Nothing in
 * the backend suite can tell a screen that saves from one that draws a
 * dropdown and forgets it, and this is the criterion most likely to be broken
 * by a change nobody thought was risky.
 *
 * *An untouched square is empty on the screen and not merely absent from a
 * payload.* The fourth criterion is a claim about what a person sees in a
 * square nobody has written to, and a payload with no cell in it is only half
 * of that: a screen could still draw `E` there.
 *
 * *The PDF is a file the browser was handed.* The fifth criterion is the only
 * one in the ticket about something that leaves the application, and it has a
 * half that is checkable and a half that is not. Checkable: a download happens,
 * it is named for the curriculum, and the bytes name an embedded Thai face. Not
 * checkable here: whether the vowels and tone marks sit where they belong on
 * the page. That half is a hand-walked row in `docs/acceptance/20`, and no
 * assertion in this file should be read as covering it.
 *
 * *The grid is the widest table in the application.* It was fifty-two columns
 * when #98 was fixed for it; #100 cut it to thirteen ข้อหลัก, which fits a
 * full-screen window and does not fit a half-screen one. So that row now runs
 * at a narrowed viewport. It is still a regression guard on #98's fix, asserted
 * on the table that needs it most rather than on the one that happened to be
 * widest when #98 was written.
 *
 * **Why the setup is API calls and not clicks.** Two rows need a รายวิชา that
 * has just been placed in the curriculum and has never been mapped. Making one
 * means the catalogue screen (#16) and the pairing screen (#18), which have
 * their own specs walking their own controls; walking them again here would
 * make this file fail when those screens change, on rules it is not about. So
 * the pair is written through their endpoints, signed in as the account that
 * owns them, and the clicking in this file is all #20's.
 *
 * **Why the rows are not `serial`.** They share a curriculum but not a square:
 * each row writes to columns no other row touches, and the placed subject is
 * made and taken away by `beforeAll`/`afterAll` rather than by a row. So a row
 * that fails no longer skips the ones below it — which mattered while proving
 * these assertions, because a mutant that breaks the save breaks several rows
 * and `serial` would have reported one and hidden the rest.
 */

/** The subject this file places in the curriculum and takes away again. */
const MINE = 'Z0002001';
const MINE_TH = 'ตารางความครอบคลุมผลการเรียนรู้';

/** Columns this file writes to. Untouched by the seed, so a row starts empty. */
const FREE = ['PLO-4', 'PLO-9', 'PLO-10'];

/** The outcome_id behind a column's code, read out of the grid the server sent. */
const idOf = (grid, code) =>
  grid.outcomes.find(outcome => outcome.outcome_code === code)?.outcome_id;

/** A column the seed has already filled, and the level it filled it with. */
const SEEDED = { code: 'PLO-12', level: 'A' };

/** The รายวิชา the seed places in 0501 — the grid's one row until this file adds another. */
const SEEDED_SUBJECT = '01076105';

/**
 * Writes the pair straight through #16's and #18's endpoints, as the
 * ผู้ดูแลภาควิชา who owns both.
 *
 * Idempotent, and the `PUT` at the end is why. `beforeAll` here is not
 * once-per-run: Playwright restarts the worker after a failing test, and a
 * restart runs `afterAll` and then `beforeAll` again. `unplace` leaves the
 * pairing *switched off* rather than gone — once a row above has written a cell
 * against it, `DELETE /program-subjects` can only deactivate — so a second
 * `place` meets two 409s and, without this, would leave the grid with no row
 * for the rest of the run. That cost an hour under the `noupsert` mutant: every
 * row after the first failure reported `element(s) not found`, which reads like
 * a broken screen and was a broken fixture.
 *
 * The two 409s are therefore expected and not asserted; the `PUT` is asserted,
 * because it is the statement that the pairing is live whichever of the two
 * paths got here.
 */
async function place(request) {
  await request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.departmentAdmin05, password: PASSWORD },
  });
  await request.post(`${BACKEND_URL}/api/subjects`, {
    data: {
      subject_id: MINE,
      subject_name_th: MINE_TH,
      subject_name_en: 'Outcome coverage fixture',
      credits: 3,
      department_id: '05',
    },
  });
  await request.post(`${BACKEND_URL}/api/program-subjects`, {
    data: { program_id: PROGRAM, subject_id: MINE, subject_type: 'required' },
  });
  const live = await request.put(`${BACKEND_URL}/api/program-subjects/${PROGRAM}/${MINE}`, {
    data: { subject_type: 'required', is_active: true },
  });
  expect(live.status(), 'the fixture pairing is not in the curriculum').toBe(200);
}

/**
 * Takes the pair away again, as far as the two screens allow.
 *
 * Best-effort, and deliberately so. `DELETE /program-subjects` switches a
 * pairing *off* rather than removing it once anything references it, and by the
 * time this runs the rows above have written cells against it — so the pairing
 * is deactivated, which takes it out of every grid, and the catalogue entry
 * stays behind it. Neither answer is asserted, because neither is this file's
 * subject.
 *
 * Nothing downstream depends on it running at all: the schema is reseeded every
 * run. It is here so that a run stopped halfway leaves the database roughly as
 * it found it, and so a person opening the walk stack afterwards does not meet
 * a รายวิชา no seed ever made sitting in somebody's curriculum.
 */
async function unplace(request) {
  await request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email: ACCOUNTS.departmentAdmin05, password: PASSWORD },
  });
  await request.delete(`${BACKEND_URL}/api/program-subjects/${PROGRAM}/${MINE}`);
  await request.delete(`${BACKEND_URL}/api/subjects/${MINE}`);
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  try {
    await place(request);
  } finally {
    await request.dispose();
  }
});

test.afterAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  try {
    await unplace(request);
  } finally {
    await request.dispose();
  }
});

test('the grid draws every subject of the curriculum against every ข้อหลัก of it', async ({
  page,
}) => {
  // The first criterion, as a person meets it: two axes on one screen, with the
  // coverage the seed already recorded showing in the squares it belongs to.
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);

  const codes = await listedCodes(page);
  expect(codes).toContain('PLO-1');
  // #100: the columns are ข้อหลัก and nothing under them. 0501 has thirteen
  // ข้อหลัก and thirty-nine ข้อย่อย; the second number must not be on screen.
  // Both halves are asserted — the count alone would pass on a grid that drew
  // thirteen ข้อย่อย, and the absence alone on a grid that drew nothing.
  expect(codes).toHaveLength(13);
  expect(codes.filter(code => code.split('-').length > 2)).toEqual([]);
  expect(codes).not.toContain('PLO-1-1');

  await expect(subjectRow(page, SEEDED_SUBJECT)).toHaveCount(1);
  await expect(subjectRow(page, MINE)).toHaveCount(1);

  // The seeded coverage is in the square it belongs to, and a column the seed
  // left alone is empty. Both halves, because a grid that drew every square
  // filled and one that drew every square empty would each pass on one of them.
  await expect(square(page, SEEDED_SUBJECT, SEEDED.code)).toHaveValue(SEEDED.level);
  await expect(square(page, SEEDED_SUBJECT, 'PLO-4')).toHaveValue('');
});

test('a level chosen in a square is written, and survives a reload', async ({ page }) => {
  // The second criterion. The reload is the whole row: a screen that holds the
  // choice in state and never sends it looks identical until the page is opened
  // again, and that is the failure a person meets a week later.
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);

  const written = await choose(page, MINE, FREE[0], 'D');
  expect(written.status()).toBe(200);
  await expect(square(page, MINE, FREE[0])).toHaveValue('D');

  await openMapping(page);
  await expect(square(page, MINE, FREE[0])).toHaveValue('D');
});

test('choosing again in the same square changes it rather than adding a second cell', async ({
  page,
}) => {
  // The third criterion, at this seam: the count is the claim, and it is asked
  // of the server rather than of the screen — a screen showing one dropdown per
  // square cannot show a duplicate even if one exists.
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);

  expect((await choose(page, MINE, FREE[1], 'I')).status()).toBe(200);
  expect((await choose(page, MINE, FREE[1], 'P')).status()).toBe(200);
  await expect(square(page, MINE, FREE[1])).toHaveValue('P');

  const grid = await (await askFor(page, PROGRAM)).json();
  const cells = grid.mappings.filter(
    cell => cell.subject_id === MINE && String(cell.outcome_id) === String(idOf(grid, FREE[1])),
  );
  expect(cells).toHaveLength(1);
  expect(cells[0].mapping_level).toBe('P');
});

test('a newly placed subject starts with every square empty, and E is not empty', async ({
  page,
}) => {
  // The fourth criterion, as a person sees it rather than as an absence in a
  // payload: the row is there, and every square on it is blank until somebody
  // says otherwise. The second half is the distinction the whole screen turns
  // on — `E` is a person saying "not served", and it draws as `–`, not as
  // nothing. A screen that drew them alike would lose the difference on the one
  // document the difference is for.
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);

  await expect(square(page, MINE, SEEDED.code)).toHaveValue('');
  await expect(square(page, MINE, 'PLO-1')).toHaveValue('');

  expect((await choose(page, MINE, FREE[2], 'E')).status()).toBe(200);
  await expect(square(page, MINE, FREE[2])).toHaveValue('E');
  // And still not the same as the square beside it, which nobody has touched.
  await expect(square(page, MINE, 'PLO-1')).toHaveValue('');
});

test('the export hands over a PDF named for the curriculum, with a Thai face embedded in it', async ({
  page,
}) => {
  // The fifth criterion, in the half a machine can hold. The filename is what a
  // person finds in their downloads folder; the two assertions on the bytes are
  // what stands between this file and a page of tofu. Take the `addFont` calls
  // out of `exportPdf.js` and a PDF still downloads, still opens, and still has
  // this name — and says nothing.
  //
  // The two byte assertions are one claim from two sides, not two claims: no
  // mutant kills either alone, because the only way this export names the face
  // is by embedding it. `/FontFile2` is here because *naming* a face and
  // *carrying* it are different things in PDF, and a file that only names it
  // draws the boxes anyway on a reader without TH Sarabun installed — a way for
  // this to regress that the face name on its own would not notice.
  //
  // What is NOT asserted here: that the vowels and tone marks are placed
  // correctly. Nothing in a browser can see that, and it is a hand-walked row.
  await signIn(page, ACCOUNTS.committee0501);
  await openMapping(page);

  const download = await exportPdf(page);
  expect(download.suggestedFilename()).toBe(`plo-mapping-${PROGRAM}.pdf`);

  const bytes = await fs.readFile(await download.path());
  expect(bytes.length).toBeGreaterThan(20_000);
  const raw = bytes.toString('latin1');
  expect(raw).toContain('THSarabun');
  expect(raw).toContain('/FontFile2');
});

test.describe('การเชื่อมโยงผลการเรียนรู้กับรายวิชา ที่ครึ่งจอ', () => {
  // Before #100 this row ran at the default window, because fifty-two columns
  // were wider than any of them. Thirteen ข้อหลัก and a 16rem subject column
  // come to roughly 1050px, which fits 1280 — so the window is narrowed here to
  // the half-screen #98 was actually reported on. The claim the row makes is
  // unchanged; only the width at which it becomes true has moved.
  test.use({ viewport: { width: 800, height: 800 } });

  test('the grid scrolls inside its own frame, and the subject column stays put', async ({
    page,
  }) => {
    // #98 on the table it was fixed for. The grid is wider than a half-screen
    // window, so the frame has to scroll rather than the page — and the รหัสวิชา
    // has to stay at the left edge while it does, or a square scrolled to at the
    // right belongs to a row nobody can name.
    await signIn(page, ACCOUNTS.committee0501);
    await openMapping(page);

    const frame = frameOf(page.locator('table'));
    const before = await frame.evaluate(box => ({
      client: box.clientWidth,
      scroll: box.scrollWidth,
    }));
    expect(before.scroll).toBeGreaterThan(before.client);

    const reached = await frame.evaluate(box => {
      box.scrollLeft = box.scrollWidth;
      return box.scrollLeft;
  });
  expect(reached).toBeGreaterThan(0);

  // The page did not travel with it, and the first cell of the row is still
  // against the left edge of the frame rather than scrolled off it.
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  const cell = await subjectRow(page, SEEDED_SUBJECT).locator('td:first-child').boundingBox();
  const box = await frame.boundingBox();
  expect(Math.abs(cell.x - box.x)).toBeLessThan(2);

  // And the square out at the right-hand end is a control a person can still
  // operate, which is the harm #98 was actually about: a table that scrolls but
  // hands back a column nobody can reach is fixed only on paper. The sticky
  // first cell is the thing most likely to be covering it, so this is asserted
  // after the scroll rather than before it.
  const last = (await listedCodes(page)).at(-1);
  expect((await choose(page, MINE, last, 'P')).status()).toBe(200);
  await expect(square(page, MINE, last)).toHaveValue('P');
  });
});

test('a committee member is refused the coverage of a curriculum that is not theirs', async ({
  page,
}) => {
  // The sixth criterion, enforced at the server. The screen builds its picker
  // from the reach, so there is no control that names another curriculum — the
  // request is made directly, from the signed-in browser, which is exactly the
  // shape of the attempt the criterion is about.
  await signIn(page, ACCOUNTS.committee0503);
  const refused = await askFor(page, PROGRAM);
  expect(refused.status()).toBe(403);

  // The other half: the same account reaches its own. A reach that refused
  // everybody would pass the line above and mean nothing.
  const own = await askFor(page, OTHER_PROGRAM);
  expect(own.status()).toBe(200);
});

test('the faculty administrator is refused this screen, menu or no menu', async ({ page }) => {
  // #79: the faculty keeps the list of หลักสูตร, and what is inside one is
  // decided below it. There is no menu item, so the way in is the address bar —
  // and the point of the row is that the address bar does not work either.
  await signIn(page, ACCOUNTS.facultyAdmin);
  const refused = await askFor(page, PROGRAM);
  expect(refused.status()).toBe(403);

  await page.goto('/main/mapping-plo');
  await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();
});
