'use strict';

const { test, expect } = require('@playwright/test');

const { REFUSALS } = require('../../backend/auth/refusals');
const { ACTIVITIES } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { createPool } = require('../../db/pool');
const { E2E_SCHEMA } = require('../support/env');
const { signIn } = require('../support/auth');
const { mySectionIds } = require('../support/enrolment-screen');
const { csv, importCsv, reportedLines } = require('../support/import-panel');
const {
  openScores,
  chooseActivity,
  setMode,
  setEntry,
  wholeCell,
  cloCell,
  saveScores,
  columns,
  whoColumn,
} = require('../support/scores-screen');

/**
 * docs/acceptance/34-activity-marks.md — the half a browser can prove.
 *
 * The backend suite proves every ceiling, every import check and the upsert.
 * What is here is what is only true in front of the screen, and for #34 that
 * is mostly one thing said four ways: **the toggles are a way of typing, and
 * what is typed survives the round trip in the shape it was typed in.**
 *
 * A mark entered once for a whole Activity is stored as one row per outcome and
 * has to read back as the single number it was typed as; a mark entered for a
 * group is stored against each member and has to read back on the group's row.
 * Neither is visible at the HTTP surface as a person would experience it —
 * there, they are two different request bodies — and neither is visible in the
 * database, which holds the same shape in every case. The browser is where the
 * claim "what I typed is what is there" can actually be made.
 *
 * ## Every row cleans up after itself, through the schema
 *
 * The seed marks every student on every Activity, so these rows *correct*
 * marks rather than create them, and `afterEach` puts back what was there —
 * read before the row ran and written back through the pool, for 25a's reason:
 * teardown that goes through the screen shares a defect with the subject and
 * cannot be evidence about it.
 */

/** The seeded group Activity: 100 marks over two outcomes, and `activity_type` group. */
const PROJECT = ACTIVITIES.find((activity) => activity.type === 'group').name;

/** The seeded individual Activity used by the per-student rows. */
const MIDTERM = 'สอบกลางภาค';

const db = createPool({ schema: E2E_SCHEMA });

let section;
let marked;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
  marked = [];
});

/** What a row is about to change, kept so `afterEach` can put it back. */
async function remember(activityId, studentIds) {
  const { rows } = await db.query(
    `SELECT student_id, activity_id, clo_id, score FROM activity_scores
      WHERE activity_id = $1 AND student_id = ANY($2)`,
    [activityId, studentIds],
  );
  marked.push(...rows);
}

test.afterEach(async () => {
  for (const row of marked) {
    await db.query(
      `UPDATE activity_scores SET score = $1
        WHERE student_id = $2 AND activity_id = $3 AND clo_id = $4`,
      [row.score, row.student_id, row.activity_id, row.clo_id],
    );
  }
});

test.afterAll(async () => {
  await db.end();
});

/** One Activity of this ตอนเรียน, by the name the seed gave it. */
async function activityNamed(name) {
  const { rows } = await db.query(
    'SELECT id, score_number FROM activities WHERE section_id = $1 AND activity_name = $2',
    [section, name],
  );
  expect(rows).toHaveLength(1);
  return rows[0];
}

/** The outcome numbers one Activity is attributed to, in the screen's order. */
async function cloNumbersOf(activityId) {
  const { rows } = await db.query(
    `SELECT c.clo_number FROM activity_clo_mapping m
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE m.activity_id = $1 ORDER BY m.sequence_order ASC`,
    [activityId],
  );
  return rows.map((row) => row.clo_number);
}

/** What the database holds for one student on one Activity, added up. */
async function totalOf(activityId, studentId) {
  const { rows } = await db.query(
    `SELECT coalesce(sum(score), 0)::float AS total FROM activity_scores
      WHERE activity_id = $1 AND student_id = $2`,
    [activityId, studentId],
  );
  return Number(rows[0].total.toFixed(2));
}

/** Where the import posts, which `importCsv` matches the answer by. */
const importPath = (activityId) =>
  `/api/teaching/sections/${section}/activities/${activityId}/scores/import`;

/** Two groups of this ตอนเรียน that have members, and who is in each. */
async function twoGroups() {
  const { rows } = await db.query(
    `SELECT g.group_id, g.group_name,
            array_agg(m.student_id ORDER BY m.student_id) AS members
       FROM student_group g
       JOIN student_group_member m ON m.group_id = g.group_id
      WHERE g.section_id = $1
      GROUP BY g.group_id, g.group_name
     HAVING count(m.student_id) > 1
      ORDER BY g.group_name ASC, g.group_id ASC
      LIMIT 2`,
    [section],
  );
  expect(rows).toHaveLength(2);
  return rows;
}

