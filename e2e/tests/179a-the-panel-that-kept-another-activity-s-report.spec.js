'use strict';

const { test, expect } = require('@playwright/test');

const { createPool } = require('../../db/pool');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { E2E_SCHEMA } = require('../support/env');
const { hold } = require('../support/hold');
const { mySectionIds } = require('../support/enrolment-screen');
const { gate, isWrite } = require('../support/gate');
const {
  csv,
  chooseFile,
  uploading,
  importedLine,
  chosenFile,
  reportTable,
  reportedLines,
} = require('../support/import-panel');
const {
  openScores,
  chooseActivity,
  setMode,
  setEntry,
  gridHeading,
} = require('../support/scores-screen');

/**
 * #179 — the panel that kept another กิจกรรม's report.
 *
 * `ImportPanel` holds its report in its own state, and the report is about the
 * กิจกรรม the file was sent for. On nine of the panel's ten screens that cannot
 * come apart: the target is a bare function or a closure over a `useParams`
 * value, so it cannot be re-aimed without the route changing. The tenth is this
 * screen, where the target is `activityId` — state, written by a `<select>`
 * beside the panel that is never disabled — and this screen's own `load` does
 * not clear `data`, so the panel is never unmounted while the picker moves.
 *
 * **A guard written for one caller is a claim about every caller** (#68, #133).
 * The guard this screen already had covers its own grid: `onImported` asks
 * `onScreen.current === activityId` before re-reading. It cannot reach inside the
 * panel, and what is inside the panel is the sentence *นำเข้าสำเร็จ N รายการ* and
 * the table of offending lines.
 *
 * ## Two mechanisms, measured as a grid rather than argued as a choice (#148)
 *
 * The ticket's sequence is a race: an import of A is answered while the picker is
 * on B. Measuring it found a second way in that needs no race at all — a report
 * that has already landed **stays on the screen** when the picker moves, because
 * nothing clears it. That one is not a window, it is permanent until a reload,
 * and it is the way in a person is most likely to meet.
 *
 * So the first four rows come in pairs, one pair per mechanism, and each pair is
 * read in both flavours the panel can draw: the green line of a file that was
 * accepted, and the red table of one that was refused. The fix is two things, and
 * the mutants in `mutation/179-the-report-of-another-activity.py` kill one pair
 * each: clearing what the panel remembers when the target changes, and refusing to
 * draw an answer that is no longer the answer to what the screen is asking.
 *
 * ## And the third claim, which is where the guard stops — item 5
 *
 * A refusal that carries no rows is not a report about anything on the screen. It
 * is about the person or the request, so the panel hands it to the screen, and the
 * screen says it in its banner whatever the picker has since been moved to. That
 * is #34's own decision for the save's banner, which speaks every time because it
 * reports the action and not the screen, and it is *an escalation that must always
 * happen does not go behind one that can refuse it* (#131). The guard therefore
 * sits around the drawing only, and the mutant for this row is the other
 * arrangement — the guard above the whole branch — made to run (#48).
 *
 * ## Why the negative reads here can fail
 *
 * Each of them is counted **once, at a settle point**, and the settle point is
 * the panel's own: the label on its button says *กำลังนำเข้า…* while the answer
 * is out, and a row that has seen that label go has waited for the panel's turn
 * at the answer (#50). The same locators are read **green** in the first row of
 * each pair, with the same file and the same screen, so a read that could never
 * find anything would be caught there rather than passing everywhere (#171).
 *
 * ## What is written, and what is not
 *
 * Nothing. The refused file is refused per row, which writes nothing by
 * construction (`34a` row 9 reads the same report), and the accepted one is
 * answered at the route by `gate`'s `success`, which stops the request before the
 * server sees it — the subject of these rows is what the panel draws, not what an
 * import stores, and #34's rows 8 and 9 already hold the storing. `hold` is the
 * net under that claim rather than a cleanup these rows need.
 */

let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());

const db = createPool({ schema: E2E_SCHEMA });
test.afterAll(() => db.end());

/** The กิจกรรม a file is imported for in every row here, and the one moved to. */
const IMPORTED_FOR = 'สอบกลางภาค';
const MOVED_TO = 'สอบปลายภาค';

