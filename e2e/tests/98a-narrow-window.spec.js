'use strict';

const { test, expect } = require('@playwright/test');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { settled } = require('../support/pager');
const {
  openRubrics,
  rubricRow,
  addRubric,
  startRemoval: startRubricRemoval,
  confirmRemoval: confirmRubricRemoval,
} = require('../support/rubrics-screen');
const {
  table,
  openCriteriaVia,
  addCriterion,
  criterionRow,
} = require('../support/rubric-criteria-screen');
const { openUsers, listTable } = require('../support/users-screen');

/**
 * #98 — a table wider than the window scrolls inside its own frame instead of
 * being clipped, so the rightmost column stays reachable.
 *
 * **Why this file sets its own viewport.** The project default is
 * `devices['Desktop Chrome']`, and so is the browser the hand-walk uses until
 * somebody drags its edge. That default width is exactly why all three test
 * seams missed the defect: the criteria table wants about 1,060px, the desktop
 * window is wider than that, and nothing overflows. Narrowing the window is the
 * whole experiment, so it belongs to this file rather than to the project —
 * changing the project default would re-run twenty-five specs at a width none
 * of them was written for.
 *
 * This is not the first file to override the viewport: `55a-notice-in-view`
 * takes 900×400, the same width. It narrows for the height, to put a notice
 * below the fold. This is the first file to narrow *for* the width, and the
 * only one whose assertions are about what the width does.
 *
 * **Why it clicks rather than looks.** A clipped button is still in the DOM,
 * still has a bounding box, and `toBeVisible()` is true of it. It is even still
 * clickable through `locator.click()`, which scrolls any ancestor it can —
 * including one whose `overflow-x-hidden` gives a person no scrollbar at all.
 * So the assertions here are the two things a person actually has: the table's
 * own frame must scroll when scrolled, and the button must land inside the
 * window afterwards, where a real mouse can reach it. The click is
 * `page.mouse.click` at those coordinates for that reason — it hits whatever is
 * drawn at that point, and hits nothing if the button is off the edge.
 *
 * **Why two widths.** The ticket says every table, and the fix is in the shell
 * rather than on any one screen, so a second screen has to say so. But the
 * screens do not all break at the same width, and this was measured rather than
 * assumed: with the defect put back, at 900px `<main>` is 1,100px on the
 * criteria screen and exactly 900 — unaffected — on all eight other list
 * screens. It takes 500px before ข้อมูลผู้ใช้งาน blows out too, to 852. So the
 * criteria rows run at half a 1920 desktop, which is where the defect was
 * found, and the second screen runs at the width its own table needs.
 *
 * **Why the rows are not `serial`, unlike #21's and #22's.** They share one
 * rubric, but `openMine` makes it only if it is not already there, and removing
 * it is `afterAll`'s job rather than a row's.
 * So each row stands up its own state instead of inheriting it, and a row that
 * fails no longer skips the ones below it. That mattered while proving these
 * assertions: under the mutant that puts the defect back, `serial` reported one
 * failure and hid what the other rows would have said.
 */

/** The rubric this file makes and takes away again. */
const MINE = 'RUB-W1';

/** A band description of the length a real one runs to; four of these is the width. */
const LONG =
  'ตอบคำถามได้ตรงประเด็นทุกข้อ อธิบายเหตุผลเบื้องหลังคำตอบได้อย่างชัดเจน และยกตัวอย่างจากงานของตนมาสนับสนุนคำตอบได้โดยไม่ต้องให้ผู้ถามถามซ้ำ';

const NAME = 'การตอบคำถามจากผู้ฟัง';

/** The frame a table sits in — the element whose scrollbar a person uses. */
const frameOf = locator => locator.locator('xpath=..');

/** What the shell looks like from inside the page, in numbers. */
const shapeOf = page =>
  page.evaluate(() => ({
    crumb: document.querySelector('main > div').getBoundingClientRect().x,
    docScroll: document.documentElement.scrollWidth,
    docClient: document.documentElement.clientWidth,
    pageX: window.scrollX,
    main: document.querySelector('main').getBoundingClientRect().width,
  }));

/**
 * Opens the rubric this file owns, making it and its one wide criterion if the
 * row that ran before this one has not already.
 */
async function openMine(page) {
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const already = await rubricRow(page, MINE).count();
  if (!already) {
    // Order 0 for #22's reason: 0501 holds eleven rubrics and the list pages at
    // ten, so a twelfth ordered last would be on a second page.
    const made = await addRubric(page, {
      code: MINE,
      th: 'ความกว้างของตาราง',
      en: 'Table width',
      order: 0,
    });
    expect(made.status()).toBe(201);
  }

  await openCriteriaVia(page, rubricRow(page, MINE));

  if (!already) {
    const added = await addCriterion(page, {
      th: NAME,
      en: 'Answering audience questions',
      weight: 12.5,
      order: 1,
      bands: [LONG, LONG, LONG, LONG],
    });
    expect(added.status()).toBe(201);
  }
  await expect(criterionRow(page, NAME)).toHaveCount(1);
}

