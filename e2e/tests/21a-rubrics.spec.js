'use strict';

const { test, expect } = require('@playwright/test');
const { REFUSALS } = require('../../backend/auth/refusals');
const { RUBRICS: SEEDED, RUBRICS_INTL } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { BACKEND_URL } = require('../support/env');
const { reading, keysOn, step, settled } = require('../support/pager');
const {
  RUBRICS,
  API,
  table,
  waitForList,
  openRubrics,
  rubricRow,
  editRow,
  programFilter,
  openAddForm,
  openEditor,
  addRubric,
  save,
  startRemoval,
  confirmRemoval,
  listedCodes,
  filterTo,
  criteriaLink,
  openRubricsOn,
} = require('../support/rubrics-screen');
const { statedLabel } = require('../support/stated-label');
const { saidBy } = require('../support/confirm-dialog');
const { menuLink } = require('../support/shell');
const {
  departmentCommittee,
  signInAsDepartmentCommittee,
} = require('../support/department-committee');

/**
 * docs/acceptance/21-rubrics.md — the scales a หลักสูตร marks against, read
 * through the screen that keeps them.
 *
 * The backend suite already proves what the routes answer. What only a browser
 * can show is the half these rows are about: that a code taken by a curriculum
 * this account cannot see is refused *with the sentence that explains why*,
 * that the list is in the order the committee set rather than the order of the
 * codes and stays settled where two rubrics claim the same place, that the
 * eleventh rubric is reachable by pressing ถัดไป, and that every row offers a
 * way into its criteria.
 *
 * Whether the confirmation *reads* like a warning about criteria that are about
 * to be destroyed is appearance, and stays a hand-walked row. That the deletion
 * happens and reports what went is here.
 *
 * ## #276, 14 พ.ย. 2569
 *
 * The owner's answer brought the screen back to the delivered shape: one
 * curriculum at a time with no *ทุกหลักสูตร*, the criteria behind an eye in
 * ดำเนินการ, the count column gone, and the add and edit forms drawn as rows of
 * the table. It also took the screen off the ผู้ดูแลภาควิชา, so the row that
 * reached two curricula signs in as a committee member of the department
 * (`support/department-committee.js`), and the department administrator joins
 * the accounts that are refused. Each row below that changed says so.
 *
 * `mode: 'serial'` because these rows add a rubric, edit it and take it away
 * again, and because the paging rows read a total the later rows change. Each
 * still makes the state it asserts on rather than inheriting an assertion from
 * the row above it. The paging rows come first for that reason: a row that
 * deleted a seeded rubric before them would leave ten, and a list of ten does
 * not page at all.
 */
test.describe.configure({ mode: 'serial' });

/**
 * Rows here take away a rubric the seed made, and its criteria with it -
 * put back when the file ends (#134).
 *
 * `support/hold.js` says what it puts back, and what it does not.
 */
let release;
let releaseCommittee;
let cleanupFailure = null;
test.beforeAll(async ({ playwright }) => {
  release = await hold();
  releaseCommittee = await departmentCommittee(playwright);
});
test.afterAll(async () => {
  cleanupFailure = releaseCommittee ? await releaseCommittee() : null;
  await release();
});
// Last, so a fixture left behind fails the file rather than the next one.
test.afterAll(() => {
  if (cleanupFailure) throw new Error(cleanupFailure);
});

/** The rubric this file adds to 0501 and takes away again. */
const MINE = 'RUB-Z1';

/** A seeded rubric of 0501 that the seed gave criteria to — see RUBRICS. */
const WITH_CRITERIA = SEEDED.find(entry => entry.criteria > 0);

test('a committee member is told which curriculum is theirs, and sees its rubrics', async ({
  page,
}) => {
  // The first criterion's setting, and the seventh as the person meets it: one
  // curriculum in reach is stated rather than asked about.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);

  await expect(statedLabel(page, 'หลักสูตร', 'วิศวกรรมคอมพิวเตอร์')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);

  await expect(rubricRow(page, SEEDED[0].code)).toContainText(SEEDED[0].th);
  await expect(rubricRow(page, SEEDED[0].code)).toContainText(SEEDED[0].en);
});

test('the list is in the stated order, not in the order of the codes', async ({ page }) => {
  // The fourth criterion's *respected*. The seed sorts RUB-02 above RUB-01 and
  // RUB-05 above RUB-04 for this row specifically — #96's lesson, learned in
  // #19 where every seeded order equalled the number in its own code and an
  // assertion on either ordering passed whichever the screen actually used.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const codes = await listedCodes(page);
  expect(codes.indexOf('RUB-02')).toBeLessThan(codes.indexOf('RUB-01'));
  expect(codes.indexOf('RUB-05')).toBeLessThan(codes.indexOf('RUB-04'));
});

