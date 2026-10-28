'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite, isGet } = require('../support/gate');
const plos = require('../support/plos-screen');
const programSubjects = require('../support/program-subjects-screen');
const { openRubrics, rubricRow } = require('../support/rubrics-screen');
const { openCriteriaVia } = require('../support/rubric-criteria-screen');

/**
 * #242 — the four forms that closed their fields with the page's flag.
 *
 * `docs/acceptance/18-program-subjects.md`, `19-programme-learning-outcomes.md`,
 * `21-rubrics.md` and `22-rubric-criteria.md`, two rows each. These four forms
 * gave every control `disabled={busy}`, and `busy` is the **page's** flag -
 * `writing || reading`, true while any read or write of the screen is out. #228
 * settled on 26 ตุลาคม 2569 that the flag closing a form's fields is the
 * **form's own**, and three screens were changed that day; the reason the owner
 * gave was a sentence about those three and silent about these four, which is
 * the population this ticket is.
 *
 * ## The way in, and why it is a defect rather than a question
 *
 * Nothing here has to race anybody. `save` puts `writing` down in a `finally`
 * that runs **after** the list re-read, so on a save that succeeds the form
 * closes, the table comes back, and the page is still busy while that read is
 * out. เพิ่ม… is disabled by nothing on all four screens, so a form opened in
 * that window arrived with every field closed, by a save it did not send. The
 * window is one HTTP round trip and no clock chooses (#199's test for a defect
 * rather than a preference): the first row of each screen builds it by holding
 * that re-read, which is what the ticket asked to be measured before anything
 * was written (#141).
 *
 * Read against the unfixed code on 28 ตุลาคม 2569, every row of this file was
 * red, each at the assertion it is named for.
 *
 * ## What each row claims
 *
 * The first row is `228a`'s shape without its third step, in the order a mutant
 * has to be able to tell apart (#88):
 *
 * 1. two fields of the form that sent the save are closed while it is out -
 *    which `busy` did as well, and is the half this ticket must not lose;
 * 2. and the form opened **after** that save's own answer, with the list
 *    re-read still out, is live and accepts what is typed into it. That is the
 *    one a page-wide flag fails, and the one no second actor is needed for.
 *
 * *ยกเลิก* is read in the **second** row rather than here, and that is #88
 * measured rather than reasoned: with the cancel assertion between them, all
 * four of the first rows died on it against the unfixed code and step 2 - the
 * one the ticket asked to have measured - was never read at all.
 *
 * The second row is the price of the first, and the three guard lines that come
 * with it: *ยกเลิก* being pressable, which it asserts before pressing, is the
 * way in #146 is about, so the save's answer can now find a form it was not
 * sent from. It must then close nothing and say nothing - the question `146a`
 * asks of the four screens whose ยกเลิก was already free, asked here of the four
 * this ticket frees.
 *
 * The third row is the refusal half of that guard - the `catch` the same three
 * lines close - and ผลการเรียนรู้ระดับหลักสูตร is the one screen that carries it,
 * the clause being the same shape at all four sites (`146a`'s `refusalRow`).
 *
 * `142a`'s fourth row is the other half of that price and is paid in that file:
 * its `cancelDuringSave` marked exactly these four screens as the ones where
 * the order could not start, and since this ticket it runs on all seven.
 *
 * ## What this file writes
 *
 * Nothing. Every save is answered at the route with a crafted 200, so no row
 * reaches the database, and the typing in the rows' last step is never saved.
 */

/** The answer a held save is given: a body every one of these routes could send. */
const SAVED = {};

/**
 * The refusal the third row's save is given — worded so no screen could say it
 * by itself (#93). One screen carries that row: the `catch` it is about is the
 * same clause at four sites, asked once per shape, which is `146a`'s own
 * `refusalRow` convention.
 */
const REFUSED = 'ไม่อนุญาตให้บันทึกรายการนี้ (แถวของ #242)';

/** Typed into the form that sent nothing, which is the last step's instrument. */
const TYPED = 'ข้อความของฟอร์มที่ไม่ได้ส่งอะไร #242';

/** The sentence all four screens say when a save they sent lands. */
const SAID = 'บันทึกข้อมูลเรียบร้อยแล้ว';

/**
 * How long the commit of a form being closed is given before the second row
 * reads the screen - `146a`'s number and its reasons, which this is the same
 * shape as. It can decide (#52), and what stands behind it is the sweep.
 */
const SETTLE_MS = 250;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const heading = (page, name) => page.getByRole('heading', { name, exact: true });

/** The form's own ยกเลิก, which is the control #228's answer leaves alone. */
const cancelButton = (page) =>
  page.locator('form').getByRole('button', { name: 'ยกเลิก', exact: true });