/** The roll, lowest code first — the order the grid draws it in. */
async function roll() {
  const { rows } = await db.query(
    `SELECT sc.student_id, s.full_name_th FROM student_course sc
       JOIN student s ON s.student_id = sc.student_id
      WHERE sc.section_id = $1 ORDER BY sc.student_id ASC`,
    [section],
  );
  return rows;
}

test('row 1: the grid opens on an Activity with the roll in it and the marks already recorded', async ({
  page,
}) => {
  const response = await openScores(page, section);
  expect(response.status()).toBe(200);

  const midterm = await activityNamed(MIDTERM);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');

  const students = await roll();
  const first = students[0];
  await expect(page.getByText(first.full_name_th, { exact: true }).first()).toBeVisible();

  // The cell is filled from the record rather than blank: the seed marked
  // everybody, and a screen that opened empty would invite a teacher to save a
  // whole class of nulls over marks that were already there.
  await expect(wholeCell(page, first.student_id)).not.toHaveValue('');
});

test('row 2: the per-CLO toggle changes the columns to this Activity’s outcomes', async ({
  page,
}) => {
  await openScores(page, section);
  const midterm = await activityNamed(MIDTERM);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');

  await setMode(page, 'activity');
  const whole = await columns(page);
  expect(whole[whole.length - 1]).toContain('คะแนน');

  await setMode(page, 'clo');
  const perClo = await columns(page);
  const expected = await cloNumbersOf(midterm.id);
  // One column per outcome, named by the outcome — not three columns that
  // happen to be there. A grid whose columns were the Offering's CLOs rather
  // than this Activity's would let a teacher type into an outcome the
  // Activity does not assess.
  expect(perClo).toHaveLength(2 + expected.length);
  for (const [index, number] of expected.entries()) {
    expect(perClo[2 + index]).toContain(number);
  }
});

test('row 3: a mark typed once for the whole Activity reads back as the number that was typed', async ({
  page,
}) => {
  const midterm = await activityNamed(MIDTERM);
  const [student] = await roll();
  await remember(midterm.id, [student.student_id]);

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'activity');

  await wholeCell(page, student.student_id).fill('61');
  expect((await saveScores(page, section)).status()).toBe(200);

  // Stored as one row per outcome and read back as one number: the division
  // has to be exact, or a teacher who typed 61 is shown 60.99 on reload.
  expect(await totalOf(midterm.id, student.student_id)).toBe(61);
  await expect(wholeCell(page, student.student_id)).toHaveValue('61');

  // And once more with a mark the weights do not divide evenly. 12.5 over
  // 34/33/33 rounds to 4.25 + 4.13 + 4.13, which is 12.51 — a hundredth the
  // teacher never typed, and the reason the remainder is carried rather than
  // left to the rounding. Whole marks over these weights always divide
  // exactly, so a row that only ever typed one would not notice.
  await wholeCell(page, student.student_id).fill('12.5');
  expect((await saveScores(page, section)).status()).toBe(200);
  expect(await totalOf(midterm.id, student.student_id)).toBe(12.5);
  await expect(wholeCell(page, student.student_id)).toHaveValue('12.5');
});

test('row 4: a mark typed for a group is written to every member of it', async ({ page }) => {
  const project = await activityNamed(PROJECT);
  const { rows } = await db.query(
    `SELECT g.group_id, g.group_name,
            array_agg(m.student_id ORDER BY m.student_id) AS members
       FROM student_group g JOIN student_group_member m ON m.group_id = g.group_id
      WHERE g.section_id = $1 GROUP BY g.group_id, g.group_name
      ORDER BY g.group_name ASC LIMIT 1`,
    [section],
  );
  const group = rows[0];
  await remember(project.id, group.members);

  await openScores(page, section);
  await chooseActivity(page, section, project.id);
  await setEntry(page, 'group');
  await setMode(page, 'activity');

  await wholeCell(page, group.group_name).fill('84');
  expect((await saveScores(page, section)).status()).toBe(200);

  for (const member of group.members) {
    expect(await totalOf(project.id, member)).toBe(84);
  }
  // And the group's own row still reads 84, which is only true because every
  // member agrees. A screen that showed the first member's number would look
  // identical here and would lie the moment one member was corrected alone.
  await expect(wholeCell(page, group.group_name)).toHaveValue('84');
});