/**
 * The header of a whole-Activity file, which is `34a` row 8's own spelling of
 * what the template carries in the ต่อกิจกรรม toggle.
 */
const HEADER = 'student_id,full_name_th,score';

/** What the server answers an accepted file with — `sendImport`'s success body. */
const ACCEPTED = { created: 3, marks: [], errors: [] };

/**
 * And a refusal that carries no rows, which `gate` sends as a 409 with this
 * sentence and nothing else. The panel hands those to the screen rather than
 * drawing them, so this is the one answer in this file whose destination is the
 * shell's banner.
 */
const REFUSAL = 'ไม่สามารถนำเข้าไฟล์นี้ได้ในขณะนี้';

let section;

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.teacherOne);
  if (section === undefined) [section] = await mySectionIds(page);
});

/** One กิจกรรม of this ตอนเรียน, by the name the seed gave it. */
async function activityNamed(name) {
  const { rows } = await db.query(
    'SELECT id FROM activities WHERE section_id = $1 AND activity_name = $2',
    [section, name],
  );
  expect(rows, `the seed's ${name}`).toHaveLength(1);
  return rows[0];
}

/** Everybody enrolled in this ตอนเรียน, in the order a file has to list them. */
async function roll() {
  const { rows } = await db.query(
    `SELECT sc.student_id, s.full_name_th FROM student_course sc
       JOIN student s ON s.student_id = sc.student_id
      WHERE sc.section_id = $1 ORDER BY sc.student_id ASC`,
    [section],
  );
  return rows;
}

/**
 * A file this ตอนเรียน agrees with, with one mark over the full mark on its
 * second row — so it passes every whole-file check, is refused per row, and
 * writes nothing. `34a` row 9's file, and its line 3.
 */
async function refusedFile() {
  const students = await roll();
  return {
    name: 'over.csv',
    text: csv(
      HEADER,
      ...students.map(
        (student, index) =>
          `${student.student_id},${student.full_name_th},${index === 1 ? 101 : 10}`,
      ),
    ),
  };
}

/** Opens the marks screen on the กิจกรรม a file is about to be sent for. */
async function openOn(page, activityId) {
  await openScores(page, section);
  await chooseActivity(page, section, activityId);
  await setEntry(page, 'student');
  await setMode(page, 'activity');
}

/** Where this screen's import posts, which the gate holds by. */
const importPath = (activityId) =>
  new RegExp(`^/api/teaching/sections/${section}/activities/${activityId}/scores/import$`);

/**
 * The panel's own say that an import is out, read **while the gate is holding
 * it** — the precondition that an import was begun at all, asserted where it is
 * used (#51). A settle point that was never reached is a wait that ends at once
 * and says nothing, and read after the answer this one would be that.
 */
const untilUploading = page => expect(uploading(page)).toBeVisible();

/**
 * And the panel's say that it has had its turn at the answer, which is the point
 * the counts below are read at rather than retried towards (#50).
 */
const untilAnswered = page => expect(uploading(page)).toHaveCount(0);

test('#179 item 1: a refused import keeps its report only while the กิจกรรม it is about is the one on screen', async ({
  page,
}) => {
  const imported = await activityNamed(IMPORTED_FOR);
  const movedTo = await activityNamed(MOVED_TO);
  const file = await refusedFile();

  await openOn(page, imported.id);
  const held = await gate(page, importPath(imported.id), isWrite);
  await chooseFile(page, file);
  await untilUploading(page);
  held.open();
  await held.answered;
  await untilAnswered(page);

  // The green read of both locators this file draws, which is what makes the
  // counts below measurements rather than two reads that can only pass.
  expect(await reportedLines(page), 'the line the file is wrong on').toEqual([3]);
  await expect(chosenFile(page, file.name)).toBeVisible();

  await chooseActivity(page, section, movedTo.id);
  await expect(gridHeading(page)).toHaveText(MOVED_TO);

  expect(await reportTable(page).count(), 'the report of the กิจกรรม that was left').toBe(0);
  expect(await chosenFile(page, file.name).count(), 'the name of its file').toBe(0);
});

