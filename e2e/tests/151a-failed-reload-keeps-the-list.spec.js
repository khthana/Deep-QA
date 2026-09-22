'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { gate, isGet, isWrite } = require('../support/gate');
const { PDF_BYTES, attach, evidencePath } = require('../support/evidence-screen');
const improvement = require('../support/improvement-screen');
const { CARD_SCREENS, pencils, boxOf } = require('../support/card-screens');

/**
 * #151 — a reload that fails keeps the list it last drew, and the form open on it.
 *
 * Since #149 the seven ผู้สอน screens keep the list and the open form drawn
 * while a reload is out. A reload that *failed* still blanked them: each `load`
 * set `data` to `null` in its `catch`, and the list and the form are drawn
 * inside `{data && (`, so the form was unmounted and what was typed in it went.
 *
 * The answer (22 September 2569) is #149's carried one step further: **a failed
 * reload keeps what the screen last drew**, and its refusal is the banner above
 * it. A failed *first* load has nothing to keep and draws what it drew before —
 * `loading && !data` covers that, and each screen's own sheet has its row.
 *
 * ## How a reload is made to fail
 *
 * The write a save sends is answered by `gate` with a crafted 200, and the
 * reload that follows is answered with a crafted 409 carrying `REFUSED`, so
 * nothing here reaches the database through a save. The rows read once, after
 * the refused reload has reached the page and `SETTLE_MS` for its commit
 * (#50, #52); what stands behind that number is the sweep.
 *
 * ## Two rows per screen, because the ticket names two things
 *
 * *the list* and *the open form* (#66). The form row presses another pencil
 * while the save is out, so a form is open when the refusal lands; the list row
 * opens nothing, so the save closes its own form and the list is all there is.
 *
 * ## What this file writes
 *
 * Its situation only: two files on หลักฐานการประเมิน's shelf per row there,
 * attached by the rows (#129). `hold()` takes them out. แผนพัฒนาต่อเนื่อง's
 * rows write nothing: its save is the crafted 200 like every other.
 */

const db = createPool({ schema: E2E_SCHEMA });

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(async () => {
  await release();
  await db.end();
});

const SAVED = {};

/** The reload's refusal — worded so nothing on any of the screens says it. */
const REFUSED = 'การโหลดของแถว #151 ถูกปฏิเสธ';

/** What is typed into the form that must survive — worded so no record holds it. */
const TYPED = 'ข้อความที่พิมพ์ค้างไว้ของแถว #151';

const SETTLE_MS = 250;

const button = (scope, name) => scope.getByRole('button', { name, exact: true });

/**
 * Gates the save's write (a 200) and the reload after it (the refusal). The
 * list is on the write's route on six screens and on its own on one.
 */
async function saveThatReloadsIntoARefusal(page, api, list = api) {
  const write = await gate(page, api, isWrite, { success: SAVED });
  const reload = await gate(page, list, isGet, { refusal: REFUSED });
  return { write, reload };
}

/** Lets the write go, then the refused reload, and waits for the commit. */
async function refuseTheReload(page, { write, reload }) {
  write.open();
  await reload.sent;
  reload.open();
  await reload.answered;
  await page.waitForTimeout(SETTLE_MS);
}

/** The refusal is on the screen once — the claim the ticket's answer is shaped around. */
async function refusalShown(page) {
  expect(await page.getByText(REFUSED).count(), "the failed reload's refusal").toBe(1);
}

for (const screen of CARD_SCREENS) {
  test.describe(`${screen.name} (${screen.file})`, () => {
    test("what was typed into another card's form survives a reload that fails", async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(pencils(page).nth(1), 'a second card to press แก้ไข on').toBeVisible();

      await pencils(page).nth(0).click();
      const gates = await saveThatReloadsIntoARefusal(page, screen.api);
      await button(page, 'บันทึก').click();
      await gates.write.sent;

      await pencils(page).nth(1).click();
      await boxOf(page, screen.field).fill(TYPED);
      await refuseTheReload(page, gates);

      await refusalShown(page);
      expect(await boxOf(page, screen.field).isVisible(), "the second card's form").toBe(true);
      expect(await boxOf(page, screen.field).inputValue(), 'what was typed').toBe(TYPED);
    });

    test('a reload that fails keeps the list it last drew', async ({ page }) => {
      await signIn(page, ACCOUNTS.teacherOne);
      await screen.open(page);
      await expect(pencils(page).nth(0)).toBeVisible();
      const drawn = await pencils(page).count();

      await pencils(page).nth(0).click();
      const gates = await saveThatReloadsIntoARefusal(page, screen.api);
      await button(page, 'บันทึก').click();
      await refuseTheReload(page, gates);

      expect(await pencils(page).count(), 'the cards drawn before the reload').toBe(drawn);
    });
  });
}

