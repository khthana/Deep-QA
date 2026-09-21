// @ts-check
const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { hold } = require('../support/hold');
const { PDF_BYTES, attach, evidencePath } = require('../support/evidence-screen');

/**
 * #147 — หลักฐานการประเมิน's form shows the file its pencil was pressed on.
 *
 * `EvidenceForm` seeded its type and description once, from the file it was
 * mounted for, and the page drew it with no `key`. A second pencil pressed while
 * the form was open handed it another file and changed nothing in the boxes: the
 * first file's values stood over the second file's name, and บันทึก wrote them
 * onto the second file.
 *
 * ## The choice, and the row that tells it from the other one
 *
 * The page now draws the form with a `key` per file (and `'new'` for แนบหลักฐาน),
 * so another file is another form. The five sibling forms follow their record
 * with an effect instead; on this form the two differ in one thing: the file
 * box is a DOM input that no state can empty, so an effect would clear `file`
 * and leave the chosen file's name drawn in the box while the save sent none.
 * *a file chosen for one file is not carried to another* is the row that says
 * so, and the only row the effect mutant fails.
 *
 * Both ways drop what was typed when another pencil is pressed — the siblings
 * already do — and *what was typed for one file does not go with the pencil to
 * another* pins that rather than leaving it to be discovered.
 *
 * ## Where a row reads
 *
 * Every read here is of a box that exists either way — the defect is its value,
 * not its presence — so a retrying `toHaveValue` is an assertion that can fail,
 * not a wait (#139). The file box has no retrying matcher for its files and is
 * read once, after the second form's description has arrived.
 *
 * ## What this file writes
 *
 * Its own files on the shelf of `teacher.one@`'s first Activity, one or two per
 * row and named after it (#129), and one real save. `hold()` takes them out.
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

/** Worded so no file on the shelf holds it. */
const TYPED = 'ข้อความที่พิมพ์ค้างไว้ของแถว #147';

const describedAs = (page) => page.getByLabel('คำอธิบาย', { exact: true });
// Not `exact`: the select sits inside its label, so its name carries the
// chosen option's text after the label's own (`attach` reads it the same way).
const typeOf = (page) => page.getByLabel('ประเภทหลักฐาน');
const fileBox = (page) => page.locator('form input[type="file"]');
const pencilOf = (page, name) =>
  page.getByRole('button', { name: `แก้ไขหลักฐาน ${name}`, exact: true });

/** The Activity `teacher.one@` can attach to. */
async function shelf() {
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
  return rows[0];
}

/**
 * Two files on the shelf that differ in both boxes — a row that gave them one
 * type could not tell the first file's type from the second's. Neither is the
 * first type the form offers (`brief`), or a form that seeded no type at all
 * would read as the right one.
 */
async function twoFiles(page, tag) {
  const activity = await shelf();
  await page.goto(evidencePath(activity.section_id, activity.id));
  const first = { name: `หนึ่ง-147-${tag}.pdf`, type: 'good', description: `แฟ้มแรก ${tag}` };
  const second = { name: `สอง-147-${tag}.pdf`, type: 'fair', description: `แฟ้มที่สอง ${tag}` };
  for (const file of [first, second]) {
    await attach(page, { bytes: PDF_BYTES, ...file });
    await expect(pencilOf(page, file.name)).toBeVisible();
  }
  return [first, second];
}

test("another file's pencil puts that file's type and description in the form", async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [first, second] = await twoFiles(page, 'ก');

  await pencilOf(page, first.name).click();
  await expect(describedAs(page)).toHaveValue(first.description);

  await pencilOf(page, second.name).click();
  await expect(describedAs(page), "the second file's description").toHaveValue(second.description);
  await expect(typeOf(page), "the second file's type").toHaveValue(second.type);
});

test('what was typed for one file does not go with the pencil to another', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [first, second] = await twoFiles(page, 'ข');

  await pencilOf(page, first.name).click();
  await describedAs(page).fill(TYPED);

  await pencilOf(page, second.name).click();
  await expect(describedAs(page), "the second file's description").toHaveValue(second.description);
});

test('a file chosen for one file is not carried to another', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [first, second] = await twoFiles(page, 'ค');

  await pencilOf(page, first.name).click();
  await fileBox(page).setInputFiles({
    name: 'แทนที่-147.pdf',
    mimeType: 'application/pdf',
    buffer: PDF_BYTES,
  });

  await pencilOf(page, second.name).click();
  // The settle point, not this row's claim: until the second file's
  // description is in the box, the box being read may still be the first form.
  await expect(describedAs(page), 'the second form, before its file box is read').toHaveValue(
    second.description,
  );
  expect(
    await fileBox(page).evaluate((input) => input.files.length),
    'a file in the box of the second form',
  ).toBe(0);
});

test("the attach form's draft does not go to the file a pencil opens", async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [first] = await twoFiles(page, 'ง');

  await page.getByRole('button', { name: 'แนบหลักฐาน', exact: true }).click();
  await typeOf(page).selectOption('poor');
  await describedAs(page).fill(TYPED);

  await pencilOf(page, first.name).click();
  await expect(describedAs(page), "the file's description").toHaveValue(first.description);
  await expect(typeOf(page), "the file's type").toHaveValue(first.type);
});

test('บันทึก after another pencil writes that file with its own values', async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [first, second] = await twoFiles(page, 'จ');

  await pencilOf(page, first.name).click();
  await expect(describedAs(page)).toHaveValue(first.description);
  await pencilOf(page, second.name).click();

  const saved = page.waitForResponse(
    (answer) =>
      /\/evidence\/\d+$/.test(new URL(answer.url()).pathname) &&
      answer.request().method() !== 'GET',
  );
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  expect((await saved).ok(), 'the save').toBe(true);

  const { rows } = await db.query(
    `SELECT file_name, evidence_type, description
       FROM activity_evidence
      WHERE file_name = ANY($1)
      ORDER BY file_name`,
    [[first.name, second.name]],
  );
  const byName = Object.fromEntries(rows.map((row) => [row.file_name, row]));
  expect(byName[second.name], 'the second file, as written').toMatchObject({
    evidence_type: second.type,
    description: second.description,
  });
  expect(byName[first.name], 'the first file, untouched').toMatchObject({
    evidence_type: first.type,
    description: first.description,
  });
});