test('two rubrics claiming the same place are drawn in a settled order', async ({ page }) => {
  // `display_order` is NOT NULL DEFAULT 0, so a tie is the state every rubric
  // starts out in rather than an edge case, and this list pages. RUB-06 and
  // RUB-07 share an order in the seed so the tiebreak has something to break;
  // unsettled, they can appear either way round and — across a page boundary —
  // one of them twice and the other never.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const tied = SEEDED.filter(entry => entry.order === 6).map(entry => entry.code);
  expect(tied, 'the seed no longer holds a tie for this row to read').toHaveLength(2);

  const codes = await listedCodes(page);
  expect(codes.indexOf(tied[1]) - codes.indexOf(tied[0])).toBe(1);
});

test('the eleventh rubric is on the second page, and no rubric is on both', async ({ page }) => {
  // The eighth criterion. The seed holds eleven rubrics for this curriculum
  // because ten would let a broken pager draw itself, say "หน้า 1 จาก 1", and
  // pass every assertion about it.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);

  const first = await reading(page, table(page));
  expect(first.total).toBeGreaterThan(10);
  expect(first.pages).toBeGreaterThan(1);
  const firstKeys = await keysOn(table(page));
  expect(firstKeys).toHaveLength(10);

  await step(page, 'forward', waitForList);
  const second = await reading(page, table(page));
  expect(second.shown).toBe(2);
  const secondKeys = await keysOn(table(page));
  expect(secondKeys.length).toBeGreaterThan(0);

  // Different pages of one list are different pages only if their keys are
  // disjoint. This is the assertion an unsettled tie fails.
  expect(firstKeys.filter(code => secondKeys.includes(code))).toEqual([]);
  expect(new Set([...firstKeys, ...secondKeys]).size).toBe(first.total);
});

test('every rubric offers a way into its criteria, and the way carries the rubric', async ({
  page,
}) => {
  // The fifth criterion. The criteria themselves are #22 and the destination
  // says so; what this screen owes the ticket is that each row has a door and
  // that the door leads to *that* rubric rather than to a screen that would
  // then have to ask which one. Since #276 the door is the eye in ดำเนินการ,
  // the delivered screen's ViewBT: a link the owner had been looking for there.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  const rows = await page.locator('table tbody tr').count();
  expect(
    await page
      .locator('table tbody tr')
      .getByRole('link', { name: 'ดูเกณฑ์การให้คะแนน' })
      .count(),
  ).toBe(rows);

  // *That* rubric: the address carries the id the list was given for the row,
  // read off the answer rather than guessed from the order.
  const listed = await page.request.get(`${BACKEND_URL}${API}?program_id=0501&per_page=100`);
  const target = (await listed.json()).rubrics.find(row => row.rubric_code === WITH_CRITERIA.code);
  await criteriaLink(page, WITH_CRITERIA.code).click();
  await expect(page).toHaveURL(new RegExp(`/main/rubrics/${target.id}/criteria$`));
});

test('the list is code, name, order and actions, and the name is both languages on one line', async ({
  page,
}) => {
  // #276's columns: no หลักสูตร, the list being one curriculum's, and no count
  // of criteria (*เอาออกแบบเดิม*). The name reads ไทย then อังกฤษ in one cell -
  // whether they share a line is a width the hand walk measures; that both are
  // there, in that order, is this row.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  expect(await page.locator('table thead th').allInnerTexts()).toEqual([
    'รหัส',
    'ชื่อ Rubric',
    'ลำดับ',
    'ดำเนินการ',
  ]);
  await expect(rubricRow(page, SEEDED[0].code).locator('td').nth(1)).toHaveText(
    `${SEEDED[0].th}${SEEDED[0].en}`,
  );
  await expect(rubricRow(page, SEEDED[0].code).locator('td').nth(2)).toHaveText(
    String(SEEDED[0].order),
  );
});

