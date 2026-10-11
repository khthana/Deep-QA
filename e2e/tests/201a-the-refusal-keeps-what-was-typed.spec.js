'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isGet, isWrite } = require('../support/gate');
const { chooseFile } = require('../support/import-panel');
const { mySectionIds } = require('../support/enrolment-screen');
const { openWeights, schemeOnScreen, weightInput } = require('../support/weights-screen');
const {
  activityPicker,
  gridHeading,
  gridRows,
  openScores,
} = require('../support/scores-screen');

/**
 * #201 — a refused read keeps what the person typed, and the two screens #151
 * never reached.
 *
 * #151 carried #149 one step on for the seven card screens: **a failed reload
 * keeps what the screen last drew**, and its refusal is the banner above it. The
 * rule never reached the two screens that hold a *draft* — สัดส่วนคะแนน and
 * คะแนนกิจกรรม — and both threw it away:
 *
 * - `GradingWeights.load`'s `catch` set `data` to `null` **and** `draft` to `[]`.
 *   The whole screen is drawn inside `{data && (` and every input reads `draft`,
 *   so the two are one decision rather than two.
 * - `ActivityScores.load`'s `catch` set `data` to `null` only, and said the rest
 *   through `recorded` (`if (!data) return {}`) and the effect that writes
 *   `setDraft(recorded)`: one refusal wiped a whole class of typed marks with no
 *   line in the file saying it would.
 *
 * ## Why the second screen is not the first screen's deletion
 *
 * `ActivityScores.load` depends on `activityId` as well as `sectionId`, so a
 * refused read is one of two things, and only one of them is #151's:
 *
 * | the refused read | keeping what was drawn |
 * |---|---|
 * | the re-read after an import, same Activity | **right** — #151 exactly |
 * | the read a move of the picker asks for | **wrong** — the grid and the heading are the Activity left behind (`activity = data?.activity`) while the picker is on the new one |
 *
 * The owner settled it on 11 October 2569: **keep it when the Activity is the
 * same, clear it when the picker moves**. Row 3 is that second half — the net
 * that says *only*, in #155's shape, and the row a fix written unconditionally
 * fails.
 *
 * ## How a read is made to fail
 *
 * `gate`, as `151a` does it: the write a save or an import sends is answered
 * with a crafted 200 and the read that follows with a crafted 409 carrying
 * `REFUSED`, so **nothing here reaches the database** and there is nothing to put
 * back: no `hold()`, and `leftovers.js` reports this file's three sign-ins in
 * `user_log` and nothing else — the one table nobody can clean (#132). The
 * rows read once, after the refusal has reached the page and `SETTLE_MS` for its
 * commit (#50, #52) — a retrying read against a screen that is being blanked
 * would pass whichever way the code went.
 */

/** The refusal — worded so nothing on either screen says it. */
const REFUSED = 'การอ่านของแถว #201 ถูกปฏิเสธ';

/** Typed into the scheme: not the seeded 40, so the draft is provably the person's. */
const TYPED_WEIGHT = '37';

/** Typed into the grid: a mark no record holds, for the same reason. */
const TYPED_MARK = '6.25';

const SETTLE_MS = 250;

const WEIGHTS = /^\/api\/teaching\/sections\/\d+\/weights$/;
const SCORES_READ = /\/activities\/\d+\/scores$/;
const SCORES_IMPORT = /\/activities\/\d+\/scores\/import$/;

/** The refusal is on the screen once — the claim the owner's answer is shaped around. */
async function refusalShown(page) {
  expect(await page.getByText(REFUSED).count(), "the refused read's refusal").toBe(1);
}

/** The grid's first cell, found by the row it is in rather than by whose mark it is. */
const firstCell = (page) => gridRows(page).first().locator('input').first();

/** Lets the write go, then the refused read, and waits for the commit. */
async function refuseTheRead(page, { write, read }) {
  if (write) {
    await write.sent;
    write.open();
  }
  await read.sent;
  read.open();
  await read.answered;
  await page.waitForTimeout(SETTLE_MS);
}

test('สัดส่วนคะแนน: การอ่านใหม่ที่ถูกปฏิเสธเก็บตารางและตัวเลขที่พิมพ์ไว้', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openWeights(page, section);

  const drawn = await schemeOnScreen(page);
  expect(drawn.length, 'the seeded scheme should draw more than one row').toBeGreaterThan(1);
  await weightInput(page, 1).fill(TYPED_WEIGHT);

  const write = await gate(page, WEIGHTS, isWrite, { success: {} });
  const read = await gate(page, WEIGHTS, isGet, { refusal: REFUSED });
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await refuseTheRead(page, { write, read });

  await refusalShown(page);
  // The rows first, because a value read off an input that is no longer there
  // answers the same as one read off an empty one (#164).
  expect(await schemeOnScreen(page), 'the scheme the screen last drew').toHaveLength(drawn.length);
  expect(await weightInput(page, 1).inputValue(), 'what was typed').toBe(TYPED_WEIGHT);
});

test('คะแนนกิจกรรม: คะแนนที่พิมพ์ไว้รอดการอ่านใหม่ที่ถูกปฏิเสธหลังการนำเข้า', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openScores(page, section);

  await expect(firstCell(page)).toBeVisible();
  const rows = await gridRows(page).count();
  const heading = await gridHeading(page).innerText();
  await firstCell(page).fill(TYPED_MARK);

  const write = await gate(page, SCORES_IMPORT, isWrite, { success: { created: 1 } });
  const read = await gate(page, SCORES_READ, isGet, { refusal: REFUSED });
  await chooseFile(page, { text: 'รหัสนักศึกษา,คะแนน\r\n', name: 'marks-201.csv' });
  await refuseTheRead(page, { write, read });

  await refusalShown(page);
  expect(await gridRows(page).count(), 'the grid the screen last drew').toBe(rows);
  expect(await gridHeading(page).innerText(), 'the Activity the grid is headed with').toBe(heading);
  expect(await firstCell(page).inputValue(), 'the mark typed before the import').toBe(TYPED_MARK);
});

test('คะแนนกิจกรรม: การสลับกิจกรรมที่การอ่านถูกปฏิเสธ ไม่เก็บกริดของกิจกรรมเดิม', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [section] = await mySectionIds(page);
  await openScores(page, section);

  await expect(firstCell(page)).toBeVisible();
  const picker = activityPicker(page);
  const chosen = await picker.inputValue();
  const values = await picker.locator('option').evaluateAll((options) =>
    options.map((option) => option.value).filter(Boolean),
  );
  const other = values.find((value) => value !== chosen);
  expect(other, 'the seed should give this Section a second Activity').toBeTruthy();

  const read = await gate(page, SCORES_READ, isGet, { refusal: REFUSED });
  await picker.selectOption(other);
  await refuseTheRead(page, { read });

  await refusalShown(page);
  // The question changed, so what was drawn is not an answer to it any more.
  expect(await gridRows(page).count(), 'the grid of the Activity left behind').toBe(0);
});