test('#179 item 2: a refusal that lands after the picker moved is not drawn at all', async ({
  page,
}) => {
  const imported = await activityNamed(IMPORTED_FOR);
  const movedTo = await activityNamed(MOVED_TO);
  const file = await refusedFile();

  await openOn(page, imported.id);
  const held = await gate(page, importPath(imported.id), isWrite);
  await chooseFile(page, file);
  await held.sent;
  await untilUploading(page);

  // The picker is not disabled while an import is out, which is the whole of
  // how this situation is reached - `ActivityScores.js` lines 384-395.
  await chooseActivity(page, section, movedTo.id);
  await expect(gridHeading(page)).toHaveText(MOVED_TO);

  held.open();
  await held.answered;
  await untilAnswered(page);

  expect(await reportTable(page).count(), 'the report of the answer that was late').toBe(0);
});

test('#179 item 3: an accepted import keeps its line only while its own กิจกรรม is on screen', async ({
  page,
}) => {
  const imported = await activityNamed(IMPORTED_FOR);
  const movedTo = await activityNamed(MOVED_TO);
  const file = { name: 'marks.csv', text: csv(HEADER, '66010001,ไม่ถึงเซิร์ฟเวอร์,10') };

  await openOn(page, imported.id);
  const held = await gate(page, importPath(imported.id), isWrite, { success: ACCEPTED });
  await chooseFile(page, file);
  await untilUploading(page);
  held.open();
  await held.answered;
  await untilAnswered(page);

  await expect(importedLine(page)).toHaveText(`นำเข้าสำเร็จ ${ACCEPTED.created} รายการ`);

  await chooseActivity(page, section, movedTo.id);
  await expect(gridHeading(page)).toHaveText(MOVED_TO);

  expect(await importedLine(page).count(), 'the line of the กิจกรรม that was left').toBe(0);
});

test('#179 item 4: a success that lands after the picker moved is not drawn either', async ({
  page,
}) => {
  const imported = await activityNamed(IMPORTED_FOR);
  const movedTo = await activityNamed(MOVED_TO);
  const file = { name: 'marks.csv', text: csv(HEADER, '66010001,ไม่ถึงเซิร์ฟเวอร์,10') };

  await openOn(page, imported.id);
  const held = await gate(page, importPath(imported.id), isWrite, { success: ACCEPTED });
  await chooseFile(page, file);
  await held.sent;
  await untilUploading(page);

  await chooseActivity(page, section, movedTo.id);
  await expect(gridHeading(page)).toHaveText(MOVED_TO);

  held.open();
  await held.answered;
  await untilAnswered(page);

  expect(await importedLine(page).count(), 'the line of the answer that was late').toBe(0);
});

test('#179 item 5: a refusal with no rows in it still reaches the shell after the picker moved', async ({
  page,
}) => {
  const imported = await activityNamed(IMPORTED_FOR);
  const movedTo = await activityNamed(MOVED_TO);
  const file = await refusedFile();

  await openOn(page, imported.id);
  const held = await gate(page, importPath(imported.id), isWrite, { refusal: REFUSAL });
  await chooseFile(page, file);
  await held.sent;
  await untilUploading(page);

  await chooseActivity(page, section, movedTo.id);
  await expect(gridHeading(page)).toHaveText(MOVED_TO);

  held.open();
  await held.answered;
  await untilAnswered(page);

  // The shell speaks. This refusal carries no rows, so it is not a report about
  // the กิจกรรม the file was sent for; it is about the person and the request —
  // an expired session, a role that may not import — and it has to be heard
  // wherever the picker has since been moved to (#131, and #34's own sheet for
  // the save's banner, which speaks every time for the same reason).
  // Counted once at the settle point above, before it is read: a retrying read
  // of something a mutant stops from existing dies at a timeout, which is what a
  // mutant that stopped the application would print too (#139, #50). By here the
  // panel has had its turn at the answer, so the banner is either drawn or it is
  // not.
  expect(await page.getByRole('alert').count(), "the shell's own banner").toBe(1);
  await expect(page.getByRole('alert')).toContainText(REFUSAL);
});