/**
 * Takes the rubric away again, in a window of the ordinary width.
 *
 * Not a row, because it asserts nothing about #98 and a row that cannot fail
 * when the code is broken does not belong in a file whose whole point is that
 * its assertions notice.
 *
 * Nothing downstream depends on this running: the schema is reseeded every run
 * and this file sorts last, so a rubric left behind would outlive no other
 * spec's assertions. It is here so that a run stopped halfway leaves the
 * database as it found it, and so a person opening the walk stack afterwards
 * does not meet a rubric no seed ever made.
 */
test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.committee0501);
    await openRubrics(page);
    await settled(table(page));
    if (await rubricRow(page, MINE).count()) {
      await startRubricRemoval(page, MINE);
      await confirmRubricRemoval(page);
      await expect(rubricRow(page, MINE)).toHaveCount(0);
    }
  } finally {
    await page.close();
  }
});

test.describe('เกณฑ์การให้คะแนน ที่ครึ่งจอ', () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test('the จัดการ column of a too-wide table can be scrolled to and pressed', async ({ page }) => {
    await openMine(page);
    const frame = frameOf(table(page));

    // The table really is wider than its frame; without this the rest of the row
    // would pass on a table that simply fits, and prove nothing. This is also
    // the line the defect kills first — with `<main>` free to grow, the frame
    // grew with it and the two numbers were equal.
    const before = await frame.evaluate(box => ({
      client: box.clientWidth,
      scroll: box.scrollWidth,
      left: box.scrollLeft,
    }));
    expect(before.scroll).toBeGreaterThan(before.client);
    expect(before.left).toBe(0);

    // #98's second criterion, the half about the table: its own frame scrolls.
    // This is the affordance a person has — the scrollbar under the table.
    const reached = await frame.evaluate(box => {
      box.scrollLeft = box.scrollWidth;
      return box.scrollLeft;
    });
    expect(reached).toBeGreaterThan(0);

    // #98's first criterion: after that scroll the button is inside the window,
    // where a mouse can reach it.
    const remove = criterionRow(page, NAME).getByRole('button', { name: 'ลบ', exact: true });
    const spot = await remove.boundingBox();
    const viewport = await page.evaluate(() => window.innerWidth);
    expect(spot.x).toBeGreaterThanOrEqual(0);
    expect(spot.x + spot.width).toBeLessThanOrEqual(viewport);

    // Pressed where it is drawn, rather than through a locator that would scroll
    // an ancestor a person cannot scroll.
    await page.mouse.click(spot.x + spot.width / 2, spot.y + spot.height / 2);
    await expect(page.getByRole('heading', { name: 'ยืนยันการลบเกณฑ์การให้คะแนน' })).toBeVisible();
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  });

  test('the page itself does not scroll, and the breadcrumb stays where it is', async ({ page }) => {
    await openMine(page);

    const still = await shapeOf(page);
    await frameOf(table(page)).evaluate(box => {
      box.scrollLeft = box.scrollWidth;
    });
    const after = await shapeOf(page);

    // #98's second criterion, the half about the page: what scrolled was the
    // table, not the document, and the breadcrumb bar did not travel with it.
    expect(after.docScroll).toBeLessThanOrEqual(after.docClient);
    expect(after.pageX).toBe(0);
    expect(after.crumb).toBe(still.crumb);

    // And the reason the rest holds: `<main>` fits the window rather than being
    // pushed past its right edge by the widest thing inside it.
    expect(after.main).toBeLessThanOrEqual(after.docClient);
  });
});

test.describe('ข้อมูลผู้ใช้งาน ที่จอแคบ', () => {
  test.use({ viewport: { width: 500, height: 800 } });

  test('a second screen is narrow-safe too, which is what makes this a shell fix', async ({
    page,
  }) => {
    // The fix is one line in Mainpage.js and every screen is inside it. This row
    // is here so that a change which repaired only the criteria screen would
    // still be caught.
    await signIn(page, ACCOUNTS.systemAdmin);
    await openUsers(page);
    await settled(listTable(page));

    const frame = frameOf(listTable(page));
    const box = await frame.evaluate(element => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(box.scroll).toBeGreaterThan(box.client);

    const reached = await frame.evaluate(element => {
      element.scrollLeft = element.scrollWidth;
      return element.scrollLeft;
    });
    expect(reached).toBeGreaterThan(0);

    const shape = await shapeOf(page);
    expect(shape.main).toBeLessThanOrEqual(shape.docClient);
    expect(shape.docScroll).toBeLessThanOrEqual(shape.docClient);
  });
});