test('a rubric is added through the form, edited, and is not there until it is saved', async ({
  page,
}) => {
  // The first criterion, and the shape of it a browser can see: opening the
  // form is not creating anything. Since #276 the form is a row at the top of
  // the table, and its ลำดับ starts at the last one plus one - the delivered
  // screen's rule, answered by the server because the last one is on page two.
  await signIn(page, ACCOUNTS.committee0501);
  const opened = await openRubrics(page);
  await settled(table(page));
  const before = await listedCodes(page);
  const nextOrder = (await opened.json()).next_order;
  expect(nextOrder, 'past every seeded order').toBeGreaterThan(
    Math.max(...SEEDED.map(entry => entry.order)),
  );

  await openAddForm(page);
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await expect(editRow(page)).toHaveCount(1);
  expect(
    await page.locator('table tbody tr').first().getByRole('textbox', { name: 'รหัส Rubric' }).count(),
    'the add row is the first row of the table',
  ).toBe(1);
  await expect(page.getByRole('spinbutton', { name: 'ลำดับ' })).toHaveValue(String(nextOrder));
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(editRow(page)).toHaveCount(0);
  await settled(table(page));
  expect(await listedCodes(page)).toEqual(before);

  // Order 0 so the new rubric sorts to the top of the first page. Saving does
  // not carry the screen to whichever page the row landed on - no paged screen
  // on this system does - so a row that gave it order 91 would be asserting
  // that a rubric on page two is invisible, which is true and is not what this
  // row is about. docs/acceptance/21 records the gap.
  await addRubric(page, {
    code: MINE,
    th: 'เกณฑ์ที่เพิ่มระหว่างการทดสอบ',
    en: 'Rubric added under test',
    order: 0,
  });
  await expect(rubricRow(page, MINE)).toBeVisible();
  await expect(rubricRow(page, MINE)).toContainText('เกณฑ์ที่เพิ่มระหว่างการทดสอบ');

  // The edit row stands where the rubric stood, and ยกเลิก - which the
  // delivered edit row did not have (#276) - puts the row back as it was.
  await openEditor(page, MINE);
  await expect(rubricRow(page, MINE)).toHaveCount(0);
  await page.getByPlaceholder('เช่น การนำเสนอผลงาน').fill('ไม่ได้บันทึก');
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(rubricRow(page, MINE)).toContainText('เกณฑ์ที่เพิ่มระหว่างการทดสอบ');

  await openEditor(page, MINE);
  await expect(page.getByPlaceholder('เช่น การนำเสนอผลงาน')).toHaveValue(
    'เกณฑ์ที่เพิ่มระหว่างการทดสอบ',
  );
  await page.getByPlaceholder('เช่น การนำเสนอผลงาน').fill('เกณฑ์ที่ถูกแก้ไขแล้ว');
  await save(page);
  await expect(rubricRow(page, MINE)).toContainText('เกณฑ์ที่ถูกแก้ไขแล้ว');
});

test('a code held by a curriculum this account cannot see is refused, and the sentence says why', async ({
  page,
}) => {
  // The second criterion, in the direction that only a browser can show the
  // consequence of. `rubric_code` is UNIQUE across the institution, so 0503's
  // committee member cannot have RUB-01 — and cannot see the row that holds it
  // either. The refusal is the only thing that tells them the code is gone, so
  // it has to say ทั้งระบบ or they search their own eleven-row list, find it
  // free, and conclude the screen is broken.
  await signIn(page, ACCOUNTS.committee0503);
  await openRubrics(page);
  await settled(table(page));

  await expect(rubricRow(page, SEEDED[0].code)).toHaveCount(0);

  const refused = await addRubric(page, {
    code: SEEDED[0].code,
    th: 'ชื่ออื่น',
    en: 'Another name',
    order: 92,
  });
  expect(refused.status()).toBe(409);
  // The whole sentence, not a fragment of it: the form's own hint says ทั้งระบบ
  // too, so a match on that word alone would pass against a screen that had
  // refused silently and left the hint on display.
  await expect(page.getByText(REFUSALS.duplicateRubricCode)).toBeVisible();
});

test('an account holding two curricula is shown one at a time, the first to start with', async ({
  page,
}) => {
  // The seventh criterion from above. The two curricula hold disjoint codes,
  // which is the difference from #19 the walk sheet is careful about. Until
  // #276 the account was the department administrator and the list opened on
  // both; now it is a committee member of the whole department, and the list
  // opens on the first curriculum with no *ทุกหลักสูตร* to widen it to.
  await signInAsDepartmentCommittee(page);
  const opened = await openRubrics(page);
  expect(new URL(opened.url()).searchParams.get('program_id')).toBe('0501');
  await expect(programFilter(page)).toHaveValue('0501');
  expect(
    await programFilter(page).locator('option').evaluateAll(options => options.map(o => o.value)),
  ).toEqual(['0501', '0503']);
  await settled(table(page));
  await expect(rubricRow(page, SEEDED[0].code)).toHaveCount(1);
  await expect(rubricRow(page, RUBRICS_INTL[0].code)).toHaveCount(0);

  await filterTo(page, '0503');
  await settled(table(page));
  expect(await listedCodes(page)).toEqual(
    [...RUBRICS_INTL].sort((a, b) => a.order - b.order).map(entry => entry.code),
  );

  await filterTo(page, '0501');
  await settled(table(page));
  await expect(rubricRow(page, SEEDED[0].code)).toHaveCount(1);
  await expect(rubricRow(page, RUBRICS_INTL[0].code)).toHaveCount(0);
});