/** The list request every save ends with, held or waited for by both rows. */
function waitForReload(page, list) {
  return page.waitForResponse(
    (answer) =>
      list.test(new URL(answer.url()).pathname) && answer.request().method() === 'GET',
  );
}

/** Presses แก้ไข on the first row of the list and waits for the form it opens. */
async function openFirstEditor(page, screen) {
  const rows = page
    .locator('table')
    .first()
    .locator('tbody tr')
    .filter({ has: page.getByRole('button', { name: 'แก้ไข', exact: true }) });
  await expect(rows.first()).toBeVisible();
  await button(rows.first(), 'แก้ไข').click();
  await expect(heading(page, screen.edit)).toBeVisible();
}

/**
 * The four screens, by the form whose flag this ticket moves.
 *
 * `detail` is the path a row is saved on and `list` the one the save reloads;
 * `fields` two controls of the edit form, read by a label or a placeholder
 * rather than by role where the label wraps the control and a hint joins its
 * accessible name (#180); `fresh` the field of the add form, which is the one
 * the third step types into.
 *
 * Which two fields each row reads is chosen by the mutant and not by the
 * screen: each is a control whose `disabled={sending}` line has a unique ASCII
 * neighbour to anchor on - `maxLength`, a `step`, a `min`, a `set('…_type')` -
 * so `242-the-form-that-sent-nothing.py` edits the code a mutant breaks and
 * never a Thai placeholder beside it (#121, and the retyping no diff proofreads).
 * Two of the four therefore read a number box by its `step`, which is what the
 * attribute is for here and is the premise those two reads rest on (#85, #111).
 */
const SCREENS = [
  {
    name: 'รายวิชาในหลักสูตร (ProgramSubjectForm.js)',
    file: 'ProgramSubjects.js',
    account: ACCOUNTS.committee0501,
    open: (page) => programSubjects.openProgramSubjects(page),
    detail: /^\/api\/program-subjects\/[^/]+\/[^/]+$/,
    list: /^\/api\/program-subjects$/,
    edit: 'แก้ไขรายวิชาในหลักสูตร',
    add: 'เพิ่มรายวิชาเข้าหลักสูตร',
    addHeading: 'เพิ่มรายวิชาเข้าหลักสูตร',
    fields: (page) => [programSubjects.typePicker(page), programSubjects.statusPicker(page)],
    fresh: (page) => page.getByPlaceholder(/เช่น 01076105/),
  },
  {
    name: 'ผลการเรียนรู้ระดับหลักสูตร (PloForm.js)',
    file: 'Plos.js',
    account: ACCOUNTS.departmentAdmin05,
    open: (page) => plos.openPlos(page),
    detail: /^\/api\/plos\/\d+$/,
    list: /^\/api\/plos$/,
    edit: 'แก้ไขผลการเรียนรู้ของหลักสูตร',
    add: 'เพิ่มผลการเรียนรู้',
    addHeading: 'เพิ่มผลการเรียนรู้ของหลักสูตร',
    fields: (page) => [
      page.getByLabel('ชื่อผลการเรียนรู้', { exact: true }),
      plos.typePicker(page),
    ],
    fresh: (page) => page.getByPlaceholder('สิ่งที่ผู้สำเร็จการศึกษาทำได้'),
    refusalRow: true,
  },
  {
    name: 'Rubric (RubricForm.js)',
    file: 'Rubrics.js',
    account: ACCOUNTS.committee0501,
    open: (page) => openRubrics(page),
    detail: /^\/api\/rubrics\/\d+$/,
    list: /^\/api\/rubrics$/,
    edit: 'แก้ไข Rubric',
    add: 'เพิ่ม Rubric',
    addHeading: 'เพิ่ม Rubric',
    fields: (page) => [
      page.getByPlaceholder('เช่น RUB-12'),
      page.locator('form input[type="number"]'),
    ],
    fresh: (page) => page.getByPlaceholder('เช่น การนำเสนอผลงาน'),
  },
  {
    name: 'เกณฑ์การให้คะแนน (CriterionForm.js)',
    file: 'RubricCriteria.js',
    account: ACCOUNTS.committee0501,
    // RUB-01 is the seeded rubric with the most criteria, reached through #21's link.
    open: async (page) => {
      await openRubrics(page);
      await openCriteriaVia(page, rubricRow(page, 'RUB-01'));
    },
    detail: /^\/api\/rubrics\/\d+\/criteria\/\d+$/,
    list: /^\/api\/rubrics\/\d+\/criteria$/,
    edit: 'แก้ไขเกณฑ์การให้คะแนน',
    add: 'เพิ่มเกณฑ์',
    addHeading: 'เพิ่มเกณฑ์การให้คะแนน',
    fields: (page) => [
      page.locator('form input[step="0.01"]'),
      page.locator('form input[step="1"]'),
    ],
    fresh: (page) => page.getByPlaceholder('เช่น ความถูกต้องของเนื้อหา'),
  },
];