test.describe('หลักฐานการประเมิน (ActivityEvidence.js)', () => {
  const EVIDENCE_WRITE = /^\/api\/teaching\/sections\/\d+\/evidence\/\d+$/;
  const EVIDENCE_LIST = /\/activities\/\d+\/evidence$/;
  const describedAs = (page) => page.getByLabel('คำอธิบาย', { exact: true });
  const pencilOf = (page, name) =>
    page.getByRole('button', { name: `แก้ไขหลักฐาน ${name}`, exact: true });

  async function files(page, tag) {
    const { rows } = await db.query(
      `SELECT a.id, a.section_id
         FROM activities a
         JOIN course_sections_teacher cst ON cst.section_id = a.section_id
         JOIN users u ON u.user_id = cst.user_id
        WHERE u.email = $1
        ORDER BY a.id ASC
        LIMIT 1`,
      [ACCOUNTS.teacherOne],
    );
    expect(rows, 'the seed should give teacher.one an Activity').toHaveLength(1);
    await page.goto(evidencePath(rows[0].section_id, rows[0].id));
    const names = ['หนึ่ง', 'สอง'].map((n) => `${n}-151-${tag}.pdf`);
    for (const name of names) {
      await attach(page, { bytes: PDF_BYTES, name, description: `แฟ้ม ${name}` });
      await expect(pencilOf(page, name)).toBeVisible();
    }
    return names;
  }

  test("what was typed into another file's form survives a reload that fails", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [first, second] = await files(page, 'ก');

    await pencilOf(page, first).click();
    const gates = await saveThatReloadsIntoARefusal(page, EVIDENCE_WRITE, EVIDENCE_LIST);
    await button(page, 'บันทึก').click();
    await gates.write.sent;

    await pencilOf(page, second).click();
    await describedAs(page).fill(TYPED);
    await refuseTheReload(page, gates);

    await refusalShown(page);
    expect(await describedAs(page).isVisible(), "the second file's form").toBe(true);
    expect(await describedAs(page).inputValue(), 'what was typed').toBe(TYPED);
  });

  test('a reload that fails keeps the list it last drew', async ({ page }) => {
    await signIn(page, ACCOUNTS.teacherOne);
    const [first, second] = await files(page, 'ข');

    await pencilOf(page, first).click();
    const gates = await saveThatReloadsIntoARefusal(page, EVIDENCE_WRITE, EVIDENCE_LIST);
    await button(page, 'บันทึก').click();
    await refuseTheReload(page, gates);

    expect(await pencilOf(page, first).count(), 'the first file, drawn before').toBe(1);
    expect(await pencilOf(page, second).count(), 'the second file, drawn before').toBe(1);
  });
});

test.describe('แผนพัฒนาต่อเนื่อง (ContinuousImprovement.js)', () => {
  const { LABELS } = improvement;
  const region = (page, type) => improvement.formSection(page, type);
  const editor = (page, type) => region(page, type).getByLabel(LABELS[type], { exact: true });
  const start = (page, type) => button(region(page, type), `เขียน${LABELS[type]}`);

  async function openThePlan(page) {
    await signIn(page, ACCOUNTS.teacherOne);
    const [sectionId] = await improvement.mySectionIds(page);
    await improvement.openPlan(page, sectionId);
  }

  test('what was typed into another section survives a reload that fails', async ({ page }) => {
    await openThePlan(page);
    await start(page, 'SUMMARY').click();
    await editor(page, 'SUMMARY').fill('ส่วนแรก ส่งไปแล้ว');
    const gates = await saveThatReloadsIntoARefusal(page, improvement.API);
    await button(region(page, 'SUMMARY'), 'บันทึก').click();
    await gates.write.sent;

    await start(page, 'REFLECTION').click();
    await editor(page, 'REFLECTION').fill(TYPED);
    await refuseTheReload(page, gates);

    await refusalShown(page);
    expect(await editor(page, 'REFLECTION').isVisible(), "the second section's editor").toBe(true);
    expect(await editor(page, 'REFLECTION').inputValue(), 'what was typed').toBe(TYPED);
  });

  test('a reload that fails keeps the plan it last drew', async ({ page }) => {
    await openThePlan(page);
    await start(page, 'SUMMARY').click();
    await editor(page, 'SUMMARY').fill('ส่วนแรก ส่งไปแล้ว');
    const gates = await saveThatReloadsIntoARefusal(page, improvement.API);
    await button(region(page, 'SUMMARY'), 'บันทึก').click();
    await refuseTheReload(page, gates);

    expect(await start(page, 'REFLECTION').count(), 'a section drawn before the reload').toBe(1);
  });
});