test('removal asks first, and answering no leaves the rubric where it was', async ({ page }) => {
  // The sixth criterion, in the half a browser can assert. What the dialog
  // *says* — that the criteria go too and that it cannot be undone — is a
  // hand-walked row.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  await startRemoval(page, MINE);
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
  await expect(rubricRow(page, MINE)).toBeVisible();

  await startRemoval(page, MINE);
  await confirmRemoval(page);
  await expect(rubricRow(page, MINE)).toHaveCount(0);
});

test('removing a rubric that has criteria says how many went with it', async ({ page }) => {
  // The one thing on this screen that cannot be undone. Nothing points at a
  // rubric except its own criteria and those CASCADE, so there is no
  // "switched off instead" branch to fall into — and a banner that said only
  // ลบแล้ว over three destroyed criteria would be telling half the truth.
  await signIn(page, ACCOUNTS.committee0501);
  await openRubrics(page);
  await settled(table(page));

  // The precondition read where it is used (#51), off the question rather than
  // off a column the list no longer draws (#276).
  await startRemoval(page, WITH_CRITERIA.code);
  expect(await saidBy(page)).toContain(`เกณฑ์การให้คะแนน ${WITH_CRITERIA.criteria} ข้อ`);
  await confirmRemoval(page);

  await expect(rubricRow(page, WITH_CRITERIA.code)).toHaveCount(0);
  await expect(
    page.getByText(new RegExp(`เกณฑ์การให้คะแนน ${WITH_CRITERIA.criteria} ข้อ`)),
  ).toBeVisible();
});

test('the accounts this screen is not for are refused it, not merely kept off its menu', async ({
  page,
}) => {
  // #79 for the faculty administrator - the faculty keeps the list of
  // หลักสูตร and what is inside one is decided below it - ADR-0002 for the
  // central administrator, and "marking against a rubric is not writing one"
  // for the ผู้สอน. The menu entry each of them lacks is a convenience; this is
  // the rule, and it holds for an account that typed the address. The
  // department administrator joined them on 14 พ.ย. 2569 by the owner's answer
  // to #276, at the server and not only in the menu (ADR-0002).
  for (const account of [
    ACCOUNTS.facultyAdmin,
    ACCOUNTS.systemAdmin,
    ACCOUNTS.teacherOne,
    ACCOUNTS.departmentAdmin05,
  ]) {
    await page.context().clearCookies();
    await signIn(page, account);

    const [answer] = await Promise.all([waitForList(page), page.goto(RUBRICS)]);
    expect(answer.status(), `${account} should be refused`).toBe(403);
    await expect(page.getByText(REFUSALS.forbidden)).toBeVisible();

    // The screen is this screen, drawn and empty, rather than a redirect
    // somewhere else that would satisfy the line above by never having asked.
    await expect(
      page.getByRole('heading', { name: 'ข้อมูล Rubric กลาง', exact: true }),
    ).toBeVisible();
    await expect(rubricRow(page, 'RUB-02')).toHaveCount(0);
  }
});

test('the department administrator has no menu entry for the screen, and finds it under a committee hat', async ({
  page,
}) => {
  // #276's two sentences as the person meets them: *ตัดหน้านี้ออกจาก
  // ผู้ดูแลภาควิชา* in the menu, and *ถ้า ผู้ดูแลภาควิชา เป็นกรรมการหลักสูตร ก็จะ
  // เห็นตอนเปลี่ยน role*. The same account both times, so what moves the entry
  // is the hat and not who signed in. The refusal at the server is the row
  // above; this is the convenience it backs.
  await signIn(page, ACCOUNTS.departmentAdmin05);
  await page.goto('/main/programs');
  await expect(menuLink(page, 'ข้อมูลหลักสูตร')).toHaveCount(1);
  await expect(menuLink(page, 'ข้อมูล Rubric กลาง')).toHaveCount(0);

  await page.context().clearCookies();
  await signInAsDepartmentCommittee(page);
  await openRubrics(page);
  await expect(menuLink(page, 'ข้อมูล Rubric กลาง')).toHaveCount(1);
});

/**
 * A gate in front of the requests a row names, opened by the row - the review
 * of 14 พ.ย. 2569 (#276). The request is continued rather than fulfilled, so
 * the answer is the server's own (#160).
 */