for (const screen of SCREENS) {
  test.describe(`${screen.name}`, () => {
    test('a save that is out closes the fields of the form that sent it, and a form opened while the list is being re-read is live', async ({
      page,
    }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      await openFirstEditor(page, screen);

      const [first, second] = screen.fields(page);
      // The precondition, asserted where it is used and not where it was
      // arranged (#51): a field already closed would make every read below true
      // for the wrong reason.
      await expect(first).toBeEnabled();
      await expect(second).toBeEnabled();

      const write = await gate(page, screen.detail, isWrite, { success: SAVED });
      const reload = await gate(page, screen.list, isGet);
      await button(page, 'บันทึก').click();
      await write.sent;

      // 1 - the form that sent it. Each assertion carries the string the four
      // sheets cite it by, a citation by line number ageing the day anything
      // above it grows (#173).
      await expect(first, 'the first field of the form that sent the save').toBeDisabled();
      await expect(second, 'the second field of the form that sent the save').toBeDisabled();

      // 2 - the save lands, the form closes, and the page is still busy because
      // its list re-read is held here. เพิ่ม… is disabled by nothing, so this is
      // the window a person meets with nobody else on the system.
      write.open();
      await write.answered;
      await reload.sent;
      await expect(heading(page, screen.edit)).toBeHidden();

      await button(page, screen.add).click();
      const fresh = screen.fresh(page);
      await expect(fresh, 'the field of a form that sent nothing').toBeEnabled();
      await fresh.fill(TYPED);
      expect(await fresh.inputValue(), 'what the fresh form accepted').toBe(TYPED);

      reload.open();
      await reload.answered;
    });

    test('a save answered after ยกเลิก and เพิ่ม leaves that form alone and says nothing', async ({
      page,
    }) => {
      await signIn(page, screen.account);
      await screen.open(page);
      await openFirstEditor(page, screen);

      const write = await gate(page, screen.detail, isWrite, { success: SAVED });
      await button(page, 'บันทึก').click();
      await write.sent;

      // Read as a claim before it is pressed, and not left to the press: a
      // click on a disabled control dies at the timeout rather than at the
      // assertion the row is about (#139). This is what makes the rest of the
      // row reachable at all - before this ticket ยกเลิก took the page's flag
      // and the order could not start (`142a`'s `cancelDuringSave`).
      await expect(cancelButton(page), 'ยกเลิก while this form owns the save').toBeEnabled();
      await cancelButton(page).click();
      await expect(heading(page, screen.edit)).toBeHidden();

      await button(page, screen.add).click();
      const form = heading(page, screen.addHeading);
      await expect(form).toBeVisible();
      const fresh = screen.fresh(page);
      await fresh.fill(TYPED);

      const reloaded = waitForReload(page, screen.list);
      write.open();
      await write.answered;
      await reloaded;
      await page.waitForTimeout(SETTLE_MS);

      expect(await form.isVisible(), 'the add form after the save answered').toBe(true);
      expect(await fresh.inputValue(), 'what was typed into it').toBe(TYPED);
      expect(await page.getByText(SAID).count(), "the first save's sentence").toBe(0);
    });

    if (screen.refusalRow) {
      test('a save refused after ยกเลิก and เพิ่ม says nothing over that form', async ({
        page,
      }) => {
        await signIn(page, screen.account);
        await screen.open(page);
        await openFirstEditor(page, screen);

        const write = await gate(page, screen.detail, isWrite, { refusal: REFUSED });
        await button(page, 'บันทึก').click();
        await write.sent;

        await cancelButton(page).click();
        await expect(heading(page, screen.edit)).toBeHidden();

        await button(page, screen.add).click();
        const form = heading(page, screen.addHeading);
        await expect(form).toBeVisible();

        // A refused save reloads nothing and a sentence rightly not drawn
        // leaves no mark to wait for (#50), so `SETTLE_MS` is all there is -
        // `146a`'s third row and its reasons.
        write.open();
        await write.answered;
        await page.waitForTimeout(SETTLE_MS);

        expect(await page.getByText(REFUSED).count(), 'the overtaken refusal').toBe(0);
        expect(await form.isVisible(), 'the add form after the refusal').toBe(true);
      });
    }
  });
}