test('row 5: a mark above the Activity’s full mark is refused on the screen, and nothing is saved', async ({
  page,
}) => {
  const midterm = await activityNamed(MIDTERM);
  const students = await roll();
  const student = students[1];
  await remember(midterm.id, [student.student_id]);
  const before = await totalOf(midterm.id, student.student_id);

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'activity');

  await wholeCell(page, student.student_id).fill('101');
  expect((await saveScores(page, section)).status()).toBe(400);

  await expect(
    page.getByText(REFUSALS.markOverActivity(Number(midterm.score_number)), { exact: true }),
  ).toBeVisible();
  expect(await totalOf(midterm.id, student.student_id)).toBe(before);
});

test('row 6: a per-CLO mark above that outcome’s share is refused, and the sentence names the share', async ({
  page,
}) => {
  const midterm = await activityNamed(MIDTERM);
  const students = await roll();
  const student = students[2];
  await remember(midterm.id, [student.student_id]);
  const before = await totalOf(midterm.id, student.student_id);

  const { rows } = await db.query(
    `SELECT c.clo_number, m.score FROM activity_clo_mapping m
       JOIN subject_clo c ON c.clo_id = m.clo_id
      WHERE m.activity_id = $1 ORDER BY m.sequence_order ASC LIMIT 1`,
    [midterm.id],
  );
  const first = rows[0];

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'clo');

  await cloCell(page, student.student_id, first.clo_number).fill(String(Number(first.score) + 1));
  expect((await saveScores(page, section)).status()).toBe(400);

  await expect(
    page.getByText(REFUSALS.markOverClo(first.clo_number, Number(first.score)), { exact: true }),
  ).toBeVisible();
  expect(await totalOf(midterm.id, student.student_id)).toBe(before);
});

test('row 7: saving the same student twice corrects the mark rather than adding another', async ({
  page,
}) => {
  const midterm = await activityNamed(MIDTERM);
  const students = await roll();
  const student = students[3];
  await remember(midterm.id, [student.student_id]);

  const { rows: countBefore } = await db.query(
    'SELECT count(*)::int AS rows FROM activity_scores WHERE activity_id = $1',
    [midterm.id],
  );

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'activity');

  for (const typed of ['40', '12.5']) {
    await wholeCell(page, student.student_id).fill(typed);
    expect((await saveScores(page, section)).status()).toBe(200);
  }

  const { rows: countAfter } = await db.query(
    'SELECT count(*)::int AS rows FROM activity_scores WHERE activity_id = $1',
    [midterm.id],
  );
  expect(countAfter[0].rows).toBe(countBefore[0].rows);
  expect(await totalOf(midterm.id, student.student_id)).toBe(12.5);
});

test('row 8: a file that agrees with the ตอนเรียน records every mark, and one that does not is refused whole', async ({
  page,
}) => {
  const midterm = await activityNamed(MIDTERM);
  const students = await roll();
  await remember(
    midterm.id,
    students.map((student) => student.student_id),
  );

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'activity');

  const good = csv(
    'student_id,full_name_th,score',
    ...students.map((student) => `${student.student_id},${student.full_name_th},72`),
  );
  await importCsv(page, { name: 'marks.csv', text: good, path: importPath(midterm.id) });
  await expect(page.getByText(/นำเข้าสำเร็จ/)).toBeVisible();
  expect(await totalOf(midterm.id, students[0].student_id)).toBe(72);

  // One line short, and the whole file is refused by a sentence rather than by
  // a per-row report: a roll that is missing somebody is not a file with a bad
  // row in it, it is a file about a different class.
  const short = csv(
    'student_id,full_name_th,score',
    ...students.slice(0, -1).map((student) => `${student.student_id},${student.full_name_th},5`),
  );
  await importCsv(page, { name: 'short.csv', text: short, path: importPath(midterm.id) });

  // What was written is asked before what was said, and the order is load
  // bearing. Both halves of *refused whole* fail through the same code path,
  // so a mutant that lets a rejected file through dies at whichever of these
  // comes first — and only one of them is the claim that nothing was written.
  expect(await totalOf(midterm.id, students[0].student_id)).toBe(72);
  await expect(page.getByText(/จำนวนนักศึกษาในไฟล์ไม่ตรงกับตอนเรียนนี้/)).toBeVisible();
});

test('row 9: a file with a mark over the full mark reports the line it is on', async ({ page }) => {
  const midterm = await activityNamed(MIDTERM);
  const students = await roll();
  await remember(
    midterm.id,
    students.map((student) => student.student_id),
  );
  const before = await totalOf(midterm.id, students[0].student_id);

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'activity');

  const bad = csv(
    'student_id,full_name_th,score',
    ...students.map(
      (student, index) => `${student.student_id},${student.full_name_th},${index === 1 ? 101 : 10}`,
    ),
  );
  await importCsv(page, { name: 'over.csv', text: bad, path: importPath(midterm.id) });

  expect(await reportedLines(page)).toEqual([3]);
  expect(await totalOf(midterm.id, students[0].student_id)).toBe(before);
});