async function gateRequests(page, matches) {
  let open;
  const opened = new Promise(resolve => {
    open = resolve;
  });
  await page.route(
    url => matches(url),
    async route => {
      await opened;
      await route.continue();
    },
  );
  return open;
}

test('the add row is not offered while another curriculum is read, and starts from that one', async ({
  page,
}) => {
  // The review of 14 พ.ย. 2569 (#276): `next_order` is read off the list that
  // is drawn, so pressed while the next curriculum's list is out the add row
  // started from the curriculum before it.
  await signInAsDepartmentCommittee(page);
  const first = await openRubricsOn(page, '0501');
  await settled(table(page));
  const before = (await first.json()).next_order;
  const add = page.getByRole('button', { name: 'เพิ่ม Rubric', exact: true });
  await expect(add).toBeEnabled();

  const letGo = await gateRequests(
    page,
    url => url.pathname === API && url.searchParams.get('program_id') === '0503',
  );
  const answered = waitForList(page);
  await programFilter(page).selectOption('0503');
  // The claim: nothing to press while the list in front of the person is the
  // curriculum they have just left.
  await expect(add).toBeDisabled();

  letGo();
  const answer = await answered;
  const after = (await answer.json()).next_order;
  // Where the two agree no mutant could tell which list the row read (#154).
  expect(after, 'the two curricula start their next rubric from different places').not.toBe(before);
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.getByRole('spinbutton', { name: 'ลำดับ' })).toHaveValue(String(after));
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
});

test('an edit row drawn again while its save is out keeps its fields shut', async ({ page }) => {
  // The review of 14 พ.ย. 2569 (#276): the edit row is drawn inside the list,
  // and a curriculum switched away and back while its save is out draws it
  // anew. The flag that shuts its fields has to outlive that, which a flag the
  // row held itself did not.
  await signInAsDepartmentCommittee(page);
  await openRubricsOn(page, '0501');
  await settled(table(page));
  // Whatever the list draws first: the serial rows above take rubrics away (#129).
  const [subject] = await listedCodes(page);
  await openEditor(page, subject);
  const code = page.getByRole('textbox', { name: 'รหัส Rubric' });

  const letGo = await gateRequests(page, url => new RegExp(`^${API}/[0-9]+$`).test(url.pathname));
  const saved = page.waitForResponse(
    answer =>
      new RegExp(`^${API}/[0-9]+$`).test(new URL(answer.url()).pathname) &&
      answer.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'บันทึก' }).click();
  await expect(code).toBeDisabled();

  await filterTo(page, '0503');
  await settled(table(page));
  await expect(code).toHaveCount(0);
  await filterTo(page, '0501');
  await settled(table(page));
  await expect(rubricRow(page, subject)).toHaveCount(0);
  await expect(code).toHaveValue(subject);
  // The claim, on the row drawn anew.
  await expect(code).toBeDisabled();

  letGo();
  expect((await saved).status()).toBe(200);
  await expect(code).toHaveCount(0);
});

test('an add row kept open across a switch of curriculum keeps what was typed and takes the new curriculum\'s order', async ({
  page,
}) => {
  // The owner's answer ก to #276's third question (14 พ.ย. 2569). The add row
  // saves into the curriculum the list is showing, so the ลำดับ it started from
  // the curriculum before is a number about a list nobody is looking at.
  await signInAsDepartmentCommittee(page);
  const first = await openRubricsOn(page, '0501');
  await settled(table(page));
  const before = (await first.json()).next_order;
  await page.getByRole('button', { name: 'เพิ่ม Rubric', exact: true }).click();
  const code = page.getByRole('textbox', { name: 'รหัส Rubric' });
  const nameTh = page.getByRole('textbox', { name: 'ชื่อ Rubric (ภาษาไทย)' });
  const order = page.getByRole('spinbutton', { name: 'ลำดับ' });
  await code.fill('RUB-SWITCH');
  await nameTh.fill('ข้ามหลักสูตร');
  await expect(order).toHaveValue(String(before));

  const answered = waitForList(page);
  await programFilter(page).selectOption('0503');
  const after = (await (await answered).json()).next_order;
  // Where the two agree no mutant could tell which list the row read (#154).
  expect(after, 'the two curricula start their next rubric from different places').not.toBe(before);
  await settled(table(page));

  // The claim: the order is the new curriculum's ...
  await expect(order).toHaveValue(String(after));
  // ... and what the person typed is still there.
  await expect(code).toHaveValue('RUB-SWITCH');
  await expect(nameTh).toHaveValue('ข้ามหลักสูตร');
  await page.getByRole('button', { name: 'ยกเลิก' }).click();
});
