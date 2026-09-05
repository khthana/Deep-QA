'use strict';

const { expect } = require('@playwright/test');

/**
 * ผลการเรียนรู้ระดับหลักสูตรรายบุคคล — #45, as a browser reaches it.
 *
 * The screen owns no data and writes nothing, so what the rows here are for is
 * the half that only exists in front of the screen: that the intake picker
 * drives the roll, that choosing a student from the roll fetches *that*
 * student, that the report they land on is the row the heatmap draws for them,
 * and that an outcome nobody measured them on offers no drill-down to open.
 *
 * The arithmetic is not here. `backend/test/program-results.test.js` owns the
 * roll-up, the blank rule, the agreement with the heatmap and who is refused
 * which student; a row here asserting a mean would be that claim in a second
 * place — the place that goes stale.
 */

const PATH = '/main/programLevelIndividual';

const ROLL_API = '/api/program-results/by-intake/roll';

/** Opens the screen and waits for the roll the intake picker defaults to. */
async function openIndividual(page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) => new URL(answer.url()).pathname === ROLL_API && answer.status() === 200,
    ),
    page.goto(PATH),
  ]);
  return response;
}

/** The intake dropdown. The curriculum beside it is a label for every seeded account. */
const intakePicker = (page) => page.getByLabel('ปีรับเข้า');

/**
 * Puts one intake's roll on screen, whichever one the picker opened on.
 *
 * #42's helper, and it is here for the reason that one gives: *newest* is not
 * a constant, because the import rows earlier in this suite enrol students of
 * a later intake than the seed has. A row that read whatever the screen opened
 * on would pass alone and fail in the suite.
 */
async function showIntake(page, admissionYear) {
  const picker = intakePicker(page);
  await expect(picker).not.toHaveValue('');
  if ((await picker.inputValue()) === admissionYear) return null;
  const [response] = await Promise.all([
    page.waitForResponse(
      (answer) =>
        new URL(answer.url()).pathname === ROLL_API &&
        new URL(answer.url()).searchParams.get('admission_year') === admissionYear,
    ),
    picker.selectOption(admissionYear),
  ]);
  return response;
}

/** The search box above the roll. */
const searchBox = (page) => page.getByLabel('ค้นหานักศึกษาด้วยรหัสหรือชื่อ');

/** The roll, and its rows. Named, so a row can count it without counting the page. */
const rollList = (page) => page.getByRole('list', { name: 'รายชื่อนักศึกษา' });
const rollRows = (page) => rollList(page).getByRole('listitem');

/**
 * One student's row in the picker, addressed by the accessible name it carries.
 *
 * Code *and* name, because that is what a committee is asked to recognise and
 * matching on the code alone would let a row pass on a list that showed nothing
 * but codes.
 */
const rollRow = (page, studentId, fullName) =>
  page.getByRole('button', { name: `${studentId} ${fullName}` });

/** Chooses a student and waits for the report about them, not about anybody else. */
async function chooseStudent(page, studentId, fullName) {
  const [response] = await Promise.all([
    page.waitForResponse((answer) =>
      new URL(answer.url()).pathname.endsWith(`/api/program-results/students/${studentId}`),
    ),
    rollRow(page, studentId, fullName).click(),
  ]);
  return response;
}

/**
 * The line naming who is on screen.
 *
 * Matched on the code and the name together, in the order the report writes
 * them. The picker beside it writes the same two the other way round, so a
 * helper that looked for the code alone would be satisfied by the row that was
 * clicked rather than by the report it opened.
 */
const whoLine = (page, studentId, fullName) =>
  page.getByText(`${studentId} ${fullName}`, { exact: true });

/** One outcome's row of the report, found by the code in its first cell. */
const outcomeRow = (page, code) =>
  page.getByRole('row').filter({ has: page.getByText(code, { exact: true }) });

/** Opens or closes one outcome's drill-down. */
const sourceButton = (page, code) =>
  outcomeRow(page, code).getByRole('button', { name: /ที่มา$/ });

/** The panel the drill-down is drawn in, once it has arrived. */
const drillDown = (page) => page.getByRole('heading', { name: /^ที่มาของ / });

/**
 * One outcome's score cell, addressed by the sentence it is read aloud as.
 *
 * The score is a number in a coloured chip, which is two ways of saying one
 * thing to a reader who sees both and no way at all to one who sees neither —
 * #38's hand-walk finding. Addressing by the label is how a row asserts the
 * label is there, and naming the *student* in it is how a row asserts the
 * report on screen is about the person who was chosen.
 *
 * An outcome nobody measured this student against says so instead, and its
 * label carries no student code at all — which is why the caller passes both
 * shapes rather than this helper guessing.
 */
const scoreCell = (page, studentId, code) =>
  page.locator(`[aria-label^="${studentId} ${code} "]`);

/** The same cell where the student has no score: the row says so in words. */
const unmeasuredCell = (page, code) =>
  page.locator(`[aria-label="${code} ยังไม่มีการวัด"]`);

module.exports = {
  PATH,
  openIndividual,
  showIntake,
  intakePicker,
  searchBox,
  rollList,
  rollRows,
  rollRow,
  chooseStudent,
  whoLine,
  outcomeRow,
  sourceButton,
  drillDown,
  scoreCell,
  unmeasuredCell,
};