test('row 10: the ตอนเรียน of another account is refused rather than drawn', async ({ page }) => {
  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.teacherTwo);

  const [refused] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/teaching/sections/${section}/activities` &&
        response.request().method() === 'GET',
    ),
    page.goto(`/teacher/teacherDashboard/${section}/activityScores`),
  ]);

  expect(refused.status()).toBe(404);
  await expect(page.getByText(REFUSALS.sectionNotFound, { exact: true })).toBeVisible();
});

test('row 11: the group toggle stays where the teacher put it across a save', async ({ page }) => {
  const project = await activityNamed(PROJECT);
  const students = await roll();
  await remember(project.id, [students[0].student_id]);

  await openScores(page, section);
  await chooseActivity(page, section, project.id);

  // A group Activity, so the grid opens on รายกลุ่ม — the default the product
  // decision asks for, and the half of it that already worked.
  expect(await whoColumn(page)).toBe('กลุ่ม');

  await setEntry(page, 'student');
  await setMode(page, 'activity');
  expect(await whoColumn(page)).toBe('รหัสนักศึกษา');

  await wholeCell(page, students[0].student_id).fill('55');
  await saveScores(page, section);

  // And it is still รายคน afterwards. The other half of the same decision:
  // the default is a default, not a correction applied on every write. A grid
  // that changed shape under a teacher mid-marking would be reading the
  // Activity's type as an instruction about them.
  expect(await whoColumn(page)).toBe('รหัสนักศึกษา');
  await expect(wholeCell(page, students[0].student_id)).toHaveValue('55');
});

test('row 12: a group blank because its members disagree survives a save aimed elsewhere', async ({
  page,
}) => {
  const project = await activityNamed(PROJECT);
  const [split, other] = await twoGroups();
  await remember(project.id, [...split.members, ...other.members]);

  // The state #26 and a one-student correction both leave behind: a group
  // whose members no longer hold the same mark. The screen draws that cell
  // blank on purpose, and blank means ยังไม่ให้คะแนน.
  await db.query(
    'UPDATE activity_scores SET score = 5 WHERE activity_id = $1 AND student_id = ANY($2)',
    [project.id, split.members],
  );
  await db.query('UPDATE activity_scores SET score = 1 WHERE activity_id = $1 AND student_id = $2', [
    project.id,
    split.members[0],
  ]);
  const before = await Promise.all(split.members.map((one) => totalOf(project.id, one)));
  expect(before[0]).not.toBe(before[1]);

  await openScores(page, section);
  await chooseActivity(page, section, project.id);
  await setEntry(page, 'group');
  await setMode(page, 'activity');

  await expect(wholeCell(page, split.group_name)).toHaveValue('');

  // A mark for a different group, which is what the press is actually about.
  await wholeCell(page, other.group_name).fill('40');
  await saveScores(page, section);

  expect(await totalOf(project.id, other.members[0])).toBe(40);
  expect(await Promise.all(split.members.map((one) => totalOf(project.id, one)))).toEqual(before);
});

test('row 13: a student marked on only some outcomes shows no whole-Activity total', async ({
  page,
}) => {
  const midterm = await activityNamed(MIDTERM);
  const students = await roll();
  const who = students[0].student_id;
  const clos = await cloNumbersOf(midterm.id);
  await remember(midterm.id, [who]);

  // Half marked, which is where per-CLO entry leaves a student when a teacher
  // stops partway: the first outcome carries a mark and the rest carry none.
  await db.query(
    `UPDATE activity_scores SET score = NULL
      WHERE activity_id = $1 AND student_id = $2
        AND clo_id <> (SELECT clo_id FROM activity_clo_mapping
                        WHERE activity_id = $1 ORDER BY sequence_order ASC, id ASC LIMIT 1)`,
    [midterm.id, who],
  );

  await openScores(page, section);
  await chooseActivity(page, section, midterm.id);
  await setEntry(page, 'student');
  await setMode(page, 'activity');

  // Blank, not the sum of the marks that happen to be there. That sum is a
  // number nobody typed and is lower than the work that was marked; read as a
  // mark it understates the student, and saved back it divides itself across
  // the outcomes nobody has looked at yet.
  await expect(wholeCell(page, who)).toHaveValue('');

  // The marks are not missing, only the total. Per-CLO the first one is there
  // and the rest are the blanks that made the total impossible.
  await setMode(page, 'clo');
  await expect(cloCell(page, who, clos[0])).not.toHaveValue('');
  await expect(cloCell(page, who, clos[1])).toHaveValue('');
});
