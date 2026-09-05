'use strict';

const { expect } = require('@playwright/test');

/**
 * เปรียบเทียบผลการเรียนรู้ระดับหลักสูตรข้ามรุ่น — #44, as a browser reaches it.
 *
 * The screen owns no data and writes nothing, and every figure on it is one
 * `backend/test/program-results.test.js` already has an opinion about. What
 * rows here are for is the part that only exists in front of the screen: that
 * the two ends of the range **drive** the report, that a year nobody was
 * admitted in is drawn as a column rather than closed up, and that a figure a
 * committee could check by holding two printouts side by side actually agrees
 * across the two screens.
 *
 * The helpers are separate from `program-results-screen.js` rather than added
 * to it because one row uses both at once — the agreement row opens #42, reads
 * a figure, and then opens this screen looking for the same one. A module that
 * held both screens' locators would make that row read as though it were about
 * one screen.
 */

const PATH = '/main/programLevelCompare';

const REPORT_API = '/api/program-results/across-intakes';

/** Opens the screen and waits for the report the range defaults to. */
async function openTrend(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === REPORT_API && answer.request().method() === 'GET',
    ),
    page.goto(PATH),
  ]);
  return response;
}

/**
 * The two ends of the range.
 *
 * Matched loosely rather than exactly, and the reason is worth writing down:
 * Playwright reads a wrapping label by its whole text content, and a
 * `<label>` around a `<select>` contains every option as well as the words.
 * The exact name therefore *changes* the moment the intakes arrive, so a
 * locator written with `exact` finds the control while it is empty and loses
 * it as soon as it is worth using.
 */
const fromPicker = (page) => page.getByLabel('ตั้งแต่ปีรับเข้า');
const toPicker = (page) => page.getByLabel('ถึงปีรับเข้า');

/**
 * Puts one range on screen, whichever one the report opened on.
 *
 * The ends are moved newest first so the range is never inside out on the way:
 * the screen drags the other end along when it would be, which is right for a
 * person and would make a row that set the ends in the other order ask for a
 * range it did not mean.
 *
 * The wait is for a response carrying *both* ends, because moving one end
 * fires a request that still has the old other end on it — and a row that
 * read the screen after the first of those would be reading a report on its
 * way somewhere else.
 */
async function showRange(page, from, to) {
  await expect(toPicker(page)).not.toHaveValue('');
  const wanted = (answer) => {
    const query = new URL(answer.url()).searchParams;
    return query.get('from_year') === from && query.get('to_year') === to;
  };
  if ((await fromPicker(page).inputValue()) === from && (await toPicker(page).inputValue()) === to) {
    return null;
  }
  const arrived = page.waitForResponse(wanted);
  await toPicker(page).selectOption(to);
  await fromPicker(page).selectOption(from);
  return arrived;
}

/** The table's own frame, so a row can ask whether there is one at all. */
const trendTable = (page) => page.getByRole('table');

/** One year's column header, found by the year it is headed with. */
const yearHeader = (page, year) =>
  page.getByRole('columnheader').filter({ hasText: new RegExp(`^${year}`) });

/**
 * One cell of the grid, addressed by the sentence it is read aloud as.
 *
 * A cell shows a figure and nothing else; what the figure is *of* is two
 * headers away, which is why the label carries the outcome, the year, the
 * figure and the verdict. Addressing by the label is how a row here asserts
 * that the label is there to address.
 */
const cellOf = (page, code, year) => page.locator(`[aria-label^="${code} ปีรับเข้า ${year} "]`);

module.exports = {
  PATH,
  REPORT_API,
  openTrend,
  fromPicker,
  toPicker,
  showRange,
  trendTable,
  yearHeader,
  cellOf,
};
